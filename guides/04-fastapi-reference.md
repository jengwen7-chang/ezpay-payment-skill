# FastAPI 完整實作

## 模組相依

```bash
pip install pycryptodome requests fastapi uvicorn python-multipart aiosqlite
```

## ezpay.py（加密模組）

```python
import hashlib
import json
import time
from Crypto.Cipher import AES
from Crypto.Util.Padding import pad, unpad

MERCHANT_ID = "你的商店代號"
HASH_KEY = "你的HashKey（32字）"
HASH_IV = "你的HashIV（16字）"
API_URL = "https://cpayment.ezpay.com.tw"

def aes_encrypt(plaintext: str) -> str:
    """AES-256-CBC + PKCS7 (block size 32) + hex"""
    key_bytes = HASH_KEY.encode('utf-8')
    iv_bytes = HASH_IV.encode('utf-8')
    padded = pad(plaintext.encode('utf-8'), 32, style='pkcs7')
    cipher = AES.new(key_bytes, AES.MODE_CBC, iv_bytes)
    return cipher.encrypt(padded).hex()

def aes_decrypt(encrypted_hex: str) -> str:
    """AES-256-CBC 解密"""
    key_bytes = HASH_KEY.encode('utf-8')
    iv_bytes = HASH_IV.encode('utf-8')
    decipher = AES.new(key_bytes, AES.MODE_CBC, iv_bytes)
    decrypted = decipher.decrypt(bytes.fromhex(encrypted_hex))
    return unpad(decrypted, 32, style='pkcs7').decode('utf-8')

def sha256_encrypt(aes_hex_str: str) -> str:
    """SHA256(HashKey={key}&{aes_hex}&HashIV={iv})"""
    sha_str = f"HashKey={HASH_KEY}&{aes_hex_str}&HashIV={HASH_IV}"
    return hashlib.sha256(sha_str.encode('utf-8')).hexdigest().upper()

def create_order(params: dict) -> tuple:
    """建立 MPG 訂單，回傳 (trade_dict, TradeInfo, TradeSha)"""
    timestamp = str(int(time.time()))
    trade = {
        'TimeStamp': timestamp,
        'MerchantID': MERCHANT_ID,
        'Version': '1.0',
        'MerchantOrderNo': params['MerchantOrderNo'],
        'Amt': params['Amt'],
        'ItemDesc': params['ItemDesc'],
        'ReturnURL': params.get('ReturnURL', ''),
        'ClientBackURL': params.get('ClientBackURL', ''),
        'NotifyURL': params.get('NotifyURL', ''),
        'Email': params.get('Email', ''),
        'Phone': params.get('Phone', ''),
    }
    param_str = '&'.join([f"{k}={v}" for k, v in trade.items()])
    TradeInfo = aes_encrypt(param_str)
    TradeSha = sha256_encrypt(TradeInfo)
    return trade, TradeInfo, TradeSha

def decrypt_response(TradeInfo: str) -> dict:
    """解密 ezPay 回傳的 TradeInfo"""
    plain = aes_decrypt(TradeInfo)
    # ezPay 的回傳是 URL-encoded 的 key=value&... 格式
    from urllib.parse import parse_qs
    parsed = parse_qs(plain, strict_parsing=True)
    # 轉成一層 dict
    return {k: v[0] for k, v in parsed.items()}
```

## main.py

```python
import asyncio
from fastapi import FastAPI, Request, BackgroundTasks, Form
from fastapi.responses import PlainTextResponse, HTMLResponse, RedirectResponse
from fastapi import HTTPException
import aiosqlite

import ezpay

app = FastAPI(title="ezPay 簡單付")

DB_PATH = "payments.db"

# 初始化資料庫
async def init_db():
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute('''
            CREATE TABLE IF NOT EXISTS orders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                merchant_order_no TEXT UNIQUE NOT NULL,
                status TEXT DEFAULT 'PENDING',
                trade_no TEXT,
                amt INTEGER,
                paid_at DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        await db.commit()

@app.on_event("startup")
async def startup():
    await init_db()

# -----------------
# 建立訂單
# -----------------
@app.post("/checkout")
async def checkout(
    MerchantOrderNo: str = Form(...),
    Amt: int = Form(...),
    ItemDesc: str = Form(...),
    Email: str = Form(""),
    NotifyURL: str = Form(""),
    ReturnURL: str = Form("")
):
    trade, TradeInfo, TradeSha = ezpay.create_order({
        'MerchantOrderNo': MerchantOrderNo,
        'Amt': Amt,
        'ItemDesc': ItemDesc,
        'Email': Email,
        'NotifyURL': NotifyURL or f"{BASE_URL}/notify",
        'ReturnURL': ReturnURL or f"{BASE_URL}/return",
    })

    html = f'''
    <!DOCTYPE html>
    <html><body onload="document.f.submit()">
    <form name="f" action="{ezpay.API_URL}/MPG/mpg_gateway" method="POST">
    <input name="MerchantID" value="{ezpay.MERCHANT_ID}">
    <input name="Version" value="1.0">
    <input name="TimeStamp" value="{trade['TimeStamp']}">
    <input name="MerchantOrderNo" value="{MerchantOrderNo}">
    <input name="Amt" value="{Amt}">
    <input name="ItemDesc" value="{ItemDesc}">
    <input name="TradeInfo" value="{TradeInfo}">
    <input name="TradeSha" value="{TradeSha}">
    <button>前往付款</button>
    </form></body></html>'''
    return HTMLResponse(content=html)

# -----------------
# NotifyURL（Webhook）
# -----------------
@app.post("/notify")
async def payment_notify(request: Request, background: BackgroundTasks):
    form = await request.form()
    trade_info = form.get('TradeInfo', '')
    trade_sha = form.get('TradeSha', '')

    # 立刻回應 SUCCESS
    background.add_task(process_payment, trade_info, trade_sha)
    return PlainTextResponse('SUCCESS')

async def process_payment(trade_info: str, trade_sha: str):
    """Race-safe 處理：使用 BEGIN IMMEDIATE 鎖定"""
    if ezpay.sha256_encrypt(trade_info) != trade_sha:
        print("[FAIL] SHA256 驗證失敗")
        return

    result = ezpay.decrypt_response(trade_info)
    merchant_order_no = result.get('MerchantOrderNo', '')

    async with aiosqlite.connect(DB_PATH, timeout=5) as db:
        db.row_factory = aiosqlite.Row
        try:
            # BEGIN IMMEDIATE = 寫入鎖定
            await db.execute('BEGIN IMMEDIATE')
            cur = await db.execute(
                'SELECT status FROM orders WHERE merchant_order_no = ?',
                [merchant_order_no]
            )
            row = await cur.fetchone()

            if row and row['status'] == 'PAID':
                print(f"[冪等] {merchant_order_no} 已處理")
                await db.rollback()
                return

            # 更新或插入
            await db.execute('''
                INSERT OR REPLACE INTO orders (merchant_order_no, status, trade_no, amt, paid_at)
                VALUES (?, 'PAID', ?, ?, datetime('now'))
            ''', [merchant_order_no, result.get('TradeNo', ''), result.get('Amt', 0)])
            await db.commit()
            print(f"[成功] {merchant_order_no} 已更新")

        except Exception as e:
            await db.rollback()
            print(f"[錯誤] {e}")

# -----------------
# ReturnURL（消費者回傳頁面）
# -----------------
@app.get("/return")
async def payment_return(request: Request):
    # 真正的結果以 NotifyURL 為準，這裡只做引導
    return RedirectResponse(url="/order/complete")

# -----------------
# 查詢訂單
# -----------------
@app.post("/query")
async def query_trade(TradeNo: str = Form(""), MerchantOrderNo: str = Form("")):
    if not TradeNo and not MerchantOrderNo:
        raise HTTPException(400, "需要 TradeNo 或 MerchantOrderNo")

    timestamp = str(int(time.time()))
    query_data = {
        'MerchantOrderNo': MerchantOrderNo or f'Q{timestamp}',
        'TradeNo': TradeNo,
    }
    _, QueryInfo, QuerySha = ezpay.create_order({
        'MerchantOrderNo': MerchantOrderNo or f'Q{timestamp}',
        'Amt': 0,  # 查詢不看金額，隨便帶
        'ItemDesc': 'query',
        'NotifyURL': '',
        'ReturnURL': '',
    })

    import requests
    resp = requests.post(
        f"{ezpay.API_URL}/API/merchant_trade/query_trade_info",
        data={
            'MerchantID': ezpay.MERCHANT_ID,
            'Version': '1.0',
            'QueryInfo': QueryInfo,
            'QuerySha': QuerySha,
        }
    )
    return resp.json()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

## 環境變數

```env
EZPAY_MERCHANT_ID=你的商店代號
EZPAY_HASH_KEY=你的HashKey（32字）
EZPAY_HASH_IV=你的HashIV（16字）
EZPAY_PRODUCTION=false
BASE_URL=https://your-domain.com
```

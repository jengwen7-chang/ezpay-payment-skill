# ezPay 快速開始

## 申請帳號

1. 聯繫 ezPay 業務或至官網申請測試環境
2. 取得 **MerchantID**、**HashKey**、**HashIV**

## 測試環境參數

```
MerchantID = 你的測試商店代號
HashKey = 你的測試 HashKey（32 字元）
HashIV = 你的測試 HashIV（16 字元）
API_URL = https://cpayment.ezpay.com.tw
```

## 安裝依賴

```bash
# Python
pip install pycryptodome requests fastapi uvicorn python-multipart

# Node.js
npm install express body-parser crypto axios dotenv
```

## 最快 Hello World

### Python（Flask）

```python
from flask import Flask, request, render_template_string
import hashlib, time, json
from Crypto.Cipher import AES
from Crypto.Util.Padding import pad, unpad

app = Flask(__name__)

MERCHANT_ID = "你的商店代號"
HASH_KEY = "你的HashKey（32字）"
HASH_IV = "你的HashIV（16字）"
API_URL = "https://cpayment.ezpay.com.tw/MPG/mpg_gateway"

def aes_encrypt(text):
    key = HASH_KEY.encode()
    iv = HASH_IV.encode()
    cipher = AES.new(key, AES.MODE_CBC, iv)
    return cipher.encrypt(pad(text.encode(), 32, style='pkcs7')).hex()

def sha256_encrypt(aes_str):
    text = f"HashKey={HASH_KEY}&{aes_str}&HashIV={HASH_IV}"
    return hashlib.sha256(text.encode()).hexdigest().upper()

@app.route('/create-order', methods=['POST'])
def create_order():
    data = request.json
    trade = {
        'TimeStamp': str(int(time.time())),
        'MerchantID': MERCHANT_ID,
        'Version': '1.0',
        'MerchantOrderNo': data['order_no'],
        'Amt': data['amt'],
        'ItemDesc': data['item_desc'],
        'NotifyURL': 'https://your-domain.com/notify',
        'ReturnURL': 'https://your-domain.com/return',
        'Email': data.get('email', ''),
    }
    param_str = '&'.join([f"{k}={v}" for k,v in trade.items()])
    TradeInfo = aes_encrypt(param_str)
    TradeSha = sha256_encrypt(TradeInfo)
    # 回傳 form，讓前端自動 POST 到 ezPay
    return {
        'url': API_URL,
        'params': {
            'MerchantID': MERCHANT_ID,
            'Version': '1.0',
            'TimeStamp': trade['TimeStamp'],
            'MerchantOrderNo': trade['MerchantOrderNo'],
            'Amt': trade['Amt'],
            'ItemDesc': trade['ItemDesc'],
            'TradeInfo': TradeInfo,
            'TradeSha': TradeSha,
        }
    }

@app.route('/notify', methods=['POST'])
def notify():
    form = dict(request.form)
    trade_info = form.get('TradeInfo', [''])[0]
    trade_sha = form.get('TradeSha', [''])[0]
    # 驗證
    if sha256_encrypt(trade_info) != trade_sha:
        return 'FAIL'
    # 解密
    key = HASH_KEY.encode()
    iv = HASH_IV.encode()
    decipher = AES.new(key, AES.MODE_CBC, iv)
    plain = unpad(decipher.decrypt(bytes.fromhex(trade_info)), 32, style='pkcs7').decode()
    result = json.loads(plain)
    if result.get('Status') == 'SUCCESS':
        print(f"訂單 {result['MerchantOrderNo']} 付款成功")
    return 'SUCCESS'

if __name__ == '__main__':
    app.run(port=5000, debug=True)
```

### Node.js（Express）

```javascript
const express = require('express');
const crypto = require('crypto');
const app = express();
app.use(express.urlencoded({ extended: true }));

const MERCHANT_ID = "你的商店代號";
const HASH_KEY = "你的HashKey（32字）";
const HASH_IV = "你的HashIV（16字）";
const API_URL = "https://cpayment.ezpay.com.tw/MPG/mpg_gateway";

function aesEncrypt(text) {
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(HASH_KEY), Buffer.from(HASH_IV));
    const blockSize = 32;
    const padding = blockSize - (Buffer.byteLength(text) % blockSize);
    const padded = Buffer.concat([Buffer.from(text), Buffer.alloc(padding, padding)]);
    return Buffer.concat([cipher.update(padded), cipher.final()]).toString('hex');
}

function sha256Encrypt(aesStr) {
    return crypto.createHash('sha256')
        .update(`HashKey=${HASH_KEY}&${aesStr}&HashIV=${HASH_IV}`)
        .digest('hex').toUpperCase();
}

app.post('/create-order', (req, res) => {
    const { order_no, amt, item_desc } = req.body;
    const trade = {
        TimeStamp: Math.floor(Date.now() / 1000).toString(),
        MerchantID: MERCHANT_ID,
        Version: '1.0',
        MerchantOrderNo: order_no,
        Amt: amt,
        ItemDesc: item_desc,
        NotifyURL: 'https://your-domain.com/notify',
        ReturnURL: 'https://your-domain.com/return',
    };
    const paramStr = Object.entries(trade).map(([k,v]) => `${k}=${v}`).join('&');
    const TradeInfo = aesEncrypt(paramStr);
    const TradeSha = sha256Encrypt(TradeInfo);
    res.json({ url: API_URL, params: { MerchantID: MERCHANT_ID, Version: '1.0', TimeStamp: trade.TimeStamp, MerchantOrderNo: order_no, Amt: amt, ItemDesc: item_desc, TradeInfo, TradeSha } });
});

app.post('/notify', (req, res) => {
    const { TradeInfo, TradeSha } = req.body;
    if (sha256Encrypt(TradeInfo) !== TradeSha) return res.send('FAIL');
    // 解密並處理...
    res.send('SUCCESS');
});

app.listen(5000);
```

## 讓伺服器公開可存取

測試時需要公開 URL 接收 ezPay 的 webhook：

```bash
ngrok http 5000
# 複製 Forwarding 的 HTTPS URL
```

## 測試卡號

```
卡號：4000-2211-1111-1111（前六嗎 4000-22）
CVV：任意 3 碼
有效期限：任意未來月份
```

## 下一步

- [ ] 看完 [01-encryption-deepdive.md](01-encryption-deepdive.md) — 確認加密完全理解
- [ ] 看 [05-webhook-idempotency.md](05-webhook-idempotency.md) — **上線前必讀**
- [ ] 看 [06-test-dashboard.md](06-test-dashboard.md) — 完整測試流程

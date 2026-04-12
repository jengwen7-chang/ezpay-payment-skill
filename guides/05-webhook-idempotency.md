# Webhook 冪等性（Idempotency）

> ⚠️ **上線前必讀！** ezPay 可能對同一筆訂單發送多次 webhook（網路問題、ezPay 重試機制）。如果沒有防重送機制，同一筆訂單會被處理兩次。

## 問題場景

```
1. 用戶完成付款
2. ezPay POST NotifyURL → 網路不穩 → 超時
3. ezPay 重送 NotifyURL → 商戶伺服器收到兩次
4. 商戶沒有防重複機制 → 訂單狀態更新兩次 → 資料錯亂
```

## 解決方案

### 核心原則

**收到 NotifyURL → 馬上回 `SUCCESS` → 再處理業務邏輯**

```python
@app.post('/notify')
async def payment_notify(request: Request, background: BackgroundTasks):
    form = await request.form()
    # 1. 立刻回應，避免 ezPay 重送
    background.add_task(process_payment, dict(form))
    return PlainTextResponse('SUCCESS')
```

### Race-safe 實作（生產環境必用）

#### SQLite（Python / FastAPI）

```python
from fastapi import BackgroundTasks
import sqlite3, asyncio

DB_PATH = 'payments.db'

def get_db():
    conn = sqlite3.connect(DB_PATH, timeout=5)
    conn.row_factory = sqlite3.Row
    return conn

@app.post('/notify')
async def payment_notify(request: Request, background: BackgroundTasks):
    form = await request.form()
    trade_info = form.get('TradeInfo', '')
    trade_sha = form.get('TradeSha', '')

    # 驗證
    if sha256_encrypt(trade_info) != trade_sha:
        return PlainTextResponse('FAIL')

    # 解密
    result = aes_decrypt(trade_info, HASH_KEY, HASH_IV)
    data = json.loads(result)
    merchant_order_no = data.get('MerchantOrderNo', '')

    # 馬上回應
    background.add_task(process_payment_safe, merchant_order_no, data)
    return PlainTextResponse('SUCCESS')

async def process_payment_safe(merchant_order_no: str, data: dict):
    """Race-safe：使用 SQLite 的 WAL 模式 + 檢查"""
    conn = get_db()
    cursor = conn.cursor()

    try:
        # BEGIN IMMEDIATE = 取得寫鎖，防止 race condition
        cursor.execute('BEGIN IMMEDIATE')

        # 檢查是否已處理（state = SUCCESS 表示已成功處理）
        cursor.execute(
            "SELECT status FROM orders WHERE merchant_order_no = ?",
            [merchant_order_no]
        )
        row = cursor.fetchone()

        if row:
            if row['status'] == 'PAID':
                print(f"[冪等] 訂單 {merchant_order_no} 已處理，跳過")
                conn.rollback()
                return
            elif row['status'] == 'PROCESSING':
                # 另一個執行緒正在處理
                print(f"[冪等] 訂單 {merchant_order_no} 正在處理中")
                conn.rollback()
                return

        # 標記為處理中
        cursor.execute(
            "INSERT OR IGNORE INTO orders (merchant_order_no, status) VALUES (?, 'PROCESSING')",
            [merchant_order_no]
        )
        cursor.execute(
            "UPDATE orders SET status='PAID', trade_no=? WHERE merchant_order_no=?",
            [data.get('TradeNo', ''), merchant_order_no]
        )
        conn.commit()
        print(f"[成功] 訂單 {merchant_order_no} 已更新為 PAID")

    except Exception as e:
        conn.rollback()
        print(f"[錯誤] {e}")
    finally:
        conn.close()
```

#### MySQL / PostgreSQL（推薦用於生產環境）

```sql
-- 訂單表
CREATE TABLE orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    merchant_order_no VARCHAR(40) UNIQUE NOT NULL,
    status ENUM('PENDING','PROCESSING','PAID','FAILED') DEFAULT 'PENDING',
    trade_no VARCHAR(30),
    amt INT,
    paid_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

```python
# MySQL + aiomysql（asyncio 版本）
async def process_payment_safe(merchant_order_no: str, data: dict, pool):
    async with pool.acquire() as conn:
        async with conn.cursor() as cursor:
            try:
                # SELECT ... FOR UPDATE = 鎖定該列，防止 race condition
                await cursor.execute(
                    "SELECT status FROM orders WHERE merchant_order_no = %s FOR UPDATE",
                    [merchant_order_no]
                )
                row = await cursor.fetchone()

                if row and row[0] == 'PAID':
                    return  # 已處理

                if row and row[0] == 'PROCESSING':
                    return  # 另一個執行緒正在處理

                # 更新狀態
                await cursor.execute(
                    "UPDATE orders SET status='PAID', trade_no=%s WHERE merchant_order_no=%s",
                    [data.get('TradeNo', ''), merchant_order_no]
                )
                await conn.commit()

            except Exception as e:
                await conn.rollback()
                print(f"[錯誤] {e}")
```

---

## 狀態機

```
┌──────────┐  POST notify   ┌─────────────┐  更新成功   ┌───────┐
│  收到    │ ──────────────→│  PROCESSING │ ──────────→│ PAID  │
│  webhook │                │  (鎖定中)    │            │ (完成) │
└──────────┘                └─────────────┘             └───────┘
                                   │
                                   │ 已有 PROCESSING/PAID
                                   ↓
                              ┌──────────┐
                              │  跳過    │
                              └──────────┘
```

---

## 預期回應格式

ezPay 的 NotifyURL **只接受純文字**回應，不是 JSON：

| 回應 | 意義 |
|------|------|
| `SUCCESS` | 已收到，正常處理 |
| `FAIL` | 處理失敗，ezPay 會重送 |

```python
# ✅ 正確
return PlainTextResponse('SUCCESS')

# ❌ 錯誤
return {"status": "ok"}  # ezPay 不認這種格式
return JSONResponse({"status": "SUCCESS"})  # ezPay 不認 JSON
```

---

## 驗證清單

- [ ] NotifyURL 收到 POST 後馬上回 `SUCCESS`（先回應再處理）
- [ ] 使用 `SELECT ... FOR UPDATE` 或 `BEGIN IMMEDIATE` 防止 race condition
- [ ] 檢查 `status == 'PAID'` 才跳過，避免重複處理
- [ ] 預期失敗時（Status != SUCCESS）也要回 `SUCCESS`（否則 ezPay 會一直重送）
- [ ] 所有例外都 rollback 並記錄 log
- [ ] 定期檢查 `orders` 表中 `status == 'PROCESSING'` 超過 N 分鐘的記錄（可能是處理到一半掛掉的）

# 退款安全機制

> 基於官方文件：API_Cross_Trans_refund_ezPay_1.0.3  
> ⚠️ ezPay 跨境退款（Version = 2.1）只能退 **120 天內** 的交易。

## 退款限制（官方文件）

| 規則 | 說明 |
|------|------|
| 可退款時間 | 交易當日起算 **120 天內** |
| 退款次數 | 不限 |
| 退款金額 | ≤ 原交易金額 |
| 清算時段 | 每周日 23:50 至周一 00:05 暫停 |
| 退款一經發動 | 無法取消 |

---

## 退款前必做的四件事

### 1. 身份驗證

```python
# ❌ 絕對不能：一般使用者可以直接發起退款
# ✅ 正確：只有管理員可以操作退款

@app.post('/admin/refund')
async def admin_refund(request: Request, current_user: User = Depends(get_admin_user)):
    # 只有 ADMIN 角色可以進來
    ...
```

### 2. 金額二次確認

```python
# 退款前再次確認金額，防止按錯
if refund_amt > order['amt']:
    raise HTTPException(400, "退款金額不得超過原交易金額")
```

### 3. 隔離操作 Log

```sql
CREATE TABLE refund_log (
    id SERIAL PRIMARY KEY,
    merchant_order_no VARCHAR(40) NOT NULL,
    refund_amt INTEGER NOT NULL,
    operator VARCHAR(100) NOT NULL,
    reason TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    result TEXT
);
```

### 4. 發動前業務核對

| 檢核項目 | 說明 |
|---------|------|
| 訂單狀態 = PAID | 未付款當然不能退 |
| paid_at >= 120天內 | 超出期限不可退 |
| 未退餘額 >= 退款金額 | 防止超退 |
| 操作者身份驗證 | 管理員才能退 |

---

## RefundInfo 參數（Version = 2.1）

| 參數 | 必填 | 說明 |
|------|------|------|
| TimeStamp | ✅ | Unix 時間戳（秒）|
| MerchantID | ✅ | 商店代號 |
| Version | ✅ | 請帶 `2.1` |
| TradeNo | ✅* | ezPay 交易序號（與 MerchantOrderNo 二選一）|
| MerchantOrderNo | ✅* | 商店訂單編號（與 TradeNo 二選一）|
| RefundAmt | ✅ | 退款金額（整數）|
| RefundType | ✅ | 請帶 `1`（退款）|
| Currency | ✅ | 請帶 `TWD` |

---

## 實作（FastAPI）

```python
from fastapi import BackgroundTasks

@app.post("/admin/refund")
async def refund_order(
    TradeNo: str = Form(""),
    MerchantOrderNo: str = Form(""),
    RefundAmt: int = Form(...),
    operator: str = Form(...),
    reason: str = Form(""),
):
    if not TradeNo and not MerchantOrderNo:
        raise HTTPException(400, "需要 TradeNo 或 MerchantOrderNo")

    # 1. 發動前檢核
    order = await db.query('SELECT * FROM orders WHERE merchant_order_no = ?', [MerchantOrderNo])
    if not order:
        raise HTTPException(404, "查無此訂單")
    if order['status'] != 'PAID':
        raise HTTPException(400, "訂單非已付款狀態")
    if order['paid_at'] < datetime.now() - timedelta(days=120):
        raise HTTPException(400, "超過 120 天可退款期限")

    # 2. 隔離 log
    await db.execute(
        'INSERT INTO refund_log (merchant_order_no, refund_amt, operator, reason) VALUES (?, ?, ?, ?)',
        [MerchantOrderNo, RefundAmt, operator, reason]
    )

    # 3. 發動退款
    timestamp = str(int(time.time()))
    refund_data = {
        'TimeStamp': timestamp,
        'MerchantID': MERCHANT_ID,
        'Version': '2.1',
        'TradeNo': TradeNo or '',
        'MerchantOrderNo': MerchantOrderNo,
        'RefundAmt': RefundAmt,
        'RefundType': '1',
        'Currency': 'TWD',
    }
    param_str = '&'.join([f"{k}={v}" for k, v in refund_data.items()])
    RefundInfo = aes_encrypt(param_str)
    RefundSha = sha256_encrypt(RefundInfo)

    import requests
    resp = requests.post(
        f"{API_URL}/API/merchant_trade/trade_refund",
        data={
            'MerchantID': MERCHANT_ID,
            'Version': '2.1',
            'RefundInfo': RefundInfo,
            'RefundSha': RefundSha,
        }
    )
    result = resp.json()

    # 4. 更新 log 結果
    await db.execute(
        'UPDATE refund_log SET result=? WHERE merchant_order_no=? AND created_at=?',
        [str(result), MerchantOrderNo, datetime.now()]
    )
    return result
```

---

## 哪些情況不該自動退

| 情境 | 建議 |
|------|------|
| 付款失敗 | 不需退，因為本來就沒扣到錢 |
| CVS/ATM 未取號 | 不需退，訂單自動失效 |
| 銀行拒絕 | 不需退，金額根本沒流動 |
| 消費者要求退貨 | **需要人工審核後再退** |

---

## 核心原則

> **只有被明確要求時才退。不主動發動退款。**

# 測試指南

## Step 1：本地加密測試

先在本地確認加密輸出正確：

```python
# 測試加密
plaintext = "TimeStamp=1700000000&MerchantID=MS3238228&Version=1.0&MerchantOrderNo=TEST001&Amt=1000&ItemDesc=test"
aes_hex = aes_encrypt(plaintext, HASH_KEY, HASH_IV)
sha = sha256_encrypt(aes_hex, HASH_KEY, HASH_IV)
print(f"AES: {aes_hex[:32]}...")
print(f"SHA: {sha}")
```

## Step 2：啟動 ngrok

```bash
ngrok http 5000
# 複製 https://xxxx.ngrok.io
```

## Step 3：建立訂單

```bash
curl -X POST https://xxxx.ngrok.io/create-order \
  -H "Content-Type: application/json" \
  -d '{"order_no":"TEST001","amt":1000,"item_desc":"測試商品","email":"test@example.com"}'
```

## Step 4：填寫信用卡

使用測試卡號：
- **卡號**：`4000-2211-1111-1111`（前六碼 `4000-22`）
- **CVV**：任意 3 碼（如 `222`）
- **有效期限**：任意未來月份（如 `12/28`）

## Step 5：確認 webhook 收到

```bash
# 終端機應看到：
# [成功] 訂單 TEST001 已更新為 PAID
```

## Step 6：查詢訂單

```python
result = ezpay.query_trade(merchant_order_no='TEST001')
print(result)
# 預期：PaymentStatus = 1（付款成功）
```

## 測試情境

| 情境 | 方式 |
|------|------|
| 信用卡成功 | 卡號 `4000-2211-1111-1111` |
| 信用卡失敗 | 卡號 `4000-2222-2222-2222` |
| ALIPAY 成功 | 測試環境直接模擬成功 |
| WECHAT 成功 | 測試環境模擬 QR code，30 秒後自動完成 |
| VACC / CVS | 取得繳費帳號/代碼後，不去繳費（超時自動取消）|

## 常見錯誤

| 錯誤訊息 | 原因 |
|---------|------|
| `MPG03001 訂單資訊解密失敗` | AES 加密格式錯誤 |
| `MPG02005 驗證資料錯誤` | SHA256 簽章錯誤 |
| `MPG02002 查無商店金流服務` | MerchantID 或 HashKey 設定錯誤 |
| webhook 沒收到 | NotifyURL 不 publicly accessible，需用 ngrok |

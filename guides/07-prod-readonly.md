# 正式環境探針

> 部署前確認這四個檢查點，確保正式環境金流正常。

## 探針 1：商戶帳號狀態

```python
# 登入 ezPay 商家管理後台，確認：
# ✅ MerchantID / HashKey / HashIV 與網站設定一致
# ✅ 已開通 MPG 金流服務
# ✅ 金流服務狀態為「啟用」
```

## 探針 2：Query API 讀取

```python
import requests

resp = requests.post(
    'https://payment.ezpay.com.tw/API/merchant_trade/query_trade_info',
    data={
        'MerchantID': MERCHANT_ID,
        'Version': '1.0',
        'QueryInfo': QueryInfo,   # 加密後
        'QuerySha': QuerySha,
    }
)
result = resp.json()
print(result)
# ✅ 預期：能正確解密回傳 JSON
# ❌ 若 Status != SUCCESS，確認 MerchantID / HashKey / HashIV 是否為正式環境
```

## 探針 3：NotifyURL 可達性

```bash
# 確認 NotifyURL 公開可訪問
curl -X POST https://your-domain.com/notify \
  -d "MerchantID=test&TradeInfo=test&TradeSha=test" \
  -w "\nHTTP: %{http_code}\n"
# ✅ 預期：HTTP 200 + 回傳 SUCCESS 或 FAIL
```

## 探針 4：HashKey / HashIV 不是測試機

```
測試環境（❌ 不能用在正式）：
  HashKey = 529D00B2F60F4A829CB0000000000000
  HashIV  = vZ6R0l5GqYfi5K8x

正式環境（✅）：
  向 ezPay 申請取得的正式金鑰（長度相同，但字元不同）
```

## 部署前檢核表

- [ ] HashKey / HashIV 已換成正式環境
- [ ] API_URL 已從 `cpayment.ezpay.com.tw` 換成 `payment.ezpay.com.tw`
- [ ] NotifyURL 使用 HTTPS（ezPay 要求）
- [ ] Query API 能正確取得訂單資料
- [ ] 信用卡號從測試卡號換成無法隨便輸入

# /ezpay-invoice — ezPay 電子發票串接入口

> 用途：協助 AI 正確產出 ezPay 電子發票 API 串接程式碼（加密、欄位、回應解析）。

## API 決策樹

| 需求 | 對應 API | Guide |
|------|---------|-------|
| 開立 B2C/B2B 發票（即時/預約）| `/Api/invoice_issue` | `guides/02-invoice-api.md` |
| 觸發 `Status=0`/`3` 提前開立 | `/Api/invoice_touch_issue` | 同上（共用加密）|
| 作廢已開立發票 | `/Api/invoice_invalid` | `guides/02a-void-invoice-api.md` |
| 折讓（退補貨）| `/Api/allowance_issue` | `guides/02b-allowance-api.md` |
| 確認/取消未確認折讓 | `/Api/allowance_touch_issue` | 同上 |
| 作廢已確認折讓 | `/Api/allowanceInvalid` | 同上 |
| 查詢發票狀態 | `/Api/invoice_search` | `guides/02c-invoice-search-api.md` |
| 新增發票字軌 | `/Api_number_management/createNumber` | 同上 |
| 驗證手機條碼 | `/Api_inv_application/checkBarCode` | `guides/02d-barcode-lovecode-api.md` |
| 驗證捐贈碼 | `/Api_inv_application/checkLoveCode` | 同上 |

## 使用方式

直接說需求，例如：
- 「開立 B2C 發票，金額 1050，含稅，買受人王小明，載具 /ABC1234」
- 「作廢發票 DS12223139，原因：重複開立」
- 「查詢發票狀態，訂單編號 INV20260507001」

## 重要規則（強制）

### 加密（AES-256-CBC，block size = 32）

```python
# Python 加密
blockSize = 32
padLen = blockSize - (len(queryString) % blockSize)
padded = queryString + chr(padLen) * padLen
cipher = AES.new(hash_key, AES.MODE_CBC, hash_iv)
encrypted = cipher.encrypt(padded.encode())  # 不內建 PKCS7
hexOutput = encrypted.hex()  # 小寫 Hex，不是 Base64
```

```javascript
// Node.js 加密
const blockSize = 32
const padLen = blockSize - (Buffer.byteLength(text) % blockSize)
const padded = Buffer.concat([Buffer.from(text), Buffer.alloc(padLen, padLen)])
const cipher = crypto.createCipheriv('aes-256-cbc', hashKey, hashIV)
cipher.setAutoPadding(false)
const encrypted = Buffer.concat([cipher.update(padded), cipher.final()])
const hexOutput = encrypted.toString('hex')  // 小寫
```

### 欄位命名
- 最外層：`MerchantID_` / `PostData_`（注意底線）
- 作廢折讓端點：`/Api/allowanceInvalid`（camelCase，唯一例外）
- 新增字軌最外層：`CompanyID_`（不是 `MerchantID_`）

### 前置確認（產出前必做）
1. HashKey 是 **32 碼**，HashIV 是 **16 碼**（**不是 16/16**）
2. 串接目標是測試 (`cinv.`) 還是正式 (`inv.`)？
3. 發票字軌是否已建立？（測試/正式均需）
4. B2B 發票必填 `BuyerUBN`（8 碼）、`PrintFlag=Y`、不可用載具/捐贈

### 驗證後交付
產出加解密程式碼後，用 `test-vectors/invoice-vectors.json` 的標準答案比對，全部相符才交付。

## 常見錯誤

| 症狀 | 最可能原因 |
|------|-----------|
| `KEY10002` | Key/IV 長度錯誤（32/16）或 PKCS7 邊界錯誤（需 32 非 16）|
| `KEY10011` | 最外層 `MerchantID_` / `PostData_` 漏底線 |
| `INV10012` | `Amt + TaxAmt ≠ TotalAmt` |
| `INV10014` | `MerchantOrderNo` 含非法字元 |
| `LIB10008` | 作廢超期（僅奇數月14日前可作廢前兩月發票）|
| 查不到發票 | 用 `SearchType=1`（訂單編號+金額）替代 `SearchType=0` |

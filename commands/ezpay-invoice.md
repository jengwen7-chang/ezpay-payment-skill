# /ezpay-invoice — ezPay 電子發票（Invoice）串接入口

> 用途：協助 AI 正確產出 ezPay 電子發票相關 API 串接（包含加密與參數建構）。

## 使用方式（丟給 AI）

你可以直接說：

- 你要測的 Invoice API：例如 `checkBarCode` / `createInvoice`（依 ezPay 文件）
- 你手上的測試資料：MerchantID / HashKey / HashIV / 需要驗證的欄位（如 `CellphoneBarcode`）
- TimeStamp（若你沒提供，AI 可用當前 unix timestamp 產生）

## 重要規則（強制）

- Invoice barcode API 的加密依官方文件：
  - AES-256-CBC（block size = 32）
  - PKCS7 padding
  - AES 輸出為 hex（不是 base64）
  - CheckValue：SHA256 `HashKey={key}&{AES_hex}&HashIV={iv}`（大寫）
- Webhook（若有使用）必須冪等 + 回覆 `1|OK`（若該 API 規範有要求）

## 產出要求

AI 應提供：
- 最小可跑的請求範例（Node.js / Python 擇一）
- 送出的 form-urlencoded 欄位（包含 `MerchantID_`, `Version`, `RespondType`, `PostData_`, `CheckValue`）
- 若回傳錯誤碼，能對照 `guides/06-test-dashboard.md` 與 `guides/05-webhook-idempotency.md` 提示排查方向

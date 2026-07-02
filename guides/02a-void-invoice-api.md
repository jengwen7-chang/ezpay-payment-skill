# 作廢發票 API

> 作廢已開立的發票。**只能在「前兩個月」且「奇數月 14 日前」執行。**

---

## 基本資訊

| 項目 | 內容 |
|:-----|:-----|
| Content-Type | `application/x-www-form-urlencoded` |
| 正式 URL | `POST https://inv.ezpay.com.tw/Api/invoice_invalid` |
| 測試 URL | `POST https://cinv.ezpay.com.tw/Api/invoice_invalid` |
| Version | `1.0` |

---

## 欄位定義

### 最外層（Form Post）

| 欄位 | 必填 | 說明 |
|------|------|------|
| `MerchantID_` | Y | ezPay 商店代號（注意底線）|
| `PostData_` | Y | AES-256-CBC 加密後 hex 字串 |

### PostData_ 內

| 欄位 | 必填 | 說明 |
|------|------|------|
| `RespondType` | Y | `JSON` / `String` |
| `Version` | Y | 固定 `1.0` |
| `TimeStamp` | Y | Unix 時間戳 |
| `InvoiceNumber` | Y | 欲作廢之發票號碼 |
| `InvalidReason` | Y | 作廢原因（中 6 字／英 20 字內）|

---

## 回應

| 欄位 | 說明 |
|------|------|
| `Status` | `SUCCESS` 或錯誤代碼 |
| `Result` | 含 `MerchantID`、`InvoiceNumber`、`CreateTime`、`CheckCode` |

---

## 錯誤代碼

| 代碼 | 說明 |
|------|------|
| `LIB10005` | 發票已作廢過 |
| `LIB10007` | 發票已執行折讓，不可作廢；應改用「作廢折讓」 |
| `LIB10008` | 超過可作廢期限（奇數月 14 日前）|
| `LIB10009` | 發票已開立但未上傳財政部，需等次日 06:00 後 |
| `INV70002` | 上傳失敗之發票不得作廢 |

---

## 加密規格

與開立發票 API 相同：AES-256-CBC + PKCS7(32-byte) + 小寫 Hex + SHA256 CheckCode。

# 查詢發票 API

> 以發票號碼或訂單編號查詢發票狀態與詳細資料。

---

## 基本資訊

| 項目 | 內容 |
|:-----|:-----|
| Content-Type | `application/x-www-form-urlencoded` |
| 正式 URL | `POST https://inv.ezpay.com.tw/Api/invoice_search` |
| 測試 URL | `POST https://cinv.ezpay.com.tw/Api/invoice_search` |
| Version | `1.3` |

---

## 欄位定義

### 最外層

| 欄位 | 必填 | 說明 |
|------|------|------|
| `MerchantID_` | Y | ezPay 商店代號（注意底線）|
| `PostData_` | Y | AES-256-CBC 加密後 hex 字串 |

### PostData_ 內

| 欄位 | 必填 | 說明 |
|------|------|------|
| `RespondType` | Y | `JSON` / `String` |
| `Version` | Y | 固定 `1.3` |
| `TimeStamp` | Y | Unix 時間戳 |
| `SearchType` | N | `0`=發票號+隨機碼；`1`=訂單編號+發票金額（預設 `0`）|
| `InvoiceNumber` | C | 發票號碼（`SearchType=0` 時必填）|
| `RandomNum` | C | 防偽隨機碼（`SearchType=0` 時必填）|
| `MerchantOrderNo` | C | 商店自訂編號（`SearchType=1` 時必填）|
| `TotalAmt` | C | 發票金額（`SearchType=1` 時必填）|
| `DisplayFlag` | N | `1`=網頁顯示；`2`=回傳 URL；不帶=直接回傳發票資料 |

---

## Result 重要欄位

| 欄位 | 說明 |
|------|------|
| `InvoiceTransNo` | ezPay 開立序號 |
| `InvoiceNumber` | 發票號碼 |
| `Category` | `B2B` / `B2C` |
| `TaxType` | `1`/`2`/`3`/`9` |
| `Amt` / `TaxAmt` / `TotalAmt` | 銷售額 / 稅額 / 總金額 |
| `ItemDetail` | 商品明細（JSON 格式）|
| `InvoiceStatus` | `1` 已開立 / `2` 已作廢 |
| `UploadStatus` | `0` 未上傳 / `1` 已上傳成功 / `2` 上傳中 / `3` 上傳失敗 / `4` 上傳逾時 |
| `CarrierType` / `CarrierNum` | 載具資訊 |
| `CreateTime` | 開立時間 |
| `CheckCode` | SHA256 驗證碼 |

---

## 實務建議

- **`SearchType=1`**（訂單編號+發票金額）比 `SearchType=0`（發票號+隨機碼）更穩健，因為 `InvoiceNumber` 在即時開立前未知
- 由於發票 API **沒有 Webhook**，建議系統以 `/Api/invoice_search` 排程確認開立結果

---

## 加密規格

與開立發票 API 相同：AES-256-CBC + PKCS7(32-byte) + 小寫 Hex + SHA256 CheckCode。

---

## 字軌管理（補充）

### 新增字軌

| 項目 | 內容 |
|:-----|:-----|
| URL | `POST https://inv.ezpay.com.tw/Api_number_management/createNumber`（測試：`cinv.ezpay.com.tw`）|

> ⚠️ 注意最外層使用 **`CompanyID_`**（不是 `MerchantID_`）

### PostData_ 欄位

| 欄位 | 必填 | 說明 |
|------|------|------|
| `RespondType` | Y | `JSON` / `String` |
| `Version` | Y | 固定 `1.0` |
| `TimeStamp` | Y | Unix 時間戳 |
| `Year` | Y | 民國年（如 `115`）|
| `Term` | Y | 期別 `1`~`6`（一二月/三四月…十一二月）|
| `AphabeticLetter` | Y | 字軌英文代碼（兩碼大寫）|
| `StartNumber` | Y | 起始號（如 `00000001`）|
| `EndNumber` | Y | 結束號（如 `00009999`）|
| `Type` | Y | `07` 一般稅額 / `08` 特種稅額 |

> 同時期別僅能啟用一組字軌；字軌啟用後才能開立發票。

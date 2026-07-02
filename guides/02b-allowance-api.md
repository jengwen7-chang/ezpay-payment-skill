# 折讓 API（開立 / 觸發 / 作廢）

折讓是對已開立發票的退補貨處理，分為三個階段。

---

## 1. 開立折讓（Allowance Issue）

> 對已開立發票開立折讓單。折讓單一經確認，該發票即不能再作廢。

| 項目 | 內容 |
|:-----|:-----|
| 正式 URL | `POST https://inv.ezpay.com.tw/Api/allowance_issue` |
| 測試 URL | `POST https://cinv.ezpay.com.tw/Api/allowance_issue` |
| Version | `1.3` |

### PostData_ 欄位

| 欄位 | 必填 | 說明 |
|------|------|------|
| `RespondType` | Y | `JSON` / `String` |
| `Version` | Y | 固定 `1.3` |
| `TimeStamp` | Y | Unix 時間戳 |
| `InvoiceNo` | Y | 原發票號碼 |
| `MerchantOrderNo` | Y | 原發票商店自訂編號 |
| `ItemName` | Y | 折讓商品名稱（多項 `|` 分隔）|
| `ItemCount` | Y | 折讓商品數量 |
| `ItemUnit` | Y | 折讓商品單位 |
| `ItemPrice` | Y | 折讓商品單價 |
| `ItemAmt` | Y | 折讓商品小計 |
| `ItemTaxAmt` | Y | 折讓商品稅額（多項 `|` 分隔）|
| `TaxTypeForMixed` | C | 混合稅率時必填：`1`/`2`/`3` |
| `TotalAmt` | Y | 折讓總金額 |
| `BuyerEmail` | N | 買受人 Email |
| `Status` | Y | `0`=不立即確認；`1`=立即確認 |

### 回應

含 `AllowanceNo`（折讓號）、`InvoiceNumber`、`AllowanceAmt`、`RemainAmt`、`CheckCode`。

---

## 2. 折讓觸發（Allowance Touch）

> 對 `Status=0` 的未確認折讓單執行確認或取消。

| 項目 | 內容 |
|:-----|:-----|
| 正式 URL | `POST https://inv.ezpay.com.tw/Api/allowance_touch_issue` |
| 測試 URL | `POST https://cinv.ezpay.com.tw/Api/allowance_touch_issue` |
| Version | `1.0` |

### PostData_ 欄位

| 欄位 | 必填 | 說明 |
|------|------|------|
| `RespondType` | Y | `JSON` / `String` |
| `Version` | Y | 固定 `1.0` |
| `TimeStamp` | Y | Unix 時間戳 |
| `AllowanceStatus` | Y | `C`=確認折讓；`D`=取消折讓 |
| `AllowanceNo` | Y | 折讓號 |
| `MerchantOrderNo` | Y | 原發票商店自訂編號 |
| `TotalAmt` | Y | 折讓總金額 |

### 限制

- 已確認（`AllowanceStatus=C`）的折讓**不可再取消**，只能改用「作廢折讓」
- `AllowanceStatus=D`（取消）僅對 `Status=0` 的未確認折讓有效

---

## 3. 作廢折讓（Allowance Void）

> 作廢已確認的折讓單。

| 項目 | 內容 |
|:-----|:-----|
| 正式 URL | `POST https://inv.ezpay.com.tw/Api/allowanceInvalid` |
| 測試 URL | `POST https://cinv.ezpay.com.tw/Api/allowanceInvalid` |
| Version | `1.0` |

> ⚠️ **注意端點為駝峰式 `allowanceInvalid`**，這是 ezPay 唯一的例外命名，其他所有 API 都是底線 snake_case。

### PostData_ 欄位

| 欄位 | 必填 | 說明 |
|------|------|------|
| `RespondType` | Y | `JSON` / `String` |
| `Version` | Y | 固定 `1.0` |
| `TimeStamp` | Y | Unix 時間戳 |
| `AllowanceNo` | Y | 欲作廢之折讓號 |
| `InvalidReason` | Y | 作廢原因（中 6 字／英 20 字內）|

### 錯誤代碼

| 代碼 | 說明 |
|------|------|
| `IAI10002` | 查詢失敗（確認 `AllowanceNo` 正確）|
| `IAI10003` | 更新失敗 |

---

## 加密規格（全部相同）

- AES-256-CBC + PKCS7(32-byte) + 小寫 Hex + SHA256 CheckCode
- 與開立發票 API 的加密完全一致

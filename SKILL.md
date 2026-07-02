# ezPay 簡單付 — 完整串接 Skill

> Version: v1.2-draft
> 基於官方文件：API_E_wallet_ezPay_1.0.2、API_Cross_Trans_ezPay_1.0.1、API_Cross_Trans_refund_ezPay_1.0.3、API_Cross_Trans_search_ezPay_1.0.1、API_Trans_ezPay_1.0.0、BDV_1_0_0、EZP_INVI v1.2.2

---

## 目錄（AI 導航）

- [基本資訊與加密核心](#基本資訊)
- [API 端點表](#api-端點quick-table)
- [commands/ 快速入口](#commands-ai-快速入口)
- [test-vectors/ 驗證向量](#test-vectors-驗證向量)
- [guides/ 必讀清單](#guides-必讀清單)

---

## 基本資訊

### 環境

| 環境 | 發票 API URL 前綴 | 金流 API URL 前綴 |
|------|-------------------|-------------------|
| **測試** | `https://cinv.ezpay.com.tw` | `https://cpayment.ezpay.com.tw` |
| **正式** | `https://inv.ezpay.com.tw` | `https://payment.ezpay.com.tw` |

### 加密核心（所有 API 統一）

| 項目 | 規格 |
|------|------|
| 提交方式 | HTTP POST（`application/x-www-form-urlencoded`），**非 JSON** |
| AES 模式 | AES-256-CBC |
| AES Block size | **32 bytes**（非標準 16）|
| AES Padding | PKCS7（block size = 32）|
| AES 輸出 | **小寫 Hex**（`bin2hex`）|
| SHA256 格式 | `HashKey={key}&{AES_hex}&HashIV={iv}` → **大寫** |

> ⚠️ 本 repo 同時含**金流**（`payment.ezpay.com.tw`）與**電子發票**（`inv.ezpay.com.tw`）兩套 API。兩者共用同一套加密邏輯，但金鑰（HashKey/HashIV）各自獨立，**不可混用**。

---

## API 端點（Quick Table）

### 💳 金流 API

| API | 正式環境 | 測試環境 | Version |
|-----|-----------|-----------|---------|
| MPG（一般交易）| `https://payment.ezpay.com.tw/MPG/mpg_gateway` | `https://cpayment.ezpay.com.tw/MPG/mpg_gateway` | `1.0` |
| 交易查詢 | `/API/merchant_trade/query_trade_info` | 同前綴 | `1.0` |
| 跨境退款 | `/API/merchant_trade/trade_refund` | 同前綴 | `2.1` |

### 🧾 電子發票 API

| API | 端點路徑 | Version | 說明 |
|-----|---------|---------|------|
| 開立發票 | `/Api/invoice_issue` | `1.5` | B2C/B2B 即時或預約 |
| 觸發開立 | `/Api/invoice_touch_issue` | `1.0` | 對 `Status=0`/`3` 提前開立 |
| 作廢發票 | `/Api/invoice_invalid` | `1.0` | 限前兩月、奇數月14日前 |
| 折讓開立 | `/Api/allowance_issue` | `1.3` | 退補貨折讓 |
| 折讓觸發 | `/Api/allowance_touch_issue` | `1.0` | 確認(`C`)或取消(`D`)折讓 |
| 作廢折讓 | `/Api/allowanceInvalid` | `1.0` | ⚠️ camelCase（唯一例外）|
| 查詢發票 | `/Api/invoice_search` | `1.3` | 發票號或訂單編號查詢 |
| 新增字軌 | `/Api_number_management/createNumber` | `1.0` | 使用 `CompanyID_` |
| 手機條碼驗證 | `/Api_inv_application/checkBarCode` | — | Result 需解密 |
| 捐贈碼驗證 | `/Api_inv_application/checkLoveCode` | — | Result 需解密 |

---

## commands（AI 快速入口）

| 指令 | 用途 |
|------|------|
| `commands/ezpay-pay.md` | 金流 MPG / 交易查詢 / 退款 |
| **`commands/ezpay-invoice.md`** | **電子發票（開立/作廢/折讓/查詢/驗證）** |
| `commands/ezpay-debug.md` | 加密/簽章/參數除錯 |
| `commands/ezpay-go-live.md` | 上線前檢查 |

---

## test-vectors（驗證向量）

| 檔案 | 內容 |
|------|------|
| `test-vectors/aes-encryption.json` | 金流 AES 加密/解密向量 |
| `test-vectors/invoice-barcode.json` | 發票 checkBarCode 範例 |
| **`test-vectors/invoice-vectors.json`** | **發票全 API 加解密標準答案** |
| `test-vectors/verify-node.js` | Node.js 驗證腳本 |
| `test-vectors/verify.py` | Python 驗證腳本 |

---

## guides（必讀）

### 電子發票

| 文件 | 用途 |
|------|------|
| **`guides/02-invoice-api.md`** | **開立發票 API（核心，B2C/B2B）** |
| `guides/02a-void-invoice-api.md` | 作廢發票 |
| `guides/02b-allowance-api.md` | 折讓（開立/觸發/作廢）|
| `guides/02c-invoice-search-api.md` | 查詢發票 + 字軌管理 |
| `guides/02d-barcode-lovecode-api.md` | 手機條碼 / 捐贈碼驗證 |

### 金流

| 文件 | 用途 |
|------|------|
| `guides/00-onboarding.md` | 快速開始 |
| `guides/01-encryption-deepdive.md` | 加密深度解析 |
| `guides/05-webhook-idempotency.md` | Webhook 冪等性 |
| `guides/06-test-dashboard.md` | 測試指南 |
| `guides/07-prod-readonly.md` | 正式環境探針與只讀 |
| `guides/10-refund-safety.md` | 退款安全 |

---

## 電子發票五大踩坑

1. **HashKey 是 32 碼**，HashIV 是 16 碼（與綠界 16/16 不同）
2. **欄位名稱有底線 `_`**：`MerchantID_` 與 `PostData_` 後方底線**不可省略**
3. **加密輸出是 Hex 不是 Base64**
4. **作廢折讓端點是 camelCase**：`/Api/allowanceInvalid`（唯一例外，其他均底線）
5. **沒有 Webhook**：開立成功只靠同步回應；需自行排程以 `/Api/invoice_search` 確認狀態

---

## guides/01 的加密核心（必記）

- AES-256-CBC
- block size = 32 bytes
- PKCS7 padding
- AES 輸出 hex（小寫）
- SHA256：`HashKey={key}&{AES_hex}&HashIV={iv}`，大寫

# ezPay 簡單付 — 完整串接 Skill

> Version: v1.1-draft
> 基於官方文件：API_E_wallet_ezPay_1.0.2、API_Cross_Trans_ezPay_1.0.1、API_Cross_Trans_refund_ezPay_1.0.3、API_Cross_Trans_search_ezPay_1.0.1、API_Trans_ezPay_1.0.0、BDV_1_0_0

---

## 目錄（AI 導航）

- 基本資訊與加密核心
- API 端點表
- commands/ 快速入口
- test-vectors/ 驗證向量
- guides/ 必讀清單

---

## 基本資訊

| 項目 | 值 |
|------|------|
| 提交方式 | HTTP POST（`application/x-www-form-urlencoded`），非 JSON |
| 加密 | AES-256-CBC + hex + SHA256 |
| Block size | **32 bytes** |
| padding | PKCS7（block size=32） |
| SHA256 格式 | `HashKey={key}&{AES_hex}&HashIV={iv}`（大寫） |

> 註：本 skill 所有加密規格以 `references/BDV_1_0_0.pdf` 與官方文件為準。

---

## 涵蓋服務

- 一般交易：`CREDIT` / `P2GEACC` / `ACCLINK` / `WEBATM` / `CVS` / `VACC`
- 跨境交易：`ALIPAY` / `WECHAT`

## API 端點（Quick Table）

| API | 正式環境 | 測試環境 | Version |
|-----|-----------|-----------|---------|
| MPG（一般交易） | `https://payment.ezpay.com.tw/MPG/mpg_gateway` | `https://cpayment.ezpay.com.tw/MPG/mpg_gateway` | `1.0` |
| 交易查詢 | `https://payment.ezpay.com.tw/API/merchant_trade/query_trade_info` | `https://cpayment.ezpay.com.tw/API/merchant_trade/query_trade_info` | `1.0` |
| 跨境退款 | `https://payment.ezpay.com.tw/API/merchant_trade/trade_refund` | `https://cpayment.ezpay.com.tw/API/merchant_trade/trade_refund` | `2.1` |
| 電子發票（Invoice） | （依文件）`checkBarCode` | （依文件） | — |

---

## commands（AI 快速入口）

- `commands/ezpay-pay.md`：一般交易（MPG）
- `commands/ezpay-invoice.md`：電子發票（Invoice）
- `commands/ezpay-debug.md`：加密/簽章/參數除錯
- `commands/ezpay-go-live.md`：上線前檢查

---

## test-vectors（驗證向量）

- `test-vectors/aes-encryption.json`：AES 加密/解密向量
- `test-vectors/invoice-barcode.json`：Invoice checkBarCode 範例請求內容
- `test-vectors/verify-node.js`：Node.js 驗證腳本
- `test-vectors/verify.py`：Python 驗證腳本

---

## guides（必讀）

- `guides/00-onboarding.md`：快速開始
- `guides/01-encryption-deepdive.md`：加密深度解析
- `guides/05-webhook-idempotency.md`：Webhook 冪等性
- `guides/06-test-dashboard.md`：測試指南
- `guides/07-prod-readonly.md`：正式環境探針與只讀
- `guides/10-refund-safety.md`：退款安全

---

## guides/01 的加密核心（必記）

- AES-256-CBC
- block size = 32 bytes
- PKCS7 padding
- AES 輸出 hex（bin2hex）
- SHA256：`HashKey={key}&{AES_hex}&HashIV={iv}`，大寫

---

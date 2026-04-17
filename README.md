# ezPay 簡單付電子支付 — API Skill

> Version: v1.1-draft
> 基於官方文件：API_E_wallet_ezPay_1.0.2、API_Cross_Trans_ezPay_1.0.1、API_Cross_Trans_refund_ezPay_1.0.3、API_Cross_Trans_search_ezPay_1.0.1、API_Trans_ezPay_1.0.0、BDV_1_0_0

ezPay API Skill 是一組提供給 AI coding assistant 使用的知識文件。安裝到 Claude Code、Copilot、Cursor、OpenClaw 等工具後，AI 能依照 ezPay 官方規格生成串接程式、排查加密錯誤、並引導上線。

## 這份 skill 的定位

- 目標：幫 AI 正確處理 ezPay MPG / Query / Refund / Invoice 串接
- 原則：以官方 PDF 為準，不從第三方 SDK 猜規格
- 加密：**AES-256-CBC + hex + SHA256 `HashKey={key}&{AES_hex}&HashIV={iv}`**
- 傳輸：HTTP POST（`application/x-www-form-urlencoded`），非 JSON

## 基本資訊

| 項目 | 內容 |
|------|------|
| 公司 | 簡單行動支付股份有限公司 |
| 正式環境 | `https://payment.ezpay.com.tw` |
| 測試環境 | `https://cpayment.ezpay.com.tw` |
| API 版本 | MPG 1.0、查詢 1.0、退款 2.1 |
| 主要服務 | 一般交易、跨境交易、交易查詢、退款、電子發票 |

## 涵蓋服務

- 一般交易：`CREDIT` / `P2GEACC` / `ACCLINK` / `WEBATM` / `CVS` / `VACC`
- 跨境交易：`ALIPAY` / `WECHAT`
- 查詢：merchant trade query
- 退款：cross-border refund API
- 電子發票：含 `checkBarCode` 測試流程

## 指南索引

- `guides/00-onboarding.md` — 快速開始
- `guides/01-encryption-deepdive.md` — 加密規格與範例
- `guides/03-express-reference.md` — Express.js 參考實作
- `guides/04-fastapi-reference.md` — FastAPI 參考實作
- `guides/05-webhook-idempotency.md` — webhook 冪等與重送處理
- `guides/06-test-dashboard.md` — 測試/驗證與 dashboard 操作
- `guides/07-prod-readonly.md` — 正式環境只讀檢查
- `guides/10-refund-safety.md` — 退款安全機制

## commands/

最小必要入口（參考 ECPay skill 做法）：
- `commands/ezpay-pay.md`
- `commands/ezpay-invoice.md`
- `commands/ezpay-debug.md`
- `commands/ezpay-go-live.md`

## test-vectors/

- `test-vectors/aes-encryption.json` — AES + SHA256 驗證向量
- `test-vectors/invoice-barcode.json` — invoice barcode request sample
- `test-vectors/verify-node.js` — Node.js 驗證腳本
- `test-vectors/verify.py` — Python 驗證腳本

## scripts/

- `scripts/validate-internal-links.sh`
- `scripts/validate-version-sync.sh`
- `scripts/validate-vectors-presence.sh`

## 快速命令（給 AI）

- `/ezpay-pay`：產出一般交易串接程式
- `/ezpay-invoice`：產出電子發票 API 請求與測試
- `/ezpay-debug`：排查 AES / SHA256 / 參數錯誤
- `/ezpay-go-live`：上線 checklist

## 核心規則

1. Block size = **32 bytes**（依 ezPay 文件）
2. AES 輸出是 **hex**，不是 base64
3. SHA256 格式必須為 `HashKey={key}&{AES_hex}&HashIV={iv}` 並轉大寫
4. NotifyURL 必須是 public HTTPS
5. webhook 必須可冪等；若文件要求，需立即回 `1|OK`

## 檔案結構

```text
.
├── SKILL.md
├── README.md
├── guides/
├── references/
├── commands/
├── test-vectors/
├── scripts/
├── templates/
├── tools/
└── .github/workflows/ci.yaml
```

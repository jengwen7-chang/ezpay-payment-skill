# ezPay 簡單付電子支付 — 完整串接 Skill

> AI Assistant（Claude Code / Coworker）用 ezPay 簡單付串接技能文件  
> 基於官方文件：API_E_wallet_ezPay_1.0.2、API_Cross_Trans_ezPay_1.0.1、API_Cross_Trans_refund_ezPay_1.0.3、API_Cross_Trans_search_ezPay_1.0.1、API_Trans_ezPay_1.0.0

---

## 專案定位

這是一個 AI Skill，旨在幫助 AI 助手快速理解 ezPay 簡單付的完整 API 規格，並生成正確的串接程式碼。

## 基本資訊

| 項目 | 內容 |
|------|------|
| 公司 | 簡單行動支付股份有限公司 |
| 服務地區 | 台灣（Taiwan） |
| API 版本 | MPG 1.0、查詢 1.0、退款 2.1 |
| 加密方式 | **AES-256-CBC + SHA256** 雙層加密 |
| 授權 | MIT License |

---

## 支援的支付方式

### 一般交易（國內）

| 代碼 | 名稱 | 交易性質 |
|------|------|---------|
| CREDIT | 信用卡（一次付清 / 分期 / 紅利折抵）| 即時 |
| P2GEACC | 電子帳戶支付 | 即時 |
| ACCLINK | 約定連結存款帳戶 | 即時 |
| WEBATM | WebATM | 即時 |
| VACC | ATM 轉帳 | 非即時 |
| CVS | 超商代碼繳費 | 非即時 |

### 跨境交易（需另外申請）

| 代碼 | 名稱 | 交易性質 |
|------|------|---------|
| ALIPAY | 支付寶 | 即時 |
| WECHAT | 微信支付 | 即時 |

> ⚠️ ALIPAY / WECHAT 需要向 ezPay 另外申請開通，非預設服務。

---

## 環境

| 環境 | API 網址 |
|------|---------|
| 測試 | `https://cpayment.ezpay.com.tw` |
| 正式 | `https://payment.ezpay.com.tw` |

| 項目 | 值 |
|------|---|
| 測試卡號 | `4000-22XX-XXXX-XXXX`（前六碼 `4000-22`）|
| CVV | 任意 3 碼 |
| ALIPAY | 測試環境直接模擬成功 |
| WECHAT | 測試環境模擬 QR code，30 秒後自動完成 |

---

## 加密（官方文件確認）

| 項目 | 值 |
|------|---|
| 演算法 | AES-256-CBC |
| Block size | **32 bytes**（非標準 16）|
| Padding | PKCS5/PKCS7（block size = 32）|
| 輸出格式 | **hex**（`bin2hex`）|
| SHA256 格式 | `HashKey={key}&{AES_hex}&HashIV={iv}` |

---

## 檔案結構

```
ezpay-payment-skill/
├── SKILL.md                          # 快速參考文件
├── guides/
│   ├── 00-onboarding.md              # 快速開始
│   ├── 01-encryption-deepdive.md    # 加密深度解析
│   ├── 03-express-reference.md       # Express.js 實作
│   ├── 04-fastapi-reference.md       # FastAPI 實作
│   ├── 05-webhook-idempotency.md     # ⚠️ Webhook 冪等性（必讀）
│   ├── 06-test-dashboard.md         # 測試指南
│   ├── 07-prod-readonly.md          # 正式環境探針
│   └── 10-refund-safety.md          # 退款安全機制
├── references/                        # 官方 PDF 文件
├── templates/
│   ├── telegram-bot/                 # Telegram 機器人
│   └── discord-bot/                  # Discord 機器人
└── .github/workflows/ci.yaml        # CI 驗證
```

---

## 使用方式

1. 將 `SKILL.md` 放入專案作為參考
2. 依序閱讀 `guides/00-onboarding.md` → `guides/01-encryption-deepdive.md`
3. 上線前必讀 `guides/05-webhook-idempotency.md`
4. 使用 `guides/03-express-reference.md` 或 `guides/04-fastapi-reference.md` 實作

---

## 核心原則

> **Block size = 32**，不是 16  
> **輸出是 hex**，不是 base64  
> **SHA256 要加前綴後綴**：`HashKey=` 和 `&HashIV=`  
> **Webhook 必須防重送**，否則上線會出事  
> **ALIPAY / WECHAT 需要另外申請**，不是預設開通

---

**授權**：MIT License  
**關鍵字**：台灣金流串接、電子支付、ezPay、簡單付、Payment Gateway Taiwan、AI Skill、Claude Code Skill

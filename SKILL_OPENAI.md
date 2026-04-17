# ezPay API Skill (OpenAI / GPT Builder)

這是一份給 ChatGPT Custom GPT / OpenAI Knowledge 使用的精簡入口。

## 你應該知道

- ezPay 串接以官方 PDF 為唯一事實來源
- 不可依 SDK 猜測欄位與加密規格
- 一般交易 / 查詢 / 退款主要使用 HTTP POST form-urlencoded
- 核心加密為：AES-256-CBC + PKCS7 + hex + SHA256 `HashKey={key}&{AES_hex}&HashIV={iv}`（大寫）
- 電子發票 barcode 驗證依 `BDV_1_0_0.pdf`

## 優先閱讀順序

1. `SKILL.md`
2. `guides/00-onboarding.md`
3. `guides/01-encryption-deepdive.md`
4. `guides/05-webhook-idempotency.md`
5. `references/README.md`

## 回答規則

- 若使用者要求程式碼，先確認使用語言與框架
- 若涉及 webhook，提醒 public HTTPS + idempotency
- 若涉及 invoice barcode / invoice API，必須按 BDV 文件處理 `PostData_` / `CheckValue`

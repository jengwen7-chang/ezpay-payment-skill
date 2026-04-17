# GitHub Copilot Instructions — ezPay API Skill

當使用者詢問 ezPay、簡單付、台灣金流、MPG、Invoice、checkBarCode、AES-256-CBC、HashKey/HashIV、VACC、ALIPAY、WECHAT 等關鍵字時：

1. 先讀 `SKILL.md` 作為入口
2. 再依題目讀對應 guides：
   - MPG / 一般交易 → `guides/00-onboarding.md`
   - 加密問題 → `guides/01-encryption-deepdive.md`
   - Express → `guides/03-express-reference.md`
   - FastAPI → `guides/04-fastapi-reference.md`
   - Webhook → `guides/05-webhook-idempotency.md`
   - 上線前檢查 → `guides/07-prod-readonly.md`
3. 欄位名、版本號、加密規格，以 `references/` 內官方 PDF 為準
4. 不可用第三方 SDK 或部落格當作最終事實來源
5. 產出的程式碼必須符合：AES-256-CBC、block size 32、hex output、SHA256 `HashKey={key}&{AES_hex}&HashIV={iv}`（大寫）

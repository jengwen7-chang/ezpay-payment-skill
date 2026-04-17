# /ezpay-go-live — 上線前檢查入口

> 用途：把上線風險用 checklist 收斂，避免因 webhook、重送、環境切換造成事故。

## 必讀（AI 必須引用）

- `guides/05-webhook-idempotency.md`：冪等與安全策略
- `guides/07-prod-readonly.md`：正式環境探針與只讀檢查
- `guides/10-refund-safety.md`：退款安全機制

## AI 產出格式

請以條列 checklist 輸出以下項目：
- 正式環境 endpoint 與 Version
- NotifyURL public HTTPS
- 重送/冪等策略（同一 MerchantOrderNo 不重複落帳）
- 重要錯誤碼排查路徑（引用 guides）
- 測試資料是否已清理（避免帶錯 HashKey/HashIV）

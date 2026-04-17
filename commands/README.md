# commands/

本目錄提供給 Claude Code / OpenClaw / 其他 AI coding assistant 的快速入口提示。

## 可用入口

- `ezpay-pay.md` — 一般交易（MPG）
- `ezpay-invoice.md` — 電子發票與 barcode 驗證
- `ezpay-debug.md` — 加密 / 簽章 / 欄位排查
- `ezpay-go-live.md` — 上線前檢查清單

## 使用原則

- 入口只是提示模板，不是 API 規格本體
- 實際欄位、版本、加密規則仍以 `references/` 與 `guides/` 為準
- 若入口內容與官方 PDF 衝突，必須以官方 PDF 修正 skill

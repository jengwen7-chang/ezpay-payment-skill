# /ezpay-debug — ezPay 除錯入口（加密/簽章/參數）

> 用途：當 AI 或你遇到「加密後驗證失敗 / 解密亂碼 / 回傳錯誤碼」時，用這個入口把問題收斂。

## 使用方式

請直接貼：
- 你送出的原始明文（或你用來組 PostData_ 的參數）
- 你得到的 `PostData_` hex 與 `CheckValue`
- 你填的 `HashKey` / `HashIV`
- 你使用的 API 端點與 Version

## 這個入口會檢查

- AES 模式：必須是 AES-256-CBC（不是 ECB）
- block size：Invoice 為 32 bytes
- padding：PKCS7
- hex 輸出：必須 bin2hex 格式
- SHA256 格式：`HashKey=...&{AES_hex}&HashIV=...`（大寫）
- 若是 Webhook：檢查冪等與重送處理流程

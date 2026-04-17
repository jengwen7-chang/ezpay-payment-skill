# /ezpay-pay — ezPay 一般交易（MPG）串接入口

> 用途：協助 AI 直接產出「信用卡/電子帳戶/約定連結/WebATM/CVS/VACC」等 MPG（一般交易）串接程式與參數。

## 使用方式（丟給 AI）

請把以下需求直接貼給 AI（繁體中文描述即可）：

- 你要的交易方式：`CREDIT` / `P2GEACC` / `ACCLINK` / `WEBATM` / `CVS` / `VACC`
- 交易金額（Amt）與商品描述（ItemDesc）
- MerchantOrderNo（訂單號）
- 回呼（NotifyURL）public HTTPS（必須可冪等）
- 要用測試環境還是正式環境

## 輸出要求

AI 產出內容應包含：
- 對應 ezPay 端點（MPG 1.0）
- 加密流程：AES-256-CBC（block size=32）+ hex + SHA256 `HashKey={key}&{AES_hex}&HashIV={iv}`（大寫）
- 產生送出的 `application/x-www-form-urlencoded` POST body：
  - `MerchantID_`, `Version`, `RespondType`, `TimeStamp`, `MerchantOrderNo`, …
  - `Encrypt`/`PostData` 欄位（依你使用的 MPG 介面實作）
- Webhook 冪等性：確保同一訂單重送不重複處理（見 `guides/05-webhook-idempotency.md`）

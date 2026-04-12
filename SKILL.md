# ezPay 簡單付 — 完整串接 Skill

> 基於官方文件：API_E_wallet_ezPay_1.0.2、API_Cross_Trans_ezPay_1.0.1、API_Cross_Trans_refund_ezPay_1.0.3、API_Cross_Trans_search_ezPay_1.0.1、API_Trans_ezPay_1.0.0

---

## 基本資訊

| 項目 | 值 |
|------|------|
| 公司 | 簡單行動支付股份有限公司（ezPay Digital Entertainment Co., Ltd.）|
| 正式環境 | `https://payment.ezpay.com.tw` |
| 測試環境 | `https://cpayment.ezpay.com.tw` |
| 提交方式 | HTTP POST（`application/x-www-form-urlencoded`），**非 JSON** |
| 加密 | **AES-256-CBC** + SHA256（雙層加密）|

---

## API 端點

| API | 正式環境 | 測試環境 | Version |
|-----|---------|---------|---------|
| MPG（一般交易）| `https://payment.ezpay.com.tw/MPG/mpg_gateway` | `https://cpayment.ezpay.com.tw/MPG/mpg_gateway` | **1.0** |
| MPG（跨境交易）| 同上 | 同上 | **1.0** |
| 交易查詢 | `https://payment.ezpay.com.tw/API/merchant_trade/query_trade_info` | `https://cpayment.ezpay.com.tw/API/merchant_trade/query_trade_info` | **1.0** |
| 跨境退款 | `https://payment.ezpay.com.tw/API/merchant_trade/trade_refund` | `https://cpayment.ezpay.com.tw/API/merchant_trade/trade_refund` | **2.1** |

---

## 支援的支付方式

### 一般交易（國內）

| 代碼 | 名稱 | 交易性質 |
|------|------|---------|
| CREDIT | 信用卡（一次付清 / 分期 / 紅利折抵）| 即時 |
| P2GEACC | 電子帳戶支付 | 即時 |
| ACCLINK | 約定連結存款帳戶 | 即時 |
| WEBATM | WebATM | 即時 |
| VACC | ATM 轉帳 | **非即時**（取號後轉帳）|
| CVS | 超商代碼繳費 | **非即時**（取號後至超商繳費）|

### 跨境交易（需另外申請）

| 代碼 | 名稱 | 交易性質 | 測試環境行為 |
|------|------|---------|------------|
| ALIPAY | 支付寶 | 即時 | 直接模擬成功，不導向支付寶 |
| WECHAT | 微信支付 | 即時 | 模擬二維碼，30 秒後自動完成 |

> ⚠️ **跨境支付工具（ALIPAY / WECHAT）需要向 ezPay 另外申請開通**，一般 MPG 串接預設僅涵蓋國內交易。

---

## 加密演算法（官方文件確認）

> ⚠️ **Block size = 32**，不是 AES 標準的 16。這是 ezPay 的特殊設計。

### AES-256-CBC 加密

```
1. 參數（ksort 無須，順序無所謂）→ http_build_query → URL-encoded string
2. PKCS5/PKCS7 padding（block size = 32）
3. AES-256-CBC 加密（IV = HashIV）
4. bin2hex → hex string（非 base64！）
```

### SHA256 簽章

```
TradeSha = SHA256( "HashKey=" + HashKey + "&" + AES_hex_string + "&HashIV=" + HashIV ).toUpperCase()
```

⚠️ **別忘了 `HashKey=` 和 `&HashIV=` 前綴後綴！**

### 地雷提醒

| 地雷 | 說明 |
|------|------|
| Block size = 32 | 不是 AES 標準的 16，是 ezPay 特殊設計 |
| 輸出是 hex | 不是 base64！所有官方文件都是 `bin2hex` |
| mcrypt 已廢棄 | 官方 PDF 用 `mcrypt_encrypt`，但 PHP 7.2+ 請用 `openssl_encrypt` |
| ALIPAY/WECHAT 需申請 | 不是預設開通，需另外申請 |

---

## MPG 參數（外包裝）

| 參數 | 必填 | 說明 |
|------|------|------|
| MerchantID | ✅ | 商店代號 |
| Version | ✅ | 請帶 `1.0` |
| TimeStamp | ✅ | Unix 時間戳（秒）|
| MerchantOrderNo | ✅ | 商店訂單編號（限英、數字、`_`）|
| Amt | ✅ | 訂單金額（純數字，TWD）|
| ItemDesc | ✅ | 商品資訊（UTF-8）|
| TradeInfo | ✅ | AES 加密後的交易資料 |
| TradeSha | ✅ | SHA256 檢查碼 |

### TradeInfo 參數（需 AES 加密）

| 參數 | 必填 | 說明 |
|------|------|------|
| TimeStamp | ✅ | 時間戳記 |
| MerchantID | ✅ | 商店代號 |
| Version | ✅ | 請帶 `1.0` |
| MerchantOrderNo | ✅ | 商店訂單編號 |
| Amt | ✅ | 訂單金額 |
| ItemDesc | ✅ | 商品資訊 |
| ReturnURL | | 支付完成後導回網址 |
| ClientBackURL | | 取消支付返回網址 |
| NotifyURL | | 背景回傳通知網址（**重要**）|
| Email | | 消費者 Email |
| Phone | | 消費者電話 |
| PaymentMethod | | 限定支付方式（可不帶，等於全部開放）|

### 限定支付方式（PaymentMethod）

若要限定只能使用特定支付方式，可在 TradeInfo 中帶入：

```
CREDIT,WEBATM,VACC,CVS,P2GEACC,ACCLINK
```

### MPG 回傳（ezPay → 商戶）

| 參數 | 說明 |
|------|------|
| Status | SUCCESS = 成功，否則為錯誤碼 |
| TradeInfo | AES 加密的回傳資料 |
| TradeSha | SHA256 檢查碼 |

### TradeInfo 解密後欄位

```json
{
  "Status": "SUCCESS",
  "Message": "交易成功",
  "Result": {
    "MerchantID": "...",
    "Amt": 1000,
    "TradeNo": "ezPay交易序號",
    "MerchantOrderNo": "...",
    "PaymentType": "CREDIT",
    "PayTime": "2024/01/01 12:00:00"
  }
}
```

---

## 交易查詢參數

### QueryInfo（需 AES 加密）

| 參數 | 必填 | 說明 |
|------|------|------|
| TimeStamp | ✅ | 時間戳記 |
| MerchantID | ✅ | 商店代號 |
| Version | ✅ | 請帶 `1.0` |
| TradeNo | ✅* | ezPay 交易序號（與 MerchantOrderNo 二選一）|
| MerchantOrderNo | ✅* | 商店訂單編號（與 TradeNo 二選一）|

### 交易狀態（PaymentStatus）

| 值 | 說明 |
|----|------|
| 1 | 付款成功 |
| 2 | 未付款 |
| 4 | 交易失敗 |

---

## 跨境退款參數（Version = 2.1）

### RefundInfo（需 AES 加密）

| 參數 | 必填 | 說明 |
|------|------|------|
| TimeStamp | ✅ | 時間戳記 |
| MerchantID | ✅ | 商店代號 |
| Version | ✅ | 請帶 `2.1` |
| TradeNo | ✅* | ezPay 交易序號（二選一）|
| MerchantOrderNo | ✅* | 商店訂單編號（二選一）|
| RefundAmt | ✅ | 退款金額 |
| RefundType | ✅ | 請帶 `1`（退款）|
| Currency | ✅ | 請帶 `TWD` |

### 跨境退款規則

- 可退款時間：交易當日起算 **120 天內**
- 不限退款次數
- 退款金額必須 ≤ 交易金額
- 每周日 23:50 至隔周一 00:05 為清算時間，無法退款

---

## 錯誤代碼

### MPG 錯誤碼

| 錯誤碼 | 說明 |
|--------|------|
| MPG01000 | 送入參數檢查錯誤 |
| MPG01010 | 程式版本錯誤 |
| MPG01012 | 商店訂單編號錯誤 |
| MPG01014 | 網址設定錯誤 |
| MPG01015 | 訂單金額錯誤 |
| MPG01016 | 時間戳記錯誤 |
| MPG01017 | 商品資訊錯誤 |
| MPG02002 | 查無商店開啟任何金流服務 |
| MPG02003 | 金流服務未啟用 |
| MPG02004 | 超過交易限制時間 |
| MPG02005 | 驗證資料錯誤 |
| MPG02006 | 系統異常 |
| MPG03001 | 訂單資訊解密失敗 |
| MPG03004 | 商店狀態或屬性不符合 |
| MPG03007 | 查無此商店代號 |
| MPG03008 | 已存在相同的商店訂單編號 |
| MPG03009 | 交易失敗 |

### 交易查詢錯誤碼

| 錯誤碼 | 說明 |
|--------|------|
| MTQ01001 | 缺少串接必要參數 |
| MTQ01002 | 查無符合商店資料 |
| MTQ01003 | 查詢驗證不通過 |
| MTQ01004 | QueryInfo 參數錯誤 |
| MTQ01005 | 查無訂單資料 |

### 退款錯誤碼

| 錯誤碼 | 說明 |
|--------|------|
| MTR01001 | 缺少串接必要參數 |
| MTR01002 | 查無符合商店資料 |
| MTR01003 | 查詢驗證不通過 |
| MTR01004 | RefundInfo 參數錯誤 |
| MTR01011 | 退款金額錯誤 |
| MTR01014 | 查無符合訂單資料 |
| MTR01015 | 訂單狀態不為已付款狀態 |
| MTR01016 | 退款金額超過可退款金額 |
| MTR01021 | 訂單退款失敗 |

---

## 測試環境

| 項目 | 值 |
|------|------|
| API 網址 | `https://cpayment.ezpay.com.tw` |
| 測試卡號 | `4000-22XX-XXXX-XXXX`（前六嗎 `4000-22`，任意補足 16 碼）|
| CVV | 任意 3 碼 |
| 有效期限 | 任意未來月份 |
| ALIPAY | 測試環境直接模擬成功 |
| WECHAT | 測試環境模擬二維碼，30 秒後自動完成 |

---

## 上線前檢測表

- [ ] AES 加密正確（block size = 32，非 16）
- [ ] SHA256 格式正確（`HashKey=` + hex + `&HashIV=`）
- [ ] NotifyURL 正確回應 `SUCCESS`
- [ ] Webhook 有防重送機制（冪等性）
- [ ] 每筆 MerchantOrderNo 唯一
- [ ] 付款結果以 NotifyURL 為準（非 ReturnURL）
- [ ] 切換正式環境 URL 和憑證
- [ ] 所有 Callback URL 使用 HTTPS

---

## 檔案結構

```
ezpay-payment-skill/
├── SKILL.md                          # 本檔案（快速參考）
├── guides/
│   ├── 00-onboarding.md              # 快速開始
│   ├── 01-encryption-deepdive.md    # 加密演算法深度解析
│   ├── 02-backend-quickstart.md      # 後端快速入門
│   ├── 03-express-reference.md       # Express.js 完整實作
│   ├── 04-fastapi-reference.md       # FastAPI 完整實作
│   ├── 05-webhook-idempotency.md     # ⚠️ Webhook 冪等性（必讀）
│   ├── 06-test-dashboard.md          # 測試指南
│   ├── 07-prod-readonly.md           # 正式環境探針
│   └── 10-refund-safety.md           # 退款安全機制
├── references/
│   ├── API_E_wallet_ezPay_1.0.2.pdf           # 電子支付平台（主要）
│   ├── API_Cross_Trans_ezPay_1.0.1.pdf         # 跨境交易
│   ├── API_Cross_Trans_refund_ezPay_1.0.3.pdf  # 跨境退款
│   ├── API_Cross_Trans_search_ezPay_1.0.1.pdf  # 跨境查詢
│   └── API_Trans_ezPay_1.0.0.pdf               # 交易狀態查詢
├── templates/
│   ├── telegram-bot/                 # Telegram 通知機器人
│   └── discord-bot/                  # Discord 通知機器人
├── .github/
│   └── workflows/ci.yaml             # CI 驗證
└── assets/                           # 素材
```

---

> **文件版本：** 1.1.0  
> **更新日期：** 2026-04-12  
> **依據官方文件：** ezPay_1.0.2、ezPay_1.0.1（跨境）、ezPay_1.0.3（退款）

# 手機條碼 / 捐贈碼驗證 API

> 在開立發票前驗證消費者提供的載具是否有效。

---

## 共同特徵

這兩個 API 與一般發票 API 有以下差異：

1. **Result 是加密內容**：平台回傳的 `Result` 也是 AES 加密後的 hex 字串，需要自行解密
2. **多了 `CheckValue` 欄位**：最外層除了 `MerchantID_`、`PostData_` 外，還多了 `Version` 與 `CheckValue`

### CheckValue 計算方式

```
raw = "HashKey=" + HashKey + "&" + PostData_ + "&HashIV=" + HashIV
CheckValue = SHA256(raw).toUpperCase()
```

---

## 1. 手機條碼驗證（checkBarCode）

| 項目 | 內容 |
|:-----|:-----|
| 正式 URL | `POST https://inv.ezpay.com.tw/Api_inv_application/checkBarCode` |
| 測試 URL | `POST https://cinv.ezpay.com.tw/Api_inv_application/checkBarCode` |

### 最外層（Form Post）

| 欄位 | 必填 | 說明 |
|------|------|------|
| `MerchantID_` | Y | ezPay 商店代號 |
| `Version` | Y | 固定 `1.0` |
| `RespondType` | Y | `JSON` / `String` |
| `PostData_` | Y | AES-256-CBC 加密後 hex 字串 |
| `CheckValue` | Y | `SHA256(HashKey={key}&{PostData_}&HashIV={iv})` 大寫 |

### PostData_ 內（AES 加密）

| 欄位 | 必填 | 說明 |
|------|------|------|
| `TimeStamp` | Y | Unix 時間戳 |
| `CellphoneBarcode` | Y | 手機條碼（`/` 開頭 + 7 碼，共 8 碼）|

### 手機條碼格式

- 第 1 碼必為 `/`
- 後 7 碼僅可用：`0-9`、`A-Z`、`+`、`-`、`.`（共 39 個字元）
- 限大寫英字

### Result 解密後欄位

| 欄位 | 說明 |
|------|------|
| `CellphoneBarcode` | 驗證的手機條碼 |
| `IsExist` | `Y`=存在於財政部；`N`=不存在 |

---

## 2. 捐贈碼驗證（checkLoveCode）

| 項目 | 內容 |
|:-----|:-----|
| 正式 URL | `POST https://inv.ezpay.com.tw/Api_inv_application/checkLoveCode` |
| 測試 URL | `POST https://cinv.ezpay.com.tw/Api_inv_application/checkLoveCode` |

### 最外層（Form Post）

| 欄位 | 必填 | 說明 |
|------|------|------|
| `MerchantID_` | Y | ezPay 商店代號 |
| `Version` | Y | 固定 `1.0` |
| `RespondType` | Y | `JSON` / `String` |
| `PostData_` | Y | AES-256-CBC 加密後 hex 字串 |
| `CheckValue` | Y | `SHA256(HashKey={key}&{PostData_}&HashIV={iv})` 大寫 |

### PostData_ 內（AES 加密）

| 欄位 | 必填 | 說明 |
|------|------|------|
| `TimeStamp` | Y | Unix 時間戳 |
| `LoveCode` | Y | 捐贈碼（3~7 碼純數字）|

### Result 解密後欄位

| 欄位 | 說明 |
|------|------|
| `Lovecode` | 驗證的捐贈碼 |
| `IsExist` | `Y`=存在；`N`=不存在 |

---

## 實務建議

- 建議在消費者輸入載具後，**即時驗證格式**（前端 JS 正規表達式），再呼叫 API 向平台確認
- 若 `IsExist=N`，代表該載具無效，不可使用於開立發票

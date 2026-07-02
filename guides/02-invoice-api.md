# 開立發票 API（核心）

> 開立 B2C / B2B 電子發票。即時開立、預約開立、待觸發三種模式。

---

## 基本資訊

| 項目 | 內容 |
|:-----|:-----|
| Content-Type | `application/x-www-form-urlencoded` |
| 正式 URL | `POST https://inv.ezpay.com.tw/Api/invoice_issue` |
| 測試 URL | `POST https://cinv.ezpay.com.tw/Api/invoice_issue` |
| Version | `1.5`（支援 `TaxType=9` 混合稅率）|

---

## 欄位定義

### 最外層（Form Post）

| 欄位 | 必填 | 說明 |
|------|------|------|
| `MerchantID_` | Y | ezPay 商店代號（注意末碼底線 `_`）|
| `PostData_` | Y | AES-256-CBC + Hex + PKCS7(32-byte) 加密後 hex 字串 |

### PostData_ 內（請求，AES 加密）

| 欄位 | 必填 | 說明 |
|------|------|------|
| `RespondType` | Y | `JSON` / `String` |
| `Version` | Y | 固定 `1.5` |
| `TimeStamp` | Y | Unix 時間戳（秒）|
| `TransNum` | N | 對應金流交易序號（未串金流留空）|
| `MerchantOrderNo` | Y | 自訂編號（限英、數字、`_`；同商店不可重複）|
| `Status` | Y | `1`=即時開立、`0`=待觸發、`3`=預約自動開立 |
| `CreateStatusTime` | C | 預計開立日期（`Status=3` 時必填，格式 `YYYY-MM-DD`）|
| `Category` | Y | `B2C` 或 `B2B` |
| `BuyerName` | Y | 買受人名稱（B2C 限 30 字、B2B 建議 60 字）|
| `BuyerUBN` | C | 買受人統編（B2B 必填，8 碼純數字）|
| `BuyerAddress` | N | 買受人地址 |
| `BuyerEmail` | N | 買受人 Email |
| `CarrierType` | N | `0`=手機條碼、`1`=自然人憑證、`2`=ezPay 載具；B2B 不可用 |
| `CarrierNum` | C | 載具編號（`CarrierType` 有值時必填；需 `rawurlencode`）|
| `LoveCode` | N | 捐贈碼（3~7 碼純數字；與 `CarrierType` 互斥）|
| `PrintFlag` | Y | `Y`=索取紙本、`N`=不索取（B2C 若無載具/捐贈則必填 `Y`）|
| `TaxType` | Y | `1`=應稅、`2`=零稅率、`3`=免稅、`9`=混合（僅 B2C）|
| `TaxRate` | Y | 稅率（`5` 或 `0`）|
| `CustomsClearance` | C | `TaxType=2` 時必填：`1` 非經海關、`2` 經海關 |
| `Amt` | Y | 銷售額合計（**未稅**）|
| `AmtSales` | C | 應稅銷售額（`TaxType=9` 時必填）|
| `AmtZero` | C | 零稅率銷售額（`TaxType=9` 時必填）|
| `AmtFree` | C | 免稅銷售額（`TaxType=9` 時必填）|
| `TaxAmt` | Y | 稅額 |
| `TotalAmt` | Y | 發票金額（`= Amt + TaxAmt`）|
| `ItemName` | Y | 商品名稱（多項以 `|` 分隔）|
| `ItemCount` | Y | 商品數量（多項 `|` 分隔）|
| `ItemUnit` | Y | 商品單位（中 2 字或英數 6 字）|
| `ItemPrice` | Y | 商品單價（**B2C 含稅；B2B 未稅**）|
| `ItemAmt` | Y | 商品小計（**B2C 含稅；B2B 未稅**）|
| `ItemTaxType` | C | 商品課稅別（`TaxType=9` 時必填，多項 `|` 分隔）|
| `Comment` | N | 備註（最多 200 字）|

---

## 回應

| 欄位 | 說明 |
|------|------|
| `Status` | `SUCCESS` 或錯誤代碼 |
| `Message` | 回傳訊息 |
| `Result` | 含 `InvoiceNumber`（即時開立）、`InvoiceTransNo`、`RandomNum`、`CheckCode`、`BarCode`、`QRcodeL/R` |

---

## B2C / B2B 差異

| 欄位 | B2C | B2B |
|------|-----|-----|
| `Category` | `B2C` | `B2B` |
| `BuyerUBN` | 留空 | **必填**（8 碼）|
| `PrintFlag` | `N`（有載具/捐贈時）| **強制 `Y`** |
| `CarrierType` / `LoveCode` | 可用 | **不可用** |
| `TaxType=9` | 可用 | **不可用** |
| `ItemPrice` / `ItemAmt` | **含稅** | **未稅** |
| `Amt` | 未稅 | 未稅 |

> ⚠️ `Amt` 在 B2C 與 B2B 都是**未稅**，但 `ItemPrice`/`ItemAmt` B2C 是**含稅**、B2B 是**未稅**。這個不對稱最易踩坑。

---

## 常見錯誤代碼

| 代碼 | 說明 | 解決 |
|------|------|------|
| `KEY10002` | 資料解密錯誤 | 確認 HashKey 32 碼、HashIV 16 碼、PKCS7 32-byte |
| `KEY10011` | PostData_ 欄位空白 | 確認最外層為 `MerchantID_` / `PostData_`（有底線）|
| `INV10003` | 商品資訊格式錯誤 | 檢查 ItemName/ItemCount/ItemPrice/ItemAmt 以 `|` 分隔正確 |
| `INV10004` | 商品小計計算錯誤 | 確認 `ItemAmt = ItemCount × ItemPrice` |
| `INV10012` | 發票金額驗證錯誤 | 確認 `Amt + TaxAmt = TotalAmt` |
| `INV10014` | 自訂編號格式錯誤 | `MerchantOrderNo` 限英、數字、底線 `_` |
| `INV10017` | 不支援混合稅率 | `Version` 須為 `1.5` 才支援 `TaxType=9` |
| `LIB10003` | 自訂編號重覆 | 使用 UUID 或時間戳確保唯一 |
| `INV20001` | 查無可用字軌 | 至後台新增字軌 |
| `INV90006` | 可開立張數已用罄 | 至後台購買額度 |

---

## 加密規格

- **AES-256-CBC**，Key = HashKey（32 bytes），IV = HashIV（16 bytes）
- **PKCS7，block size = 32**（非標準 16）
- **輸出：小寫 Hex**
- **SHA256 CheckCode**：取 `InvoiceTransNo`、`MerchantID`、`MerchantOrderNo`、`RandomNum`、`TotalAmt` 五欄，依 A→Z 排序，前後加上 `HashIV=` 與 `HashKey=`，SHA256 後大寫

---

## 請求範例

**最外層：**
```
MerchantID_=3622183&PostData_=70a61189d7dc0f6abefe7643da144af5...（hex）
```

**PostData_ 明文（B2C）：**
```
RespondType=JSON&Version=1.5&TimeStamp=1444963784&MerchantOrderNo=INV20260507001&Status=1&Category=B2C&BuyerName=王小明&BuyerEmail=test@example.com&PrintFlag=N&CarrierType=2&CarrierNum=%2FABC1234&TaxType=1&TaxRate=5&Amt=952&TaxAmt=48&TotalAmt=1000&ItemName=網站開發服務&ItemCount=1&ItemUnit=式&ItemPrice=1000&ItemAmt=1000
```

**成功回應：**
```json
{
    "Status": "SUCCESS",
    "Message": "電子發票開立成功",
    "Result": "{\"InvoiceNumber\":\"DS12223139\",\"InvoiceTransNo\":\"15110317583641325\",\"RandomNum\":\"4253\",\"CreateTime\":\"2026-05-07 10:00:00\",\"CheckCode\":\"00E108DF7DE8756AF003312206DA77A4...\"}"
}
```

---

## Idempotent 特性

同一筆 `PostData_` 完全相同時，平台會回傳 `SUCCESS` 並重送原本結果，**不會產生多張發票**。

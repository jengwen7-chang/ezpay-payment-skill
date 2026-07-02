# Test Vectors

本目錄用來放 ezPay 串接的跨語言驗證向量：

- AES-256-CBC + PKCS7(block=32) + hex（小寫）
- SHA256 CheckCode：`HashKey={key}&{AES_hex}&HashIV={iv}`（大寫）
- 以官方 PDF 規格為準，不使用 SDK 猜測

## 檔案說明

| 檔案 | 內容 |
|------|------|
| `aes-encryption.json` | 金流 AES 加解密向量 |
| `invoice-barcode.json` | 發票 `checkBarCode` 測試請求樣本 |
| **`invoice-vectors.json`** | **發票全 API 加解密標準答案（AES / SHA256 / CheckValue）** |
| `verify-node.js` | Node.js 驗證腳本 |
| `verify.py` | Python 驗證腳本 |

## 使用方式

```bash
# Python
python verify.py

# Node.js
node verify-node.js
```

## 自行驗證方式

讀取 `invoice-vectors.json`，取出 `key`、`iv`、`plaintext`（AES）或 `raw_string`（SHA256），
用你的程式計算後比對 `expected_hex` / `expected_signature`（完全相符才正確）。

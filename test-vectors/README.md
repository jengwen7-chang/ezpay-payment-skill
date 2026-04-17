# Test Vectors

本目錄用來放 ezPay 串接的跨語言驗證向量：

- AES-256-CBC + PKCS7 + hex
- SHA256 `HashKey={key}&{AES_hex}&HashIV={iv}`（uppercase）
- 以官方 PDF 規格為準，不使用 SDK 猜測

目前提供：
- `aes-encryption.json`：AES 加密/解密向量
- `invoice-barcode.json`：Invoice `checkBarCode` 測試請求樣本
- `verify-node.js`：Node.js 驗證腳本
- `verify.py`：Python 驗證腳本

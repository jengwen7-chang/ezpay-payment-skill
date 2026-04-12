# 加密演算法深度解析

> 基於官方文件（API_E_wallet_ezPay_1.0.2、API_Cross_Trans_ezPay_1.0.1）交叉確認  
> ⚠️ **ezPay 的 block size = 32，與一般 AES 標準不同！**

## 演算法對照

| 項目 | 一般 AES 標準 | ezPay（官方確認）|
|------|------------|----------------|
| 演算法 | AES-256 | MCRYPT_RIJNDAEL_128（實際金鑰 32 bytes = AES-256）|
| Mode | CBC | CBC |
| Block size | **16 bytes** | **32 bytes** ⚠️ |
| Padding | PKCS7 | PKCS5/PKCS7（手動實作）|
| 輸出格式 | 通常 base64 | **hex**（bin2hex）|
| 參數格式 | JSON 或 URL-encoded | **http_build_query（URL-encoded）** |
| SHA256 格式 | 各家不同 | **`HashKey=` + key + `&` + AES_hex + `&HashIV=` + iv`** |

---

## 完整加密流程（官方 PHP 範例對照）

```php
// 官方文件中的 addpadding 函數（block size = 32）
function addpadding($string, $blocksize = 32) {
    $len = strlen($string);
    $pad = $blocksize - ($len % $blocksize);
    return $string . str_repeat(chr($pad), $pad);
}

// 官方文件的 AES 加密
$encrypted = bin2hex(
    mcrypt_encrypt(
        MCRYPT_RIJNDAEL_128,  // 實際是 AES-256（金鑰 32 bytes）
        $key,                 // HashKey
        addpadding($plaintext),
        MCRYPT_MODE_CBC,
        $iv                   // HashIV
    )
);

// 官方文件的 SHA256 簽章
$ TradeSha = strtoupper(
    hash('sha256', 'HashKey=' . $key . '&' . $encrypted . '&HashIV=' . $iv)
);
```

---

## SHA256 簽章格式（官方）

```
明文 = "HashKey={HashKey}&{AES_hex_string}&HashIV={HashIV}"
TradeSha = SHA256(明文).toUpperCase()
```

### 容易犯的錯誤

| 錯誤 | 正確 |
|------|------|
| `SHA256(key + TradeInfo + iv)` | `SHA256("HashKey=" + key + "&" + TradeInfo + "&HashIV=" + iv)` |
| 忘記 `HashKey=` 和 `&HashIV=` 前綴 | 兩個都要加 |
| 用 hex decode 後的 binary 拼接 | 直接用 hex 字串拼接 |

---

## Python 實作（推薦）

```python
import hashlib
from Crypto.Cipher import AES
from Crypto.Util.Padding import pad, unpad

def aes_encrypt(plaintext: str, hash_key: str, hash_iv: str) -> str:
    """AES-256-CBC + PKCS7（block size 32） + hex output"""
    key_bytes = hash_key.encode('utf-8')   # 32 bytes
    iv_bytes = hash_iv.encode('utf-8')     # 16 bytes
    # Block size = 32（ezPay 特殊設計）
    padded = pad(plaintext.encode('utf-8'), 32, style='pkcs7')
    cipher = AES.new(key_bytes, AES.MODE_CBC, iv_bytes)
    return cipher.encrypt(padded).hex()

def aes_decrypt(encrypted_hex: str, hash_key: str, hash_iv: str) -> str:
    """AES-256-CBC 解密"""
    key_bytes = hash_key.encode('utf-8')
    iv_bytes = hash_iv.encode('utf-8')
    decipher = AES.new(key_bytes, AES.MODE_CBC, iv_bytes)
    decrypted = decipher.decrypt(bytes.fromhex(encrypted_hex))
    return unpad(decrypted, 32, style='pkcs7').decode('utf-8')

def sha256_encrypt(aes_hex_str: str, hash_key: str, hash_iv: str) -> str:
    """SHA256(HashKey={key}&{aes_hex}&HashIV={iv}) → uppercase"""
    sha_str = f"HashKey={hash_key}&{aes_hex_str}&HashIV={hash_iv}"
    return hashlib.sha256(sha_str.encode('utf-8')).hexdigest().upper()
```

---

## Node.js 實作（推薦）

```javascript
const crypto = require('crypto');

function aesEncrypt(plaintext, hashKey, hashIV) {
    // Block size = 32（ezPay 特殊設計）
    const blockSize = 32;
    const padding = blockSize - (Buffer.byteLength(plaintext) % blockSize);
    const padded = Buffer.concat([Buffer.from(plaintext), Buffer.alloc(padding, padding)]);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(hashKey), Buffer.from(hashIV));
    return Buffer.concat([cipher.update(padded), cipher.final()]).toString('hex');
}

function aesDecrypt(encryptedHex, hashKey, hashIV) {
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(hashKey), Buffer.from(hashIV));
    const dec = Buffer.concat([decipher.update(Buffer.from(encryptedHex, 'hex')), decipher.final()]);
    const padLen = dec[dec.length - 1];
    return dec.slice(0, dec.length - padLen).toString('utf8');
}

function sha256Encrypt(aesHexStr, hashKey, hashIV) {
    const str = `HashKey=${hashKey}&${aesHexStr}&HashIV=${hashIV}`;
    return crypto.createHash('sha256').update(str).digest('hex').toUpperCase();
}
```

> ⚠️ 這裡手動做 unpad，理論上可能出錯（如果 plaintext 最後 byte 恰好等於 padding byte）。進階用法可用 `decipher.setAutoPadding(false)` 並配合更好的 unpad 邏輯。

---

## PHP 實作（推薦，取代已廢棄的 mcrypt）

```php
// 取代 mcrypt_encrypt（PHP 7.2+ 已移除）
function aes_encrypt($plaintext, $hashKey, $hashIV) {
    $blockSize = 32;
    $len = strlen($plaintext);
    $pad = $blockSize - ($len % $blockSize);
    $padded = $plaintext . str_repeat(chr($pad), $pad);

    // 用 openssl_encrypt 取代 mcrypt_encrypt
    $encrypted = openssl_encrypt(
        $padded,
        'AES-256-CBC',
        $hashKey,
        OPENSSL_RAW_DATA | OPENSSL_NO_PADDING,  // 不自動 padding
        $hashIV
    );
    return bin2hex($encrypted);
}

function sha256_encrypt($aesHexStr, $hashKey, $hashIV) {
    $str = "HashKey={$hashKey}&{$aesHexStr}&HashIV={$hashIV}";
    return strtoupper(hash('sha256', $str));
}
```

---

## 測試向量

### 測試 Key/IV

```
HashKey = 529D00B2F60F4A829CB扣款機制NotifyURL
HashIV = vZ6R0l5GqYfi5K8x
```

### 測試 TradeInfo 明文

```
TimeStamp=1700000000&MerchantID=MS3238228&Version=1.0&MerchantOrderNo=TEST001&Amt=1000&ItemDesc=test&Email=test@example.com
```

### 正確輸出（hex + SHA256 簽章）

```
# AES 加密 → hex string
# SHA256(HashKey={key}&{hex}&HashIV={iv}) → uppercase
```

---

## 地雷總整理

1. **Block size = 32**：不是 16，是 ezPay 特殊設計
2. **輸出是 hex**：不是 base64
3. **SHA256 要加前綴後綴**：`HashKey=` 和 `&HashIV=`
4. **不要用 ksort**：ezPay 的 http_build_query **不需要** ksort（跟 NewebPay 不同）
5. **mcrypt 已廢棄**：PHP 7.2+ 請用 `openssl_encrypt`

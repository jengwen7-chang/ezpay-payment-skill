# Express.js 完整實作

## 模組相依

```bash
npm install express body-parser crypto axios dotenv
```

## newebpay.js（加密模組）

```javascript
const crypto = require('crypto');

const MERCHANT_ID = process.env.EZPAY_MERCHANT_ID;
const HASH_KEY = process.env.EZPAY_HASH_KEY;
const HASH_IV = process.env.EZPAY_HASH_IV;
const API_URL = process.env.EZPAY_PRODUCTION === 'true'
    ? 'https://payment.ezpay.com.tw'
    : 'https://cpayment.ezpay.com.tw';

function aesEncrypt(plaintext) {
    const blockSize = 32;  // ezPay 特殊設計
    const padding = blockSize - (Buffer.byteLength(plaintext) % blockSize);
    const padded = Buffer.concat([Buffer.from(plaintext), Buffer.alloc(padding, padding)]);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(HASH_KEY), Buffer.from(HASH_IV));
    return Buffer.concat([cipher.update(padded), cipher.final()]).toString('hex');
}

function aesDecrypt(encryptedHex) {
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(HASH_KEY), Buffer.from(HASH_IV));
    const dec = Buffer.concat([
        decipher.update(Buffer.from(encryptedHex, 'hex')),
        decipher.final()
    ]);
    const padLen = dec[dec.length - 1];
    return dec.slice(0, dec.length - padLen).toString('utf8');
}

function sha256Encrypt(aesHexStr) {
    return crypto.createHash('sha256')
        .update(`HashKey=${HASH_KEY}&${aesHexStr}&HashIV=${HASH_IV}`)
        .digest('hex').toUpperCase();
}

function createOrder(params) {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const trade = {
        TimeStamp: timestamp,
        MerchantID: MERCHANT_ID,
        Version: '1.0',
        MerchantOrderNo: params.MerchantOrderNo,
        Amt: params.Amt,
        ItemDesc: params.ItemDesc,
        ReturnURL: params.ReturnURL || '',
        ClientBackURL: params.ClientBackURL || '',
        NotifyURL: params.NotifyURL || '',
        Email: params.Email || '',
        Phone: params.Phone || '',
        ...params.extra
    };
    const paramStr = Object.entries(trade).map(([k, v]) => `${k}=${v}`).join('&');
    const TradeInfo = aesEncrypt(paramStr);
    const TradeSha = sha256Encrypt(TradeInfo);
    return { trade, TradeInfo, TradeSha };
}

function decryptResponse(TradeInfo) {
    return querystring.parse(aesDecrypt(TradeInfo));
}

function verifySha256(TradeInfo, TradeSha) {
    return sha256Encrypt(TradeInfo) === TradeSha;
}

module.exports = { createOrder, decryptResponse, verifySha256, MERCHANT_ID, API_URL };
```

## app.js

```javascript
const express = require('express');
const bodyParser = require('body-parser');
const querystring = require('querystring');
const axios = require('axios');
const newebpay = require('./newebpay');

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// -----------------
// 建立訂單
// -----------------
app.post('/checkout', (req, res) => {
    const { order_no, amt, item_desc, email } = req.body;
    const result = newebpay.createOrder({
        MerchantOrderNo: order_no,
        Amt: amt,
        ItemDesc: item_desc,
        Email: email,
        NotifyURL: `${BASE_URL}/notify`,
        ReturnURL: `${BASE_URL}/return`,
    });

    const postData = {
        MerchantID: newebpay.MERCHANT_ID,
        Version: '1.0',
        TimeStamp: result.trade.TimeStamp,
        MerchantOrderNo: order_no,
        Amt: amt,
        ItemDesc: item_desc,
        TradeInfo: result.TradeInfo,
        TradeSha: result.TradeSha,
    };

    const formInputs = Object.entries(postData)
        .map(([k, v]) => `<input name="${k}" value="${v}">`).join('\n');

    res.send(`<!DOCTYPE html>
<html><body onload="document.f.submit()">
<form name="f" action="${newebpay.API_URL}/MPG/mpg_gateway" method="POST">
${formInputs}<button>Pay</button></form></body></html>`);
});

// -----------------
// NotifyURL（Webhook）
// -----------------
app.post('/notify', (req, res) => {
    const { TradeInfo, TradeSha } = req.body;

    // 1. 立刻回應 SUCCESS
    res.send('SUCCESS');

    // 2. 背景處理（避免超時）
    process.nextTick(async () => {
        if (!newebpay.verifySha256(TradeInfo, TradeSha)) {
            console.error('[FAIL] SHA256 驗證失敗');
            return;
        }
        const result = newebpay.decryptResponse(TradeInfo);
        if (result.Status === 'SUCCESS') {
            await db.query(
                'UPDATE orders SET status=? WHERE merchant_order_no=?',
                ['PAID', result.MerchantOrderNo]
            );
        }
    });
});

// -----------------
// ReturnURL（消費者回傳頁面）
// -----------------
app.get('/return', (req, res) => {
    // 注意：真正的付款結果要以 NotifyURL 為準
    res.redirect('/order/complete');
});

// -----------------
// 查詢訂單
// -----------------
app.post('/query', async (req, res) => {
    const { TradeNo, MerchantOrderNo } = req.body;
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const queryData = {
        TimeStamp: timestamp,
        MerchantID: newebpay.MERCHANT_ID,
        Version: '1.0',
        TradeNo: TradeNo || '',
        MerchantOrderNo: MerchantOrderNo || '',
    };
    const paramStr = Object.entries(queryData).map(([k,v]) => `${k}=${v}`).join('&');
    const QueryInfo = newebpay.createOrder({ ...queryData, MerchantOrderNo: queryData.MerchantOrderNo || `Q${timestamp}` }).TradeInfo;
    // 這裡直接用同一套加密（QueryInfo 也是 AES + SHA256）
    const QuerySha = newebpay.sha256Encrypt(QueryInfo);

    const response = await axios.post(
        `${newebpay.API_URL}/API/merchant_trade/query_trade_info`,
        new URLSearchParams({
            MerchantID: newebpay.MERCHANT_ID,
            Version: '1.0',
            QueryInfo,
            QuerySha,
        })
    );
    res.json(response.data);
});

app.listen(3000, () => console.log('Server on :3000'));
```

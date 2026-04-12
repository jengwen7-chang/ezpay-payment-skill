/**
 * ezPay Telegram 通知機器人
 *
 * 功能：
 * 1. 付款成功後自動推播到管理群組
 * 2. 管理員查詢訂單狀態
 *
 * 安裝：npm install node-telegram-bot-api dotenv
 */

const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const token = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

const MERCHANT_ID = process.env.EZPAY_MERCHANT_ID;
const HASH_KEY = process.env.EZPAY_HASH_KEY;
const HASH_IV = process.env.EZPAY_HASH_IV;
const API_URL = process.env.EZPAY_PRODUCTION === 'true'
    ? 'https://payment.ezpay.com.tw'
    : 'https://cpayment.ezpay.com.tw';

// ---------------
// 加密工具
// ---------------
const crypto = require('crypto');

function aesEncrypt(plaintext) {
    const blockSize = 32;
    const padding = blockSize - (Buffer.byteLength(plaintext) % blockSize);
    const padded = Buffer.concat([Buffer.from(plaintext), Buffer.alloc(padding, padding)]);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(HASH_KEY), Buffer.from(HASH_IV));
    return Buffer.concat([cipher.update(padded), cipher.final()]).toString('hex');
}

function sha256Encrypt(aesHexStr) {
    return crypto.createHash('sha256')
        .update(`HashKey=${HASH_KEY}&${aesHexStr}&HashIV=${HASH_IV}`)
        .digest('hex').toUpperCase();
}

function queryOrder(MerchantOrderNo) {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const data = {
        TimeStamp: timestamp,
        MerchantID: MERCHANT_ID,
        Version: '1.0',
        TradeNo: '',
        MerchantOrderNo,
    };
    const paramStr = Object.entries(data).map(([k, v]) => `${k}=${v}`).join('&');
    const QueryInfo = aesEncrypt(paramStr);
    const QuerySha = sha256Encrypt(QueryInfo);

    return axios.post(
        `${API_URL}/API/merchant_trade/query_trade_info`,
        new URLSearchParams({
            MerchantID: MERCHANT_ID,
            Version: '1.0',
            QueryInfo,
            QuerySha,
        })
    );
}

// ---------------
// 訂單查詢
// ---------------
bot.onText(/\/order (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const orderNo = match[1];

    try {
        const resp = await queryOrder(orderNo);
        const result = resp.data;

        if (result.Status !== 'SUCCESS') {
            bot.sendMessage(chatId, `❌ 查詢失敗：${result.Message}`);
            return;
        }

        const r = result.Result;
        const statusMap = { '1': '✅ 付款成功', '2': '⏳ 未付款', '4': '❌ 交易失敗' };
        const text =
            `📋 訂單查詢\n` +
            `─────────────────\n` +
            `訂單編號：${r.MerchantOrderNo}\n` +
            `交易序號：${r.TradeNo}\n` +
            `付款方式：${r.PaymentType}\n` +
            `交易金額：${r.Amt} 元\n` +
            `付款狀態：${statusMap[r.PaymentStatus] || r.PaymentStatus}\n` +
            `付款時間：${r.PayTime || '-'}\n`;

        bot.sendMessage(chatId, text);
    } catch (e) {
        bot.sendMessage(chatId, `❌ 查詢錯誤：${e.message}`);
    }
});

// ---------------
// 管理者退款（需開啟 bot 私人聊天室）
// ---------------
const ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID;

bot.onText(/\/refund (.+) (.+)/, async (msg, match) => {
    const orderNo = match[1];
    const amt = parseInt(match[2]);

    if (msg.chat.id.toString() !== ADMIN_CHAT_ID) {
        bot.sendMessage(msg.chat.id, '❌ 僅限管理員操作');
        return;
    }

    try {
        const resp = await queryOrder(orderNo);
        const r = resp.data?.Result;
        if (!r || r.PaymentStatus !== '1') {
            bot.sendMessage(msg.chat.id, '❌ 訂單未付款或不存在');
            return;
        }

        const timestamp = Math.floor(Date.now() / 1000).toString();
        const refundData = {
            TimeStamp: timestamp,
            MerchantID: MERCHANT_ID,
            Version: '2.1',
            TradeNo: r.TradeNo,
            MerchantOrderNo: orderNo,
            RefundAmt: amt,
            RefundType: '1',
            Currency: 'TWD',
        };
        const paramStr = Object.entries(refundData).map(([k, v]) => `${k}=${v}`).join('&');
        const RefundInfo = aesEncrypt(paramStr);
        const RefundSha = sha256Encrypt(RefundInfo);

        const refundResp = await axios.post(
            `${API_URL}/API/merchant_trade/trade_refund`,
            new URLSearchParams({
                MerchantID: MERCHANT_ID,
                Version: '2.1',
                RefundInfo,
                RefundSha,
            })
        );

        const result = refundResp.data;
        bot.sendMessage(msg.chat.id,
            result.Status === 'SUCCESS'
                ? `✅ 退款成功：${orderNo}，金額 ${amt} 元`
                : `❌ 退款失敗：${result.Message}`
        );
    } catch (e) {
        bot.sendMessage(msg.chat.id, `❌ 退款錯誤：${e.message}`);
    }
});

// ---------------
// 通知鈕
// ---------------
const confirmRefundKeyboard = (orderNo, amt) => ({
    inline_keyboard: [[
        { text: '✅ 確認退款', callback_data: `refund_confirm:${orderNo}:${amt}` },
        { text: '❌ 取消', callback_data: `refund_cancel:${orderNo}` },
    ]]
});

bot.on('callback_query', async (query) => {
    const [action, orderNo, amt] = query.data.split(':');
    const chatId = query.message.chat.id;

    if (query.from.id.toString() !== ADMIN_CHAT_ID) {
        bot.answerCallbackQuery(query.id, { text: '❌ 僅限管理員' });
        return;
    }

    if (action === 'refund_confirm') {
        bot.answerCallbackQuery(query.id, { text: '✅ 執行退款中...' });
        // 執行退款...
    } else {
        bot.answerCallbackQuery(query.id, { text: '已取消' });
        bot.editMessageReplyMarkup({ inline_keyboard: [] }, { chatId, messageId: query.message.message_id });
    }
});

console.log('✅ ezPay Telegram Bot 已啟動');

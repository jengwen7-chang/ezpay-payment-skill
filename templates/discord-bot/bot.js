/**
 * ezPay Discord 通知機器人
 *
 * 功能：
 * 1. 付款成功後自動推播到指定頻道
 * 2. /order 指令查詢訂單狀態
 * 3. /refund 指令（管理員）處理退款
 *
 * 安裝：npm install discord.js axios dotenv
 * 設定：在 Discord Developer Portal 建立 Application 並取得 BOT_TOKEN
 */

require('dotenv').config();
const { Client, GatewayIntentBits, Routes, SlashCommandBuilder, REST } = require('discord.js');
const axios = require('axios');
const crypto = require('crypto');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const DISCORD_ADMIN_ROLE_ID = process.env.DISCORD_ADMIN_ROLE_ID;
const DISCORD_LOG_CHANNEL_ID = process.env.DISCORD_LOG_CHANNEL_ID;

const MERCHANT_ID = process.env.EZPAY_MERCHANT_ID;
const HASH_KEY = process.env.EZPAY_HASH_KEY;
const HASH_IV = process.env.EZPAY_HASH_IV;
const API_URL = process.env.EZPAY_PRODUCTION === 'true'
    ? 'https://payment.ezpay.com.tw'
    : 'https://cpayment.ezpay.com.tw';

// ---------------
// 加密工具
// ---------------
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
// 啟動
// ---------------
client.once('ready', async () => {
    console.log(`✅ Discord Bot 已登入：${client.user.tag}`);

    // 註冊 Slash Commands
    const commands = [
        new SlashCommandBuilder()
            .setName('order')
            .setDescription('查詢 ezPay 訂單狀態')
            .addStringOption(opt => opt.setName('merchant_order_no').setDescription('商店訂單編號').setRequired(true))
            .toJSON(),
        new SlashCommandBuilder()
            .setName('refund')
            .setDescription('退款（僅管理員）')
            .addStringOption(opt => opt.setName('merchant_order_no').setDescription('商店訂單編號').setRequired(true))
            .addIntegerOption(opt => opt.setName('amount').setDescription('退款金額').setRequired(true))
            .toJSON(),
    ];

    const rest = new REST({ version: '10' }).setToken(DISCORD_BOT_TOKEN);
    await rest.put(Routes.applicationCommands(DISCORD_CLIENT_ID), { body: commands });
    console.log('✅ Slash Commands 已註冊');
});

// ---------------
// 指令處理
// ---------------
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) return;

    const { commandName, options, member } = interaction;
    const isAdmin = member.roles?.cache?.has(DISCORD_ADMIN_ROLE_ID);

    // ---------------
    // /order 查詢
    // ---------------
    if (commandName === 'order') {
        const orderNo = options.getString('merchant_order_no');
        await interaction.deferReply();

        try {
            const resp = await queryOrder(orderNo);
            const result = resp.data;

            if (result.Status !== 'SUCCESS') {
                await interaction.editReply(`❌ 查詢失敗：${result.Message}`);
                return;
            }

            const r = result.Result;
            const statusMap = { '1': '✅ 付款成功', '2': '⏳ 未付款', '4': '❌ 交易失敗' };
            const embed = {
                title: `📋 訂單查詢：${orderNo}`,
                color: r.PaymentStatus === '1' ? 0x00ff00 : 0xffcc00,
                fields: [
                    { name: '交易序號', value: r.TradeNo || '-', inline: true },
                    { name: '付款方式', value: r.PaymentType || '-', inline: true },
                    { name: '交易金額', value: `${r.Amt} 元`, inline: true },
                    { name: '付款狀態', value: statusMap[r.PaymentStatus] || r.PaymentStatus, inline: true },
                    { name: '付款時間', value: r.PayTime || '-', inline: true },
                ],
                timestamp: new Date().toISOString(),
            };

            await interaction.editReply({ embeds: [embed] });
        } catch (e) {
            await interaction.editReply(`❌ 查詢錯誤：${e.message}`);
        }
    }

    // ---------------
    // /refund 退款（管理員）
    // ---------------
    if (commandName === 'refund') {
        if (!isAdmin) {
            await interaction.reply({ content: '❌ 此指令僅限管理員使用', ephemeral: true });
            return;
        }

        const orderNo = options.getString('merchant_order_no');
        const amt = options.getInteger('amount');

        await interaction.deferReply();

        try {
            // 先查詢訂單確認狀態
            const resp = await queryOrder(orderNo);
            const r = resp.data?.Result;

            if (!r || r.PaymentStatus !== '1') {
                await interaction.editReply('❌ 訂單未付款或不存在');
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
            if (result.Status === 'SUCCESS') {
                await interaction.editReply(`✅ 退款成功：${orderNo}，金額 ${amt} 元`);
                // 推播到 log 頻道
                const logChannel = client.channels.cache.get(DISCORD_LOG_CHANNEL_ID);
                if (logChannel) {
                    logChannel.send(`💸 管理員 ${member.user.tag} 退款：${orderNo}，金額 ${amt} 元`);
                }
            } else {
                await interaction.editReply(`❌ 退款失敗：${result.Message}`);
            }
        } catch (e) {
            await interaction.editReply(`❌ 退款錯誤：${e.message}`);
        }
    }
});

client.login(DISCORD_BOT_TOKEN);

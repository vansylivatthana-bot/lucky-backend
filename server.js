const { Telegraf } = require('telegraf');
const { createClient } = require('@supabase/supabase-js');
const express = require('express');

const BOT_TOKEN = '8921585286:AAFJ-jZk1GBoSpJSJwbhuqTG7iqm-aQuxlE';
const SUPABASE_URL = 'https://fsrpcwrhskhnglrmutsz.supabase.co';
const SUPABASE_KEY = 'sb_secret_CGMwhxFtwz39gMzZmVEfgg_gk4BGK4e';

const bot = new Telegraf(BOT_TOKEN);
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const app = express();

app.use(express.json()); // ສຳຄັນ: ຕ້ອງມີເພື່ອໃຫ້ Webhook ຮັບຂໍ້ມູນໄດ້

// --- API endpoints ຕ່າງໆ ---
// (API balance, referral-stats, weekly-stats, tickets - ຄືເກົ່າທຸກຢ່າງ)
app.get('/api/balance/:id', async (req, res) => {
    res.header("Access-Control-Allow-Origin", "*"); 
    const { data } = await supabase.from('users').select('wallet_balance').eq('telegram_id', req.params.id).single();
    res.json({ balance: data ? data.wallet_balance : 0 });
});

// ... (ເພີ່ມ API ອື່ນໆທີ່ເຫຼືອຂອງທ່ານຢູ່ບ່ອນນີ້) ...

// --- ໂຄ້ດ Telegram Bot ---
// (bot.start ແລະ bot.on('web_app_data') ຄືເກົ່າທຸກຢ່າງ)

// --- ຕັ້ງຄ່າ Webhook (ສ່ວນນີ້ຄືທີ່ປ່ຽນແປງ) ---
const PORT = process.env.PORT || 3000;
const WEBHOOK_PATH = '/webhook';
// ປ່ຽນ URL ໃຫ້ກົງກັບ Render App ຂອງທ່ານ
const APP_URL = 'https://lucky-backend-api.onrender.com'; 

app.use(bot.webhookCallback(WEBHOOK_PATH));

app.listen(PORT, async () => {
    console.log(`🌐 Web Server ເປີດຢູ່ທີ່ພອດ ${PORT}`);
    
    // ຕັ້ງຄ່າ Webhook ໃຫ້ Telegram
    await bot.telegram.setWebhook(`${APP_URL}${WEBHOOK_PATH}`);
    console.log(`🔗 Webhook set to ${APP_URL}${WEBHOOK_PATH}`);
});

app.get('/', (req, res) => { res.send('Bot is running with Webhook!'); });

const { Telegraf } = require('telegraf');
const { createClient } = require('@supabase/supabase-js');
const express = require('express'); 

// ໃສ່ລະຫັດຂອງທ່ານບ່ອນນີ້
const BOT_TOKEN = '8921585286:AAFJ-jZk1GBoSpJSJwbhuqTG7iqm-aQuxlE';
const SUPABASE_URL = 'https://fsrpcwrhskhnglrmutsz.supabase.co';
const SUPABASE_KEY = 'sb_secret_CGMwhxFtwz39gMzZmVEfgg_gk4BGK4e';

const bot = new Telegraf(BOT_TOKEN);
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const app = express();

// ອະນຸຍາດໃຫ້ Express ອ່ານຂໍ້ມູນ JSON ໄດ້ (ສຳຄັນສຳລັບ Webhook)
app.use(express.json());

// ==========================================
// --- 1. API ສຳລັບໜ້າແອັບ (Frontend) ---
// ==========================================

// ດຶງຍອດເງິນ
app.get('/api/balance/:id', async (req, res) => {
    res.header("Access-Control-Allow-Origin", "*"); 
    try {
        const { data } = await supabase.from('users').select('wallet_balance').eq('telegram_id', req.params.id).single();
        res.json({ balance: data ? data.wallet_balance : 0 });
    } catch (err) { res.json({ balance: 0 }); }
});

// ດຶງຂໍ້ມູນນາຍໜ້າ (Affiliate)
app.get('/api/referral-stats/:id', async (req, res) => {
    res.header("Access-Control-Allow-Origin", "*");
    try {
        const { count } = await supabase.from('users').select('*', { count: 'exact' }).eq('referrer_id', req.params.id);
        res.json({ friends_count: count || 0 });
    } catch (err) { res.json({ friends_count: 0 }); }
});

// --- API ໃໝ່: ຄິດໄລ່ ແລະ ດຶງມູນຄ່າເງິນລາງວັນປະຈຳອາທິດ ---
app.get('/api/prize-pool', async (req, res) => {
    res.header("Access-Control-Allow-Origin", "*");
    try {
        const localTimeStr = new Date().toLocaleString("en-US", {timeZone: "Asia/Vientiane"});
        const now = new Date(localTimeStr);
        
        const dayOfWeek = now.getDay();
        const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; 
        
        const monday = new Date(now);
        monday.setDate(now.getDate() - diffToMonday);
        const startOfWeekStr = monday.toISOString().split('T')[0];

        // 1. นັນຈຳນວນປີ້ທີ່ຂາຍໄດ້ທັງໝົດໃນອາທິດນີ້
        const { count, error } = await supabase
            .from('tickets')
            .select('*', { count: 'exact', head: true })
            .gte('Date_book', startOfWeekStr);

        if (error) throw error;

        const totalTickets = count || 0;
        const totalSales = totalTickets * 10; // ປີ້ລະ 10 USDT
        
        // 2. ຄິດໄລ່ກອງທຶນລາງວັນ (80% ຂອງຍອດຂາຍ)
        const prizeFund = totalSales * 0.80;

        // 3. ຈັດສັນລາງວັນຕາມໂຄງສ້າງ
        const prize1 = prizeFund * 0.30; // ລາງວັນທີ 1 (1 ລາງວັນ)
        const prize2 = prizeFund * 0.20 / 3; // ລາງວັນທີ 2 (ຫານ 3)
        const prize3 = prizeFund * 0.40 / 23; // ລາງວັນທີ 3 (ຫານ 23)

        res.json({
            total_sales: totalSales,
            prize_fund: prizeFund,
            prize_1: prize1.toFixed(2),
            prize_2: prize2.toFixed(2),
            prize_3: prize3.toFixed(2)
        });
    } catch (err) {
        res.json({ prize_fund: 0, prize_1: "0.00", prize_2: "0.00", prize_3: "0.00" });
    }
});

// ດຶງຈຳນວນປີ້ທີ່ຂາຍໄດ້ທັງໝົດໃນອາທິດນີ້ (Stats ທົ່ວໄປ)
app.get('/api/weekly-stats', async (req, res) => {
    res.header("Access-Control-Allow-Origin", "*");
    try {
        const localTimeStr = new Date().toLocaleString("en-US", {timeZone: "Asia/Vientiane"});
        const now = new Date(localTimeStr);
        
        const dayOfWeek = now.getDay();
        const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; 
        
        const monday = new Date(now);
        monday.setDate(now.getDate() - diffToMonday);
        const startOfWeekStr = monday.toISOString().split('T')[0];

        const { count, error } = await supabase
            .from('tickets')
            .select('*', { count: 'exact', head: true })
            .gte('Date_book', startOfWeekStr);

        res.json({ weekly_count: count || 0 });
    } catch (err) {
        res.json({ weekly_count: 0 });
    }
});

// ດຶງປະຫວັດການຊື້ (ສະເພາະອາທິດນີ້ເທົ່ານັ້ນ)
app.get('/api/tickets/:id', async (req, res) => {
    res.header("Access-Control-Allow-Origin", "*"); 
    try {
        const localTimeStr = new Date().toLocaleString("en-US", {timeZone: "Asia/Vientiane"});
        const now = new Date(localTimeStr);
        const dayOfWeek = now.getDay(); 
        const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; 
        const monday = new Date(now);
        monday.setDate(now.getDate() - diffToMonday);
        const startOfWeekStr = monday.toISOString().split('T')[0];

        const { data, error } = await supabase
            .from('tickets')
            .select('ticket_number')
            .eq('owner_telegram_id', req.params.id)
            .gte('Date_book', startOfWeekStr); 

        if (error) throw error;
        res.json({ tickets: data || [] });
    } catch (err) {
        res.json({ tickets: [] });
    }
});

// ==========================================
// --- 2. ລະບົບ Telegram Bot ຫຼັກ ---
// ==========================================

bot.start(async (ctx) => {
    const telegramId = ctx.from.id.toString();
    const payload = ctx.startPayload; 
    
    const { data: existingUser } = await supabase.from('users').select('telegram_id').eq('telegram_id', telegramId).single();

    if (!existingUser) {
        const userData = { telegram_id: telegramId };
        if (payload && payload !== telegramId) {
            userData.referrer_id = payload;
        }
        await supabase.from('users').insert([userData]);
    }
    
    const appUrl = `https://vansylivatthana-bot.github.io/lucky-number-app/?userid=${telegramId}`;
    const referralLink = `https://t.me/LuckyNumbervip_bot?start=${telegramId}`; 
    const channelLink = `https://t.me/LuckyNumberVIP_Channel`; 

    ctx.reply(`ຍິນດີຕ້ອນຮັບສູ່ Lucky Number VIP! 🎉\n\n📢 ຕິດຕາມຜົນລາງວັນໄດ້ທີ່ Channel:\n👉 ${channelLink}\n\n🤝 ชວນໝູ່ມາຊື້ເລກ ຮັບທັນທີ 5% ຂອງຍອດຊື້!\n🔗 Link ແນະນຳຂອງທ່ານ:\n${referralLink}\n\nກະລຸນາກົດປຸ່ມລຸ່ມນີ້ເພື່ອເປີດແອັບ:`, {
        reply_markup: {
            keyboard: [ [{ text: "📲 ເປີດແອັບຊື້ຕົວເລກ", web_app: { url: appUrl } }] ],
            resize_keyboard: true
        }
    });
});

bot.on('web_app_data', async (ctx) => {
    const telegramId = ctx.from.id.toString();
    const data = JSON.parse(ctx.webAppData.data.text()); 
    
    if (data.action === 'buy_number') {
        const ticketNumber = data.number;

        // --- ລະບົບປິດຮັບຊື້ເວລາ 12:00 ວັນອາທິດ (ແກ້ໄຂໃຫ້ຖືກຕ້ອງ) ---
        const localTimeStr = new Date().toLocaleString("en-US", {timeZone: "Asia/Vientiane"});
        const now = new Date(localTimeStr);
        const currentDay = now.getDay(); // 0 = ວັນອາທິດ
        const currentHour = now.getHours(); 

        if (currentDay === 0 && currentHour >= 12) {
            return ctx.reply('❌ ຂໍອະໄພ, ລະບົບປິດຮັບຊື້ແລ້ວສຳລັບອາທິດນີ້.\n\n⏰ ລະບົບຈະເປີດຮັບຊື້ໃໝ່ໃນວັນຈັນ ເວലാ 00:00 ໂມງ.');
        }
        // ------------------------------------

        ctx.reply(`⏳ ກຳລັງກວດສອບຍອດເງິນ ແລະ ໝາຍເລກ ${ticketNumber}...`);
        
        try {
            const { data: userData, error: userError } = await supabase.from('users').select('wallet_balance').eq('telegram_id', telegramId).single();

            if (userError || !userData) return ctx.reply('❌ ບໍ່ສາມາດດຶງຂໍ້ມູນກະເປົາເງິນໄດ້ ກະລຸນາພິມ /start ໃໝ່ອີກຄັ້ງ.');
            if (userData.wallet_balance < 10) return ctx.reply(`❌ ຍອດເງິນຂອງທ່ານບໍ່ພຽງພໍ.\n(ຍອດຄົງເຫຼືອ: ${userData.wallet_balance} USDT)`);

            const { data: existTicket } = await supabase.from('tickets').select('ticket_number').eq('ticket_number', ticketNumber).single();
            if (existTicket) return ctx.reply('❌ ຂໍອະໄພ, ຕົວເລກນີ້ຖືກຊື້ໄປແລ້ວ ກະລຸນາເລືອກຕົວເລກໃໝ່.');

            const newBalance = userData.wallet_balance - 10; 
            const { error: updateError } = await supabase.from('users').update({ wallet_balance: newBalance }).eq('telegram_id', telegramId);
            if (updateError) throw updateError;

            // --- ລະບົບ Affiliate 5% ---
            const { data: userProfile } = await supabase.from('users').select('referrer_id').eq('telegram_id', telegramId).single();
            if (userProfile && userProfile.referrer_id) {
                const commission = 10 * 0.05; 
                const { data: referrerData } = await supabase.from('users').select('wallet_balance').eq('telegram_id', userProfile.referrer_id).single();
                if (referrerData) {
                    const newReferrerBalance = parseFloat(referrerData.wallet_balance) + commission;
                    await supabase.from('users').update({ wallet_balance: newReferrerBalance }).eq('telegram_id', userProfile.referrer_id);
                    try {
                        await bot.telegram.sendMessage(userProfile.referrer_id, 
                            `💰 ຍິນດີດ້ວຍ! ໝູ່ທີ່ທ່ານແນະນຳໄດ້ຊື້ເລກ.\nທ່ານໄດ້ຮັບຄ່ານາຍໜ้า 5% ເປັນເງິນ: +${commission} USDT.\nຍອດລວມປັດຈຸບັນ: ${newReferrerBalance} USDT`);
                    } catch (e) { console.log("ແຈ້ງເຕືອນຜູ້ແນະນຳຜິດພາດ", e); }
                }
            }

            // --- ບັນທຶກປີ້ເຂົ້າຖານຂໍ້ມູນ ---
            const currentDate = now.toISOString().split('T')[0];
            const currentTime = now.toISOString().split('T')[1].substring(0, 8);

            const { error: insertError } = await supabase.from('tickets').insert([{ 
                ticket_number: ticketNumber, owner_telegram_id: telegramId, Date_book: currentDate, Time_book: currentTime
            }]);
            if (insertError) throw insertError;

            ctx.reply(`✅ ບິນຢັ້ງຢືນສຳເລັດ!\n\n🎟️ ໝາຍເລກຂອງທ່ານ: [ ${ticketNumber} ]\n💸 ຍອດເງິນຄົງເຫຼືອ: ${newBalance} USDT\n\nຂໍໃຫ້ໂຊກດີໃນງວດນີ້! 🎉`);

        } catch (err) { 
            console.error("Buy Number Error:", err);
            ctx.reply('❌ ລະບົບຂັດຂ້ອງຊົ່ວຄາວ ກະລຸນາລອງໃໝ່ພາຍຫຼັງ.'); 
        }
    }
});

// ==========================================
// --- 3. ລະບົບຂອງ Admin (Topup & Draw) ---
// ==========================================

const ADMIN_ID = '1774450602'; 

bot.command('topup', async (ctx) => {
    const senderId = ctx.from.id.toString();
    if (senderId !== ADMIN_ID) return ctx.reply('❌ ຂໍອະໄພ, ທ່ານບໍ່ມີສິດນຳໃຊ້ຄຳສັ່ງນີ້.');
    
    const messageParts = ctx.message.text.split(' ');
    if (messageParts.length !== 3) return ctx.reply('⚠️ ຮູບແບບຄຳສັ່ງບໍ່ຖືກຕ້ອງ.\nວິທີໃຊ້: /topup [IDລູກຄ້າ] [ຈຳນວນເງິນ]');
    
    const targetId = messageParts[1];
    const amountToAdd = parseFloat(messageParts[2]);
    if (isNaN(amountToAdd) || amountToAdd <= 0) return ctx.reply('❌ จຳນວນເງິນບໍ່ຖືກຕ້ອງ.');

    try {
        const { data: userData, error: fetchError } = await supabase.from('users').select('wallet_balance').eq('telegram_id', targetId).single();
        if (fetchError || !userData) return ctx.reply('❌ ບໍ່ພົບ ID ລູກຄ້ານີ້ໃນລະບົບ');
        
        const newBalance = parseFloat(userData.wallet_balance) + amountToAdd;
        await supabase.from('users').update({ wallet_balance: newBalance }).eq('telegram_id', targetId);
        
        ctx.reply(`✅ ເտີມເງິນສຳເລັດ!\n👤 ເຂົ້າ ID: ${targetId}\n💰 ຈຳນວນ: +${amountToAdd} USDT\n💳 ຍອດເງິນປັດຈຸບັນ: ${newBalance} USDT`);
        
        if (targetId !== ADMIN_ID) {
            try { await bot.telegram.sendMessage(targetId, `🎉 ທ່ານໄດ້ຮັບການເຕີມເງິນຈຳນວນ ${amountToAdd} USDT.\n💰 ຍອດເງິນຄົງເຫຼືອ: ${newBalance} USDT`); } catch (err) {}
        }
    } catch (err) { ctx.reply('❌ ເກີດຂໍ້ຜິດພາດ.'); }
});

bot.command('draw', async (ctx) => {
    const senderId = ctx.from.id.toString();
    if (senderId !== ADMIN_ID) return ctx.reply('❌ ຂໍອະໄພ, ທ່ານບໍ່ມີສິດນຳໃຊ້ຄຳສັ່ງນີ້.');
    
    const messageParts = ctx.message.text.split(' ');
    if (messageParts.length !== 2) return ctx.reply('⚠️ ຮູບແບບຄຳສັ່ງບໍ່ຖືກຕ້ອງ.\nວິທີໃຊ້: /draw [ຕົວເລກ 5 ຫຼັກ]');
    
    const winningNumber = messageParts[1];
    if (winningNumber.length !== 5 || isNaN(winningNumber)) return ctx.reply('❌ ກະລຸນາປ້ອນຕົວເລກໃຫ້ຄົບ 5 ຫຼັກ.');

    try {
        const { data: winningTickets, error } = await supabase.from('tickets').select('owner_telegram_id').eq('ticket_number', winningNumber);
        if (error) throw error;
        
        if (!winningTickets || winningTickets.length === 0) return ctx.reply(`ປະກາດຜົນລາງວັນ: [ ${winningNumber} ] 🏆\n\n😔 ງວດນີ້ບໍ່ມີລູກຄ້າຖືກລາງວັນເລີຍ.`);
        
        const winnersMap = {};
        winningTickets.forEach(ticket => {
            const id = ticket.owner_telegram_id;
            winnersMap[id] = (winnersMap[id] || 0) + 1; 
        });
        
        let successCount = 0;
        for (const [userId, count] of Object.entries(winnersMap)) {
            try {
                await bot.telegram.sendMessage(userId, `🎉 ຊົມເຊີຍ!!! ຂໍສະແດງຄວາມຍິນດີນຳເດີ້! 🎉\n\nຕົວເລກ [ ${winningNumber} ] ທີ່ທ່ານชື້ (ຈຳນວນ ${count} ປີ້) ໄດ້ຖືກລາງວັນໃຫຍ່ງວດນີ້! 🏆\n\nກະລຸນາຕິດຕໍ່ແອັດມິນເພື່ອຮັບເງິນລາງວັນເລີຍ!`);
                successCount++;
            } catch (err) {}
        }
        
        ctx.reply(`✅ ອອກລາງວັນສຳເລັດ: [ ${winningNumber} ] 🏆\n\nພົບຜູ້ຖືກລາງວັນທັງໝົດ ${Object.keys(winnersMap).length} ຄົນ (ລວມ ${winningTickets.length} ປີ້).\nສົ່ງແຈ້ງເຕືອນຫາລູກຄ້າສຳເລັດແລ້ວ ${successCount} ຄົນ.`);
    } catch (err) { ctx.reply('❌ ເກີດຂໍ້ຜິດພາດ.'); }
});

// ==========================================
// --- 4. Webhook Setup (ສຳຄັນທີ່ສຸດ) ---
// ==========================================

const PORT = process.env.PORT || 3000;
const WEBHOOK_PATH = '/webhook';
const APP_URL = 'https://lucky-backend-api.onrender.com';

app.use(bot.webhookCallback(WEBHOOK_PATH));

app.listen(PORT, async () => {
    console.log(`🌐 Web Server ກຳລັງເຮັດວຽກຢູ່ທີ່ພອດ ${PORT}`);
    try {
        await bot.telegram.setWebhook(`${APP_URL}${WEBHOOK_PATH}`);
        console.log(`✅ Webhook ຕັ້ງຄ່າສຳເລັດແລ້ວໄປທີ່: ${APP_URL}${WEBHOOK_PATH}`);
    } catch (error) {
        console.error('❌ ຕັ້ງຄ່າ Webhook ຜິດພາດ:', error);
    }
});

app.get('/', (req, res) => { 
    res.send('✅ Lucky Number Bot Backend is running successfully with Webhook!'); 
});

const { Telegraf } = require('telegraf');
const { createClient } = require('@supabase/supabase-js');
const express = require('express'); // ເພີ່ມ Express ເຂົ້າມາສຳລັບ Render

// ໃສ່ລະຫັດຂອງທ່ານບ່ອນນີ້
const BOT_TOKEN = '8921585286:AAEKu2mVEQGAGB_9RBKCqMnnRnlrVE0aGCI';
const SUPABASE_URL = 'https://fsrpcwrhskhnglrmutsz.supabase.co';
const SUPABASE_KEY = 'sb_secret_CGMwhxFtwz39gMzZmVEfgg_gk4BGK4e';

const bot = new Telegraf(BOT_TOKEN);
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const app = express();

// --- API ສຳລັບດຶງຍອດເງິນໄປສະແດງໜ້າແອັບ ---
app.get('/api/balance/:id', async (req, res) => {
    // ອະນຸຍາດໃຫ້ໜ້າເວັບ (Frontend) ສາມາດດຶງຂໍ້ມູນໄດ້
    res.header("Access-Control-Allow-Origin", "*"); 
    
    try {
        const { data } = await supabase
            .from('users')
            .select('wallet_balance')
            .eq('telegram_id', req.params.id)
            .single();
            
        // ຖ້າມີຂໍ້ມູນໃຫ້ສົ່ງຍອດເງິນກັບໄປ, ຖ້າບໍ່ມີໃຫ້ສົ່ງເລກ 0
        res.json({ balance: data ? data.wallet_balance : 0 });
    } catch (err) {
        res.json({ balance: 0 });
    }
});

// --- ໂຄ້ດ Telegram Bot ຂອງທ່ານ ---
bot.start(async (ctx) => {
    const telegramId = ctx.from.id.toString();
    const payload = ctx.startPayload; // ເອົາ ID ຂອງຜູ້ແນະນຳມາຈາກ Link

    // 1. ບັນທຶກຜູ້ໃຊ້ໃໝ່ ແລະ ຜູ້ແນະນຳ (ຖ້າມີ)
    await supabase.from('users').upsert([{ 
        telegram_id: telegramId,
        referrer_id: payload || null 
    }], { onConflict: 'telegram_id' });

    // 2. ສົ່ງ Link ແນະນຳໃຫ້ລູກຄ້າ
    const referralLink = `https://t.me/LuckyNumbervip_bot?start=${telegramId}`;
    ctx.reply(`ຍິນດີຕ້ອນຮັບ! ບອກຕໍ່ໝູ່ເພື່ອຮັບເງິນລາງວັນ!\n\n🔗 Link ຂອງເຈົ້າ: ${referralLink}`);
});

bot.on('web_app_data', async (ctx) => {
    const telegramId = ctx.from.id.toString();
    const data = JSON.parse(ctx.webAppData.data.text()); 
    
    if (data.action === 'buy_number') {
        const ticketNumber = data.number;
        ctx.reply(`⏳ ກຳລັງກວດສອບຍອດເງິນ ແລະ ໝາຍເລກ ${ticketNumber}...`);
        
        try {
            // ----- ຂັ້ນຕອນທີ 1: ກວດສອບຍອດເງິນລູກຄ້າ -----
            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('wallet_balance')
                .eq('telegram_id', telegramId)
                .single();

            if (userError || !userData) {
                return ctx.reply('❌ ບໍ່ສາມາດດຶງຂໍ້ມູນກະເປົາເງິນໄດ້ ກະລຸນາພິມ /start ໃໝ່ອີກຄັ້ງ.');
            }

            // ຖ້າຍອດເງິນໜ້ອຍກວ່າ 10 USDT ໃຫ້ປະຕິເສດການຂາຍ
            if (userData.wallet_balance < 10) {
                return ctx.reply(`❌ ຍອດເງິນຂອງທ່ານບໍ່ພຽງພໍ.\n(ຍອດຄົງເຫຼືອ: ${userData.wallet_balance} USDT)\nກະລຸນາເຕີມເງິນເຂົ້າກະເປົາຢ່າງໜ້ອຍ 10 USDT ເພື່ອສັ່ງຊື້.`);
            }

            // ----- ຂັ້ນຕອນທີ 2: ກວດສອບວ່າເລກນີ້ວ່າງຫຼືບໍ່ -----
            const { data: existTicket } = await supabase
                .from('tickets')
                .select('ticket_number')
                .eq('ticket_number', ticketNumber)
                .single();

            if (existTicket) {
                return ctx.reply('❌ ຂໍອະໄພ, ຕົວເລກນີ້ຖືກຊື້ໄປແລ້ວ ກະລຸນາເລືອກຕົວເລກໃໝ່.');
            }

            // ----- ຂັ້ນຕອນທີ 3: ຕັດເງິນ ແລະ ບັນທຶກຕົວເລກ -----
            const newBalance = userData.wallet_balance - 10; // ຫັກເງິນ 10 USDT
            
            // ອັບເດດຍອດເງິນໃໝ່ລົງຕາຕະລາງ users
            const { error: updateError } = await supabase
                .from('users')
                .update({ wallet_balance: newBalance })
                .eq('telegram_id', telegramId);
                
            if (updateError) throw updateError;

            // ກຽມວັນທີ ແລະ ເວລາ (UTC+7)
            const now = new Date();
            now.setHours(now.getHours() + 7); 
            const currentDate = now.toISOString().split('T')[0];
            const currentTime = now.toISOString().split('T')[1].substring(0, 8);

            // ບັນທຶກຕົວເລກລົງຕາຕະລາງ tickets
            const { error: insertError } = await supabase.from('tickets').insert([{ 
                ticket_number: ticketNumber, 
                owner_telegram_id: telegramId,
                Date_book: currentDate,
                Time_book: currentTime
            }]);
            
            if (insertError) throw insertError;

            // ອອກບິນຮັບເງິນ
            ctx.reply(`✅ ບິນຢັ້ງຢືນສຳເລັດ!\n\n🎟️ ໝາຍເລກຂອງທ່ານ: [ ${ticketNumber} ]\n💸 ຍອດເງິນຄົງເຫຼືອ: ${newBalance} USDT\n\nຂໍໃຫ້ໂຊກດີໃນງວດນີ້! 🎉`);

        } catch (err) {
            console.error("System Error:", err);
            ctx.reply('❌ ລະບົບຂັດຂ້ອງຊົ່ວຄາວ ກະລຸນາລອງໃໝ່ພາຍຫຼັງ.');
        }
    }
});

// --- ລະບົບແອັດມິນເຕີມເງິນ (Admin Top-up) ---
// ລັອກໄວ້ໃຫ້ສະເພາະ ID ຂອງທ່ານຜູ້ດຽວທີ່ສັ່ງເຕີມເງິນໄດ້
const ADMIN_ID = '1774450602'; 

bot.command('topup', async (ctx) => {
    const senderId = ctx.from.id.toString();
    
    // ກວດສອບວ່າແມ່ນແອັດມິນຫຼືບໍ່
    if (senderId !== ADMIN_ID) {
        return ctx.reply('❌ ຂໍອະໄພ, ທ່ານບໍ່ມີສິດນຳໃຊ້ຄຳສັ່ງນີ້.');
    }

    // ແຍກຂໍ້ຄວາມເພື່ອເອົາ ID ລູກຄ້າ ແລະ ຈຳນວນເງິນ
    const messageParts = ctx.message.text.split(' ');
    
    if (messageParts.length !== 3) {
        return ctx.reply('⚠️ ຮູບແບບຄຳສັ່ງບໍ່ຖືກຕ້ອງ.\nວິທີໃຊ້: /topup [IDລູກຄ້າ] [ຈຳນວນເງິນ]\nຕົວຢ່າງ: /topup 123456789 50');
    }

    const targetId = messageParts[1];
    const amountToAdd = parseFloat(messageParts[2]);

    if (isNaN(amountToAdd) || amountToAdd <= 0) {
        return ctx.reply('❌ ຈຳນວນເງິນບໍ່ຖືກຕ້ອງ ກະລຸນາປ້ອນຕົວເລກທີ່ຫຼາຍກວ່າ 0.');
    }

    try {
        // 1. ດຶງຍອດເງິນປັດຈຸບັນຂອງລູກຄ້າມາກ່ອນ
        const { data: userData, error: fetchError } = await supabase
            .from('users')
            .select('wallet_balance')
            .eq('telegram_id', targetId)
            .single();

        if (fetchError || !userData) {
            return ctx.reply('❌ ບໍ່ພົບ ID ລູກຄ້ານີ້ໃນລະບົບ (ລູກຄ້າຕ້ອງເຄີຍກົດ /start ກ່ອນ).');
        }

        // 2. ບວກເງິນເພີ່ມເຂົ້າໄປ
        const newBalance = parseFloat(userData.wallet_balance) + amountToAdd;

        // 3. ອັບເດດຍອດເງິນໃໝ່ລົງຖານຂໍ້ມູນ
        const { error: updateError } = await supabase
            .from('users')
            .update({ wallet_balance: newBalance })
            .eq('telegram_id', targetId);

        if (updateError) throw updateError;

        // 4. ແຈ້ງເຕືອນແອັດມິນ (ທ່ານ)
        ctx.reply(`✅ ເຕີມເງິນສຳເລັດ!\n👤 ເຂົ້າ ID: ${targetId}\n💰 ຈຳນວນ: +${amountToAdd} USDT\n💳 ຍອດເງິນປັດຈຸບັນ: ${newBalance} USDT`);
        
        // 5. ສົ່ງຂໍ້ຄວາມໄປແຈ້ງເຕືອນລູກຄ້າອັດຕະໂນມັດ (ຖ້າເຕີມໃຫ້ຄົນອື່ນ)
        if (targetId !== ADMIN_ID) {
            try {
                await bot.telegram.sendMessage(targetId, `🎉 ຍິນດີດ້ວຍ! ທ່ານໄດ້ຮັບການເຕີມເງິນຈຳນວນ ${amountToAdd} USDT.\n💰 ຍອດເງິນຄົງເຫຼືອ: ${newBalance} USDT\n\nກົດປຸ່ມເປີດແອັບຂ້າງລຸ່ມເພື່ອເລືອກຊື້ຕົວເລກໄດ້ເລີຍ!`);
            } catch (err) {
                console.log("ບໍ່ສາມາດສົ່ງແຈ້ງເຕືອນຫາລູກຄ້າໄດ້");
            }
        }

    } catch (err) {
        console.error("Topup Error:", err);
        ctx.reply('❌ ເກີດຂໍ້ຜິດພາດໃນການເຕີມເງິນ ກະລຸນາລອງໃໝ່ພາຍຫຼັງ.');
    }
});

// --- ລະບົບອອກລາງວັນ (Prize Draw) ---
// ສະເພາະແອັດມິນເທົ່ານັ້ນທີ່ສາມາດສັ່ງອອກລາງວັນໄດ້
bot.command('draw', async (ctx) => {
    const senderId = ctx.from.id.toString();

    // ກວດສອບວ່າແມ່ນແອັດມິນຫຼືບໍ່
    if (senderId !== ADMIN_ID) {
        return ctx.reply('❌ ຂໍອະໄພ, ທ່ານບໍ່ມີສິດນຳໃຊ້ຄຳສັ່ງນີ້.');
    }

    // ແຍກຂໍ້ຄວາມເພື່ອເອົາຕົວເລກທີ່ຖືກລາງວັນ
    const messageParts = ctx.message.text.split(' ');
    
    if (messageParts.length !== 2) {
        return ctx.reply('⚠️ ຮູບແບບຄຳສັ່ງບໍ່ຖືກຕ້ອງ.\nວິທີໃຊ້: /draw [ຕົວເລກ 5 ຫຼັກ]\nຕົວຢ່າງ: /draw 99999');
    }

    const winningNumber = messageParts[1];

    // ກວດສອບວ່າພິມຄົບ 5 ຫຼັກຫຼືບໍ່
    if (winningNumber.length !== 5 || isNaN(winningNumber)) {
        return ctx.reply('❌ ກະລຸນາປ້ອນຕົວເລກໃຫ້ຄົບ 5 ຫຼັກ.');
    }

    try {
        // 1. ຄົ້ນຫາຜູ້ທີ່ຊື້ເລກນີ້ຈາກຖານຂໍ້ມູນ (ຕາຕະລາງ tickets)
        const { data: winningTickets, error } = await supabase
            .from('tickets')
            .select('owner_telegram_id')
            .eq('ticket_number', winningNumber);

        if (error) throw error;

        // ຖ້າບໍ່ມີຄົນຊື້ເລກນີ້ເລີຍ
        if (!winningTickets || winningTickets.length === 0) {
            return ctx.reply(`ປະກາດຜົນລາງວັນ: [ ${winningNumber} ] 🏆\n\n😔 ງວດນີ້ບໍ່ມີລູກຄ້າຖືກລາງວັນເລີຍ.`);
        }

        // 2. ນັບຈຳນວນຜູ້ໂຊກດີ
        const winnersMap = {};
        winningTickets.forEach(ticket => {
            const id = ticket.owner_telegram_id;
            winnersMap[id] = (winnersMap[id] || 0) + 1; // ບວກຈຳນວນປີ້ທີ່ຖືກ
        });

        // 3. ສົ່ງຂໍ້ຄວາມແຈ້ງເຕືອນຫາຜູ້ໂຊກດີແຕ່ລະຄົນໂດຍກົງ
        let successCount = 0;
        for (const [userId, count] of Object.entries(winnersMap)) {
            try {
                await bot.telegram.sendMessage(
                    userId,
                    `🎉 ຊົມເຊີຍ!!! ຂໍສະແດງຄວາມຍິນດີນຳເດີ້! 🎉\n\nຕົວເລກ [ ${winningNumber} ] ທີ່ທ່ານຊື້ (ຈຳນວນ ${count} ປີ້) ໄດ້ຖືກລາງວັນໃຫຍ່ງວດນີ້! 🏆\n\nກະລຸນາຕິດຕໍ່ແອັດມິນເພື່ອຮັບເງິນລາງວັນເລີຍ!`
                );
                successCount++;
            } catch (err) {
                console.log(`ບໍ່ສາມາດສົ່ງຂໍ້ຄວາມຫາ ID: ${userId} ໄດ້ (ລູກຄ້າອາດບລັອກບັອດ)`);
            }
        }

        // 4. ສະຫຼຸບລາຍງານໃຫ້ແອັດມິນຊາບ
        ctx.reply(`✅ ອອກລາງວັນສຳເລັດ: [ ${winningNumber} ] 🏆\n\nພົບຜູ້ຖືກລາງວັນທັງໝົດ ${Object.keys(winnersMap).length} ຄົນ (ລວມ ${winningTickets.length} ປີ້).\nສົ່ງແຈ້ງເຕືອນຫາລູກຄ້າສຳເລັດແລ້ວ ${successCount} ຄົນ.`);

    } catch (err) {
        console.error("Draw Error:", err);
        ctx.reply('❌ ເກີດຂໍ້ຜິດພາດໃນການອອກລາງວັນ ກະລຸນາລອງໃໝ່ພາຍຫຼັງ.');
    }
});

bot.launch();
console.log('🚀 Telegram Bot ກຳລັງເຮັດວຽກ...');

// --- ສ້າງ Web Server ຈຳລອງເພື່ອໃຫ້ Render ອະນຸມັດ ---
app.get('/', (req, res) => {
    res.send('Lucky Number Bot Backend is running successfully!');
});

// --- API ສຳລັບດຶງປະຫວັດການຊື້ (My Tickets) ---
app.get('/api/tickets/:id', async (req, res) => {
    res.header("Access-Control-Allow-Origin", "*"); 
    try {
        const { data, error } = await supabase
            .from('tickets')
            .select('ticket_number')
            .eq('owner_telegram_id', req.params.id); 

        if (error) throw error;
        res.json({ tickets: data || [] });
    } catch (err) {
        console.error("ດຶງປະຫວັດຜິດພາດ:", err);
        res.json({ tickets: [] });
    }
});

// Render ຈະສົ່ງລະຫັດ Port ມາໃຫ້ເອງ, ຖ້າບໍ່ມີໃຫ້ໃຊ້ 3000
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🌐 Web Server ເປີດຢູ່ທີ່ພອດ ${PORT}`);
});

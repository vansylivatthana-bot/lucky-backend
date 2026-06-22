const { Telegraf } = require('telegraf');
const { createClient } = require('@supabase/supabase-js');
const express = require('express'); 

// ໃສ່ລະຫັດຂອງທ່ານບ່ອນນີ້
const BOT_TOKEN = '8921585286:AAEKu2mVEQGAGB_9RBKCqMnnRnlrVE0aGCI';
const SUPABASE_URL = 'https://fsrpcwrhskhnglrmutsz.supabase.co';
const SUPABASE_KEY = 'sb_secret_CGMwhxFtwz39gMzZmVEfgg_gk4BGK4e';

const bot = new Telegraf(BOT_TOKEN);
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const app = express();

// --- API ສຳລັບດຶງຍອດເງິນໄປສະແດງໜ້າແອັບ ---
app.get('/api/balance/:id', async (req, res) => {
    res.header("Access-Control-Allow-Origin", "*"); 
    try {
        const { data } = await supabase
            .from('users')
            .select('wallet_balance')
            .eq('telegram_id', req.params.id)
            .single();
            
        res.json({ balance: data ? data.wallet_balance : 0 });
    } catch (err) {
        res.json({ balance: 0 });
    }
});

// --- API ສຳລັບດຶງຂໍ້ມູນນາຍໜ້າ (ຈຳນວນໝູ່ທີ່ແນະນຳ) ---
app.get('/api/referral-stats/:id', async (req, res) => {
    res.header("Access-Control-Allow-Origin", "*");
    try {
        const { count } = await supabase
            .from('users')
            .select('*', { count: 'exact' })
            .eq('referrer_id', req.params.id);
            
        res.json({ friends_count: count || 0 });
    } catch (err) {
        res.json({ friends_count: 0 });
    }
});

// --- ໂຄ້ດ Telegram Bot ຂອງທ່ານ ---
bot.start(async (ctx) => {
    const telegramId = ctx.from.id.toString();
    const payload = ctx.startPayload; // ຮັບ ID ຜູ້ແນະນຳຈາກ Link (ຖ້າມີ)
    
    // ກວດສອບກ່ອນວ່າມີ user ນີ້ແລ້ວຫຼືບໍ່ ເພື່ອບໍ່ໃຫ້ຂຽນທັບຜູ້ແນະນຳເກົ່າ
    const { data: existingUser } = await supabase.from('users').select('telegram_id').eq('telegram_id', telegramId).single();

    if (!existingUser) {
        // ຖ້າເປັນລູກຄ້າໃໝ່, ໃຫ້ບັນທຶກລົງຖານຂໍ້ມູນ ພ້ອມກັບ ID ຜູ້ແນະນຳ
        const userData = { telegram_id: telegramId };
        if (payload && payload !== telegramId) {
            userData.referrer_id = payload;
        }
        await supabase.from('users').insert([userData]);
    }
    
    const appUrl = `https://vansylivatthana-bot.github.io/lucky-number-app/?userid=${telegramId}`;
    const referralLink = `https://t.me/LuckyNumbervip_bot?start=${telegramId}`; // Link ແນະນຳຂອງລູກຄ້າຄົນນີ້

    ctx.reply(`ຍິນດີຕ້ອນຮັບ! 🎉\n\n🤝 ຊວນໝູ່ມາຊື້ເລກ ຮັບທັນທີ 5% ຂອງຍອດຊື້!\n🔗 Link ແນະນຳຂອງທ່ານ:\n${referralLink}\n\nກະລຸນາກົດປຸ່ມລຸ່ມນີ້ເພື່ອເປີດແອັບຊື້ຕົວເລກນຳໂຊກ:`, {
        reply_markup: {
            keyboard: [
                [{ text: "📲 ເປີດແອັບຊື້ຕົວເລກ", web_app: { url: appUrl } }]
            ],
            resize_keyboard: true
        }
    });
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
            const newBalance = userData.wallet_balance - 10; 
            
            const { error: updateError } = await supabase
                .from('users')
                .update({ wallet_balance: newBalance })
                .eq('telegram_id', telegramId);
                
            if (updateError) throw updateError;

            // --- ລະບົບຄິດໄລ່ຄ່ານາຍໜ້າ (Affiliate 5%) ---
            const { data: userProfile } = await supabase.from('users').select('referrer_id').eq('telegram_id', telegramId).single();

            if (userProfile && userProfile.referrer_id) {
                const ticketPrice = 10; 
                const commissionRate = 0.05; 
                const commission = ticketPrice * commissionRate; // ຄິດໄລ່ເປັນ 0.5 USDT ຕໍ່ປີ້
                
                const { data: referrerData } = await supabase.from('users').select('wallet_balance').eq('telegram_id', userProfile.referrer_id).single();
                
                if (referrerData) {
                    const newReferrerBalance = parseFloat(referrerData.wallet_balance) + commission;
                    
                    await supabase.from('users')
                        .update({ wallet_balance: newReferrerBalance })
                        .eq('telegram_id', userProfile.referrer_id);
                        
                    try {
                        await bot.telegram.sendMessage(userProfile.referrer_id, 
                            `💰 ຍິນດີດ້ວຍ! ໝູ່ທີ່ທ່ານແນະນຳໄດ້ຊື້ເລກ.\nທ່ານໄດ້ຮັບຄ່ານາຍໜ້າ 5% ເປັນເງິນ: +${commission} USDT.\nຍອດລວມປັດຈຸບັນ: ${newReferrerBalance} USDT`);
                    } catch (e) { console.log("ບໍ່ສາມາດແຈ້ງເຕືອນຜູ້ແນະນຳໄດ້"); }
                }
            }
            // ----------------------------------------

            const now = new Date();
            now.setHours(now.getHours() + 7); 
            const currentDate = now.toISOString().split('T')[0];
            const currentTime = now.toISOString().split('T')[1].substring(0, 8);

            const { error: insertError } = await supabase.from('tickets').insert([{ 
                ticket_number: ticketNumber, 
                owner_telegram_id: telegramId,
                Date_book: currentDate,
                Time_book: currentTime
            }]);
            
            if (insertError) throw insertError;

            ctx.reply(`✅ ບິນຢັ້ງຢືນສຳເລັດ!\n\n🎟️ ໝາຍເລກຂອງທ່ານ: [ ${ticketNumber} ]\n💸 ຍອດເງິນຄົງເຫຼືອ: ${newBalance} USDT\n\nຂໍໃຫ້ໂຊກດີໃນງວດນີ້! 🎉`);

        } catch (err) {
            console.error("System Error:", err);
            ctx.reply('❌ ລະບົບຂັດຂ້ອງຊົ່ວຄາວ ກະລຸນາລອງໃໝ່ພາຍຫຼັງ.');
        }
    }
});

// --- ລະບົບແອັດມິນເຕີມເງິນ (Admin Top-up) ---
const ADMIN_ID = '1774450602'; 

bot.command('topup', async (ctx) => {
    const senderId = ctx.from.id.toString();
    
    if (senderId !== ADMIN_ID) {
        return ctx.reply('❌ ຂໍອະໄພ, ທ່ານບໍ່ມີສິດນຳໃຊ້ຄຳສັ່ງນີ້.');
    }

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
        const { data: userData, error: fetchError } = await supabase
            .from('users')
            .select('wallet_balance')
            .eq('telegram_id', targetId)
            .single();

        if (fetchError || !userData) {
            return ctx.reply('❌ ບໍ່ພົບ ID ລູກຄ້ານີ້ໃນລະບົບ (ລູກຄ້າຕ້ອງເຄີຍກົດ /start ກ່ອນ).');
        }

        const newBalance = parseFloat(userData.wallet_balance) + amountToAdd;

        const { error: updateError } = await supabase
            .from('users')
            .update({ wallet_balance: newBalance })
            .eq('telegram_id', targetId);

        if (updateError) throw updateError;

        ctx.reply(`✅ ເຕີມເງິນສຳເລັດ!\n👤 ເຂົ້າ ID: ${targetId}\n💰 ຈຳນວນ: +${amountToAdd} USDT\n💳 ຍອດເງິນປັດຈຸບັນ: ${newBalance} USDT`);
        
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
bot.command('draw', async (ctx) => {
    const senderId = ctx.from.id.toString();

    if (senderId !== ADMIN_ID) {
        return ctx.reply('❌ ຂໍອະໄພ, ທ່ານບໍ່ມີສິດນຳໃຊ້ຄຳສັ່ງນີ້.');
    }

    const messageParts = ctx.message.text.split(' ');
    
    if (messageParts.length !== 2) {
        return ctx.reply('⚠️ ຮູບແບບຄຳສັ່ງບໍ່ຖືກຕ້ອງ.\nວິທີໃຊ້: /draw [ຕົວເລກ 5 ຫຼັກ]\nຕົວຢ່າງ: /draw 99999');
    }

    const winningNumber = messageParts[1];

    if (winningNumber.length !== 5 || isNaN(winningNumber)) {
        return ctx.reply('❌ ກະລຸນາປ້ອນຕົວເລກໃຫ້ຄົບ 5 ຫຼັກ.');
    }

    try {
        const { data: winningTickets, error } = await supabase
            .from('tickets')
            .select('owner_telegram_id')
            .eq('ticket_number', winningNumber);

        if (error) throw error;

        if (!winningTickets || winningTickets.length === 0) {
            return ctx.reply(`ປະກາດຜົນລາງວັນ: [ ${winningNumber} ] 🏆\n\n😔 ງວດນີ້ບໍ່ມີລູກຄ້າຖືກລາງວັນເລີຍ.`);
        }

        const winnersMap = {};
        winningTickets.forEach(ticket => {
            const id = ticket.owner_telegram_id;
            winnersMap[id] = (winnersMap[id] || 0) + 1; 
        });

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

        ctx.reply(`✅ ອອກລາງວັນສຳເລັດ: [ ${winningNumber} ] 🏆\n\nພົບຜູ້ຖືກລາງວັນທັງໝົດ ${Object.keys(winnersMap).length} ຄົນ (ລວມ ${winningTickets.length} ປີ້).\nສົ່ງແຈ້ງເຕືອນຫາລູກຄ້າສຳເລັດແລ້ວ ${successCount} ຄົນ.`);

    } catch (err) {
        console.error("Draw Error:", err);
        ctx.reply('❌ ເກີດຂໍ້ຜິດພາດໃນການອອກລາງວັນ ກະລຸນາລອງໃໝ່ພາຍຫຼັງ.');
    }
});

bot.launch();
console.log('🚀 Telegram Bot ກຳລັງເຮັດວຽກ...');

app.get('/', (req, res) => {
    res.send('Lucky Number Bot Backend is running successfully!');
});

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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🌐 Web Server ເປີດຢູ່ທີ່ພອດ ${PORT}`);
});

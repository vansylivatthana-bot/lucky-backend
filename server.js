const { Telegraf } = require('telegraf');
const { createClient } = require('@supabase/supabase-js');
const express = require('express'); // ເພີ່ມ Express ເຂົ້າມາສຳລັບ Render

// ໃສ່ລະຫັດຂອງທ່ານບ່ອນນີ້
const BOT_TOKEN = '8921585286:AAHKSC1r_Zg0SvTwpjm79A_NPj0gzwHaECg';
const SUPABASE_URL = 'https://fsrpcwrhskhnglrmutsz.supabase.co';
const SUPABASE_KEY = 'sb_publishable_iDgnFosf3Q5Sc4gp0i1zxQ_Q6ac_lRh';

const bot = new Telegraf(BOT_TOKEN);
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const app = express();

// --- ໂຄ້ດ Telegram Bot ຂອງທ່ານ ---
bot.start(async (ctx) => {
    const telegramId = ctx.from.id.toString();
    await supabase.from('users').upsert([{ telegram_id: telegramId }], { onConflict: 'telegram_id' });
    
    ctx.reply('ຍິນດີຕ້ອນຮັບ! 🎉\nກະລຸນາກົດປຸ່ມລຸ່ມນີ້ເພື່ອເປີດແອັບຊື້ຕົວເລກນຳໂຊກ:', {
        reply_markup: {
            keyboard: [
                [{ text: "📲 ເປີດແອັບຊື້ຕົວເລກ", web_app: { url: "https://vansylivatthana-bot.github.io/lucky-number-app/" } }]
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
        ctx.reply(`⏳ ກຳລັງກວດສອບໝາຍເລກ ${ticketNumber}...`);
        
        const { error } = await supabase.from('tickets').insert([{ ticket_number: ticketNumber, owner_telegram_id: telegramId }]);
            
        if (error) {
            ctx.reply('❌ ຂໍອະໄພ, ຕົວເລກນີ້ຖືກຊື້ໄປແລ້ວ ກະລຸນາເລືອກໃໝ່.');
        } else {
            ctx.reply(`✅ ບິນຢັ້ງຢືນສຳເລັດ!\nທ່ານໄດ້ເປັນເຈົ້າຂອງໝາຍເລກ [ ${ticketNumber} ] ຮຽບຮ້ອຍແລ້ວ! 🎉`);
        }
    }
});

bot.launch();
console.log('🚀 Telegram Bot ກຳລັງເຮັດວຽກ...');

// --- ສ້າງ Web Server ຈຳລອງເພື່ອໃຫ້ Render ອະນຸມັດ ---
app.get('/', (req, res) => {
    res.send('Lucky Number Bot Backend is running successfully!');
});

// Render ຈະສົ່ງລະຫັດ Port ມາໃຫ້ເອງ, ຖ້າບໍ່ມີໃຫ້ໃຊ້ 3000
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🌐 Web Server ເປີດຢູ່ທີ່ພອດ ${PORT}`);
});

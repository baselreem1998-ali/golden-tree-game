const TelegramBot = require('node-telegram-bot-api');
const { getDatabase, ref, set, get, update } = require('firebase/database');
const { initializeApp } = require('firebase/app');

// إعدادات Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAfsY0dQI9qnIrksRqY4TvOe7YtPhig_Pg",
  authDomain: "chekinroad-afa14.firebaseapp.com",
  databaseURL: "https://chekinroad-afa14-default-rtdb.firebaseio.com",
  projectId: "chekinroad-afa14",
  storageBucket: "chekinroad-afa14.firebasestorage.app",
  messagingSenderId: "871996125208",
  appId: "1:871996125208:web:7f98cf25c469ea0568536d"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// التوكن من Environment Variable (نفس اللي مضاف بـ Render)
const token = process.env.BOT_TOKEN;
const webAppUrl = 'https://jakesparow13.github.io/golden-tree-game/';

const bot = new TelegramBot(token, { polling: true });

// قائمة الأدمن (حط الـ User ID تبعك)
const ADMIN_IDS = [8298812929]; // غيّر هذا الرقم بـ ID تبعك

// دالة لإنشاء أو جلب بيانات المستخدم
async function getOrCreateUser(userId, userName) {
  const userRef = ref(db, `users/${userId}`);
  const snapshot = await get(userRef);

  if (!snapshot.exists()) {
    const userData = {
      name: userName || 'مستخدم',
      balance: 0,
      referrals: 0,
      referralCode: userId.toString(),
      totalDeposits: 0,
      totalWithdrawals: 0,
      createdAt: Date.now()
    };
    await set(userRef, userData);
    return userData;
  }
  return snapshot.val();
}

// قائمة الأزرار الرئيسية
function getMainKeyboard() {
  return {
    keyboard: [
      [{ text: '🎮 دخول الى الألعاب' }],
      [{ text: '📥 شحن رصيد من البوت' }, { text: '📤 سحب رصيد من البوت' }],
      [{ text: '🎁 إهداء رصيد' }, { text: '🎟️ كود هدية' }],
      [{ text: '✉️ تواصل مع الدعم' }, { text: '👥 الإحالات' }],
      [{ text: '🔄 السجل' }, { text: '🌟 العروض' }]
    ],
    resize_keyboard: true,
    one_time_keyboard: false
  };
}

// قائمة أزرار الألعاب (بسيطة الآن - رصيد واحد مشترك، بدون تحويل)
function getGamesKeyboard() {
  return {
    inline_keyboard: [
      [{ text: '🎰 لعب الآن', web_app: { url: webAppUrl } }],
      [{ text: '🔙 رجوع', callback_data: 'back_main' }]
    ]
  };
}

// أمر /start
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const userName = msg.from.first_name;
  const user = await getOrCreateUser(userId, userName);

  const welcomeMsg =
    `🌳 *مرحباً ${userName}!*\n\n` +
    `أهلاً بك في بوت الشجرة الذهبية 🎰\n\n` +
    `💰 رصيدك: *${user.balance}* NSP\n\n` +
    `استخدم الأزرار أدناه للتنقل:`;

  bot.sendMessage(chatId, welcomeMsg, {
    parse_mode: 'Markdown',
    reply_markup: getMainKeyboard()
  });
});

// معالجة الأزرار النصية
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const text = msg.text;

  if (!text || text.startsWith('/')) return;

  const user = await getOrCreateUser(userId, msg.from.first_name);

  switch (text) {
    case '🎮 دخول الى الألعاب':
      bot.sendMessage(
        chatId,
        `🎰 *قسم الألعاب*\n\n` +
        `💰 رصيدك: *${user.balance}* NSP\n\n` +
        `اضغطي "لعب الآن" وابدئي مباشرة:`,
        { parse_mode: 'Markdown', reply_markup: getGamesKeyboard() }
      );
      break;

    case '📥 شحن رصيد من البوت':
      const depositMsg =
        `💳 *طرق الشحن المتاحة:*\n\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `📱 *سيرياتل كاش:*\n` +
        `الرقم: \`00525989\`\n` +
        `الرقم: \`43833398\`\n\n` +
        `📱 *شام كاش:*\n` +
        `الكود: \`afeb9f1352b9d297ab8e553ff5eb01e2\`\n` +
        `━━━━━━━━━━━━━━━━━━\n\n` +
        `⚠️ *خطوات الشحن:*\n` +
        `1️⃣ قم بالتحويل لأحد الأرقام أعلاه\n` +
        `2️⃣ صوّر إيصال التحويل\n` +
        `3️⃣ أرسل الصورة للدعم مع ذكر المبلغ\n\n` +
        `📞 للتواصل: اضغط زر "تواصل مع الدعم"`;
      bot.sendMessage(chatId, depositMsg, { parse_mode: 'Markdown' });
      break;

    case '📤 سحب رصيد من البوت':
      if (user.balance < 100) {
        bot.sendMessage(
          chatId,
          `❌ الحد الأدنى للسحب هو 100 NSP\n` +
          `💰 رصيدك الحالي: ${user.balance} NSP`
        );
      } else {
        bot.sendMessage(
          chatId,
          `💸 *طلب سحب رصيد*\n\n` +
          `💰 رصيدك المتاح: *${user.balance}* NSP\n\n` +
          `الرجاء إرسال:\n` +
          `1️⃣ المبلغ المطلوب سحبه\n` +
          `2️⃣ طريقة السحب (سيرياتل/شام)\n` +
          `3️⃣ رقم محفظتك\n\n` +
          `مثال: سحب 500 سيرياتل 0944123456\n\n` +
          `أو تواصل مع الدعم مباشرة`,
          { parse_mode: 'Markdown' }
        );
      }
      break;

    case '🎁 إهداء رصيد':
      bot.sendMessage(
        chatId,
        `🎁 *إهداء رصيد لمستخدم آخر*\n\n` +
        `💰 رصيدك: *${user.balance}* NSP\n\n` +
        `لإهداء رصيد، أرسل:\n` +
        `\`/gift [user_id] [amount]\`\n\n` +
        `مثال: \`/gift 123456789 100\``,
        { parse_mode: 'Markdown' }
      );
      break;

    case '🎟️ كود هدية':
      bot.sendMessage(
        chatId,
        `🎟️ *استخدام كود هدية*\n\n` +
        `أرسل الكود على الشكل:\n` +
        `\`/code YOUR_CODE\`\n\n` +
        `مثال: \`/code GOLD2024\``,
        { parse_mode: 'Markdown' }
      );
      break;

    case '✉️ تواصل مع الدعم':
      bot.sendMessage(
        chatId,
        `✉️ *خدمة الدعم الفني*\n\n` +
        `للتواصل مع الإدارة:\n` +
        `📧 أرسل رسالتك هنا وسيتم الرد عليك في أقرب وقت\n\n` +
        `أو تواصل مباشرة: @YourSupportUsername`
      );
      break;

    case '👥 الإحالات':
      const refLink = `https://t.me/${(await bot.getMe()).username}?start=${userId}`;
      bot.sendMessage(
        chatId,
        `👥 *نظام الإحالات*\n\n` +
        `🔗 رابط الدعوة الخاص بك:\n` +
        `\`${refLink}\`\n\n` +
        `📊 عدد إحالاتك: *${user.referrals || 0}*\n` +
        `💰 أرباح الإحالات: قريباً\n\n` +
        `🎁 احصل على 50 NSP عن كل صديق يسجل!`,
        { parse_mode: 'Markdown' }
      );
      break;

    case '🔄 السجل':
      bot.sendMessage(
        chatId,
        `🔄 *سجل العمليات*\n\n` +
        `💰 إجمالي الإيداعات: ${user.totalDeposits || 0}\n` +
        `💸 إجمالي السحوبات: ${user.totalWithdrawals || 0}\n` +
        `💰 رصيدك الحالي: ${user.balance || 0}\n\n` +
        `📅 تاريخ التسجيل: ${new Date(user.createdAt).toLocaleDateString('ar')}`
      );
      break;

    case '🌟 العروض':
      bot.sendMessage(
        chatId,
        `🌟 *العروض والمكافآت*\n\n` +
        `🎁 عرض الترحيب: 100 NSP مجاناً!\n` +
        `💎 مكافأة يومية: سجل دخول يومي واحصل على نقاط\n` +
        `🏆 مسابقة أسبوعية: جوائز قيمة للفائزين\n\n` +
        `ترقبوا المزيد من العروض! 🎉`
      );
      break;
  }
});

// معالجة الأزرار الداخلية (Inline)
bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const userId = query.from.id;
  const data = query.data;

  switch (data) {
    case 'back_main':
      bot.sendMessage(chatId, '🏠 القائمة الرئيسية:', { reply_markup: getMainKeyboard() });
      break;
  }
  bot.answerCallbackQuery(query.id);
});

// أمر إهداء
bot.onText(/\/gift (\d+) (\d+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const targetId = parseInt(match[1]);
  const amount = parseInt(match[2]);
  const user = await getOrCreateUser(userId, msg.from.first_name);

  if (amount > user.balance) {
    bot.sendMessage(chatId, '❌ رصيدك غير كافٍ');
    return;
  }

  const targetUser = await getOrCreateUser(targetId, 'مستخدم');
  const senderRef = ref(db, `users/${userId}`);
  const targetRef = ref(db, `users/${targetId}`);

  await update(senderRef, { balance: user.balance - amount });
  await update(targetRef, { balance: targetUser.balance + amount });

  bot.sendMessage(chatId, `✅ تم إرسال ${amount} NSP بنجاح!`);
  bot.sendMessage(targetId, `🎁 تلقيت ${amount} NSP من مستخدم!`);
});

console.log('🤖 البوت شغال!');
console.log('✅ جميع الوظائف جاهزة');

// Keep-alive (عشان Render ما يطفي المشروع)
const http = require('http');
const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end('Bot is running!');
});
server.listen(process.env.PORT || 3000);
// ===== بوت الإدارة =====
const adminToken = process.env.ADMIN_BOT_TOKEN;
if (adminToken) {
  const adminBot = new TelegramBot(adminToken, { polling: true });
  const isAdmin = (id) => ADMIN_IDS.includes(id);
  const awaitingSearch = new Set();
  const fmt = (n) => Number(n || 0).toLocaleString('en-US');
  const adminKeyboard = {
    keyboard: [
      [{ text: '🚀 ستارت' }],
      [{ text: '📊 إحصائيات' }, { text: '👥 اللاعبون' }],
      [{ text: '🔍 بحث عن لاعب' }]
    ],
    resize_keyboard: true,
    is_persistent: true
  };

  adminBot.onText(/\/start/, (msg) => {
    if (!isAdmin(msg.from.id)) {
      adminBot.sendMessage(msg.chat.id, `🆔 رقم الـ ID تبعك: ${msg.from.id}`);
      return;
    }
    adminBot.sendMessage(msg.chat.id, '🛡️ لوحة الإدارة', { reply_markup: adminKeyboard });
  });

  adminBot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const adminId = msg.from.id;
    const text = msg.text;
    if (!text || text.startsWith('/') || !isAdmin(adminId)) return;
    try {
      if (text === '🚀 ستارت') {
        awaitingSearch.delete(adminId);
        adminBot.sendMessage(chatId, '🛡️ لوحة الإدارة', { reply_markup: adminKeyboard });
      } else if (text === '🔍 بحث عن لاعب') {
        awaitingSearch.add(adminId);
        adminBot.sendMessage(chatId, '🔍 أرسل ID اللاعب (أرقام فقط):');
      } else if (text === '📊 إحصائيات') {
        awaitingSearch.delete(adminId);
        const snap = await get(ref(db, 'users'));
        const users = snap.exists() ? Object.values(snap.val()) : [];
        let bal = 0, dep = 0, wd = 0;
        users.forEach(u => { bal += u.balance || 0; dep += u.totalDeposits || 0; wd += u.totalWithdrawals || 0; });
        adminBot.sendMessage(chatId,
          `📊 الإحصائيات\n\n` +
          `👥 عدد اللاعبين: ${fmt(users.length)}\n` +
          `💰 مجموع الأرصدة: ${fmt(bal)} NSP\n` +
          `📥 مجموع الإيداعات: ${fmt(dep)}\n` +
          `📤 مجموع السحوبات: ${fmt(wd)}`);
      } else if (text === '👥 اللاعبون') {
        awaitingSearch.delete(adminId);
        const snap = await get(ref(db, 'users'));
        if (!snap.exists()) { adminBot.sendMessage(chatId, 'ما في لاعبين بعد.'); return; }
        const list = Object.entries(snap.val())
          .map(([id, u]) => ({ id, name: u.name || '-', balance: u.balance || 0 }))
          .sort((a, b) => b.balance - a.balance)
          .slice(0, 20);
        const lines = list.map((u, i) => `${i + 1}. ${u.name} | ${u.id} | ${fmt(u.balance)} NSP`);
        adminBot.sendMessage(chatId, `👥 أعلى 20 رصيد:\n\n${lines.join('\n')}`);
      } else if (awaitingSearch.has(adminId)) {
        awaitingSearch.delete(adminId);
        const id = text.trim();
        if (!/^\d+$/.test(id)) { adminBot.sendMessage(chatId, '❌ ID غير صالح.'); return; }
        const snap = await get(ref(db, `users/${id}`));
        if (!snap.exists()) { adminBot.sendMessage(chatId, '❌ ما لقيت هالـ ID.'); return; }
        const u = snap.val();
        adminBot.sendMessage(chatId,
          `👤 ${u.name || '-'}\n🆔 ${id}\n\n` +
          `💰 الرصيد: ${fmt(u.balance)} NSP\n` +
          `📥 إيداعات: ${fmt(u.totalDeposits)}\n` +
          `📤 سحوبات: ${fmt(u.totalWithdrawals)}\n` +
          `🎰 لفات: ${fmt(u.totalSpins)} | 🏆 ربح: ${fmt(u.totalWins)}\n` +
          `📅 التسجيل: ${u.createdAt ? new Date(u.createdAt).toLocaleDateString('ar') : '-'}`);
      }
    } catch (e) {
      adminBot.sendMessage(chatId, `❌ خطأ بالقراءة: ${e.message}`);
    }
  });
  console.log('🛡️ بوت الإدارة شغال');
}

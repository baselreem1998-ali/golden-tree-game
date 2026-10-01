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
      bot.sendMessage(chatId, 'اختر طريقة السحب:', { reply_markup: getWithdrawKeyboard() });
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
  // --- موافقة/رفض طلبات السحب (إضافة جديدة) ---
  adminBot.on('callback_query', async (query) => {
    if (!isAdmin(query.from.id)) {
      adminBot.answerCallbackQuery(query.id, { text: 'غير مصرّح' });
      return;
    }
    const m = (query.data || '').match(/^wd(ok|no)_(.+)$/);
    if (!m) { adminBot.answerCallbackQuery(query.id); return; }
    const approve = m[1] === 'ok';
    const key = m[2];
    try {
      let req = null;
      const res = await runTransaction(ref(db, `withdrawals/${key}`), (r) => {
        if (r === null) return r;
        if (r.status !== 'pending') return;
        req = { ...r };
        r.status = approve ? 'approved' : 'rejected';
        r.resolvedAt = Date.now();
        return r;
      });
      if (!res.committed || !req) {
        adminBot.answerCallbackQuery(query.id, { text: 'تمت معالجة هذا الطلب مسبقاً' });
        return;
      }
      if (approve) {
        await runTransaction(ref(db, `users/${req.userId}/totalWithdrawals`), (t) => (t || 0) + req.amount);
        bot.sendMessage(req.userId, `✅ تمت الموافقة على طلب السحب\n💰 ${num(req.amount)} ل.س\nسيصلك المبلغ قريباً.`).catch(() => {});
      } else {
        await runTransaction(ref(db, `users/${req.userId}/balance`), (b) => (b || 0) + req.amount);
        bot.sendMessage(req.userId, `❌ تم رفض طلب السحب وأُعيد ${num(req.amount)} ل.س إلى رصيدك.`).catch(() => {});
      }
      await adminBot.editMessageText(
        `${query.message.text}\n\n${approve ? '✅ تمت الموافقة' : '❌ تم الرفض وأُعيد الرصيد'}`,
        { chat_id: query.message.chat.id, message_id: query.message.message_id }
      );
      adminBot.answerCallbackQuery(query.id, { text: 'تم' });
    } catch (e) {
      adminBot.answerCallbackQuery(query.id, { text: `خطأ: ${e.message}` });
    }
  });
  console.log('🛡️ بوت الإدارة شغال');
}

// ===== نافذة السحب (إضافة جديدة) =====
const { runTransaction, push } = require('firebase/database');
const adminSender = process.env.ADMIN_BOT_TOKEN ? new TelegramBot(process.env.ADMIN_BOT_TOKEN) : null;
const WD = {
  syr: { name: 'سيرياتيل كاش', min: 50000, max: 500000 },
  sham: { name: 'شام كاش', min: 100000, max: null }
};
const wdState = new Map();
const num = (n) => Number(n || 0).toLocaleString('en-US');
const toEn = (s) => s.replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
const MAIN_BUTTONS = [
  '🎮 دخول الى الألعاب', '📥 شحن رصيد من البوت', '📤 سحب رصيد من البوت',
  '🎁 إهداء رصيد', '🎟️ كود هدية', '✉️ تواصل مع الدعم',
  '👥 الإحالات', '🔄 السجل', '🌟 العروض'
];

function getWithdrawKeyboard() {
  return {
    inline_keyboard: [
      [{ text: '📲 سيرياتيل كاش', callback_data: 'wd_syr' }],
      [{ text: '💳 شام كاش', callback_data: 'wd_sham' }],
      [{ text: '➡️ الرجوع للقائمة الرئيسية', callback_data: 'back_main' }]
    ]
  };
}

bot.onText(/^\/start/, (msg) => { wdState.delete(msg.from.id); });
bot.onText(/^\/cancel/, (msg) => {
  wdState.delete(msg.from.id);
  bot.sendMessage(msg.chat.id, 'تم إلغاء العملية الحالية.');
});

bot.on('callback_query', (query) => {
  if (query.data !== 'wd_syr' && query.data !== 'wd_sham') return;
  const method = query.data.slice(3);
  const w = WD[method];
  wdState.set(query.from.id, { step: 'account', method });
  const limits = w.max
    ? `الحد الأدنى للسحب ${num(w.min)} ل.س والحد الأقصى ${num(w.max)} ل.س`
    : `الحد الأدنى للسحب ${num(w.min)} ل.س`;
  const ask = method === 'syr'
    ? 'أدخل رقم سيرياتيل كاش الذي تريد السحب إليه (10 أرقام يبدأ بـ 09):'
    : 'ارسل عنوان الشام كاش الذي ترغب في استقبال أرباحك عليه';
  bot.sendMessage(query.message.chat.id, `${limits}\n\n${ask}`);
});

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const text = msg.text;
  const st = wdState.get(userId);
  if (!st || !text || text.startsWith('/')) return;
  if (MAIN_BUTTONS.includes(text)) { wdState.delete(userId); return; }
  const input = toEn(text.trim());
  const w = WD[st.method];

  try {
    if (st.step === 'account') {
      if (st.method === 'syr' && !/^09\d{8}$/.test(input)) {
        bot.sendMessage(chatId, '❌ الرقم غير صحيح. أدخل 10 أرقام يبدأ بـ 09:');
        return;
      }
      if (st.method === 'sham' && !/^[A-Za-z0-9]{20,64}$/.test(input)) {
        bot.sendMessage(chatId, '❌ العنوان غير صحيح. أعد إرسال عنوان الشام كاش:');
        return;
      }
      st.account = input;
      st.step = 'amount';
      if (st.method === 'syr') {
        bot.sendMessage(chatId, '💰 ارسل القيمة المراد سحبها');
      } else {
        bot.sendMessage(chatId, `✅ تم استلام العنوان:\n${input}\n\nالآن ادخل المبلغ الذي تريد سحبه:`);
      }
      return;
    }

    if (st.step === 'amount') {
      const amount = parseInt(input, 10);
      if (!/^\d+$/.test(input) || amount <= 0) {
        bot.sendMessage(chatId, '❌ أدخل مبلغاً صحيحاً (أرقام فقط).');
        return;
      }
      if (amount < w.min || (w.max && amount > w.max)) {
        const range = w.max ? `بين ${num(w.min)} و ${num(w.max)}` : `${num(w.min)} على الأقل`;
        bot.sendMessage(chatId, `❌ المبلغ يجب أن يكون ${range} ل.س`);
        return;
      }

      let reason = null;
      let before = 0;
      const res = await runTransaction(ref(db, `users/${userId}`), (u) => {
        reason = null;
        if (u === null) return u;
        const bal = typeof u.balance === 'number' ? u.balance : 0;
        before = bal;
        if (bal < amount) { reason = 'nobal'; return; }
        u.balance = bal - amount;
        return u;
      });

      if (!res.committed) {
        wdState.delete(userId);
        if (reason === 'nobal') {
          bot.sendMessage(chatId, `❌ لا يوجد رصيد كافٍ. رصيدك الحالي: ${num(before)} ليرة`);
        } else if (reason === 'nodep') {
          bot.sendMessage(chatId, `❌ السحب متاح بعد أول عملية شحن.\n💰 رصيدك الحالي: ${num(before)} ليرة`);
        } else {
          bot.sendMessage(chatId, '❌ حدث خطأ، حاول مرة أخرى.');
        }
        return;
      }

      const reqRef = push(ref(db, 'withdrawals'));
      try {
        await set(reqRef, {
          userId, name: msg.from.first_name || '', method: st.method,
          account: st.account, amount, status: 'pending', createdAt: Date.now()
        });
      } catch (e) {
        await runTransaction(ref(db, `users/${userId}/balance`), (b) => (b || 0) + amount);
        wdState.delete(userId);
        bot.sendMessage(chatId, '❌ تعذّر إرسال الطلب، أُعيد المبلغ لرصيدك. حاول مرة أخرى.');
        return;
      }

      wdState.delete(userId);
      bot.sendMessage(chatId,
        `✅ تم إرسال طلب السحب\n\n💳 ${w.name}\n📍 ${st.account}\n💰 ${num(amount)} ل.س\n\nسيتم مراجعته من الإدارة قريباً.`);

      if (adminSender) {
        const adminMsg =
          `📤 طلب سحب جديد\n\n👤 ${msg.from.first_name || '-'} | ${userId}\n` +
          `💳 ${w.name}\n📍 ${st.account}\n💰 ${num(amount)} ل.س\n` +
          `🧾 رصيده قبل: ${num(before)} | بعد: ${num(before - amount)}`;
        const kb = { inline_keyboard: [[
          { text: '✅ موافقة', callback_data: `wdok_${reqRef.key}` },
          { text: '❌ رفض', callback_data: `wdno_${reqRef.key}` }
        ]] };
        for (const adminId of ADMIN_IDS) {
          adminSender.sendMessage(adminId, adminMsg, { reply_markup: kb }).catch((e) => console.log('admin notify error:', e.message));
        }
      }
    }
  } catch (e) {
    console.log('withdraw error:', e.message);
    bot.sendMessage(chatId, '❌ حدث خطأ، حاول مرة أخرى.');
  }
});

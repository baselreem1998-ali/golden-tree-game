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
  return { remove_keyboard: true };
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
    `💰 رصيدك: *${user.botBalance || 0}* NSP\n\n` +
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
        `💰 رصيدك: *${user.botBalance || 0}* NSP\n\n` +
        `اضغطي "لعب الآن" وابدئي مباشرة:`,
        { parse_mode: 'Markdown', reply_markup: getGamesKeyboard() }
      );
      break;

    case '📥 شحن رصيد من البوت':
      bot.sendMessage(chatId, 'اختر طريقة الشحن:', { reply_markup: getDepositKeyboard() });
      break;

    case '📤 سحب رصيد من البوت':
      bot.sendMessage(chatId, 'اختر طريقة السحب:', { reply_markup: getWithdrawKeyboard() });
      break;

    case '🎁 إهداء رصيد':
      bot.sendMessage(
        chatId,
        `🎁 *إهداء رصيد لمستخدم آخر*\n\n` +
        `💰 رصيدك: *${user.botBalance || 0}* NSP\n\n` +
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
        `💰 رصيدك الحالي: ${user.botBalance || 0}\n\n` +
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
      bot.sendMessage(chatId, '🏠 القائمة الرئيسية:', { reply_markup: getMainMenu() });
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

  if (amount > (user.botBalance || 0)) {
    bot.sendMessage(chatId, '❌ رصيدك غير كافٍ');
    return;
  }

  const targetUser = await getOrCreateUser(targetId, 'مستخدم');
  const senderRef = ref(db, `users/${userId}`);
  const targetRef = ref(db, `users/${targetId}`);

  await update(senderRef, { botBalance: (user.botBalance || 0) - amount });
  await update(targetRef, { botBalance: (targetUser.botBalance || 0) + amount });

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
        await runTransaction(ref(db, `users/${req.userId}/botBalance`), (b) => (b || 0) + req.amount);
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
  // --- تأكيد/رفض طلبات الشحن (إضافة جديدة) ---
  adminBot.on('callback_query', async (query) => {
    if (!isAdmin(query.from.id)) return;
    const m = (query.data || '').match(/^dp(ok|no)_(.+)$/);
    if (!m) return;
    const approve = m[1] === 'ok';
    const key = m[2];
    const chatId = query.message.chat.id;
    try {
      let req = null;
      const res = await runTransaction(ref(db, `bot_deposits/${key}`), (r) => {
        if (r === null) return r;
        if (r.status !== 'pending') return;
        req = { ...r };
        r.status = approve ? 'approved' : 'rejected';
        r.resolvedAt = Date.now();
        return r;
      });
      if (!res.committed || !req) {
        adminBot.sendMessage(chatId, 'تمت معالجة هذا الطلب مسبقاً.').catch(() => {});
        return;
      }
      if (approve) {
        const u = await runTransaction(ref(db, `users/${req.userId}`), (x) => {
          if (x === null) return x;
          x.botBalance = (x.botBalance || 0) + req.amountNSP;
          x.totalDeposits = (x.totalDeposits || 0) + req.amountNSP;
          return x;
        });
        const val = u.snapshot.val();
        if (!val) throw new Error('المستخدم غير موجود، لم يُضَف الرصيد');
        bot.sendMessage(req.userId,
          `✅ تم شحن رصيدك بقيمة ${num(req.amountNSP)} NSP\n💰 رصيد محفظة البوت: ${num(val.botBalance)} NSP`).catch(() => {});
      } else {
        await set(ref(db, `bot_tx_index/${req.method}_${req.txId}`), null);
        bot.sendMessage(req.userId,
          `❌ لم يتم تأكيد عملية الشحن\n\nالرجاء التأكد من رقم العملية والقيمة المرسلة، ربما حدث خلط، ثم أعد المحاولة.`).catch(() => {});
      }
      await adminBot.editMessageText(
        `${query.message.text}\n\n${approve ? '✅ تم التأكيد وأُضيف الرصيد' : '❌ تم الرفض'}`,
        { chat_id: chatId, message_id: query.message.message_id }
      );
    } catch (e) {
      adminBot.sendMessage(chatId, `❌ خطأ: ${e.message}`).catch(() => {});
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
  '👥 الإحالات', '🔄 السجل', '🌟 العروض', '➕ شحن حساب اللعبة', '➖ سحب من حساب اللعبة',
  '🆕 إنشاء حساب', '👤 معلومات حسابي', '🚀 ستارت'
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
        const bal = typeof u.botBalance === 'number' ? u.botBalance : 0;
        before = bal;
        if (bal < amount) { reason = 'nobal'; return; }
        u.botBalance = bal - amount;
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
        await runTransaction(ref(db, `users/${userId}/botBalance`), (b) => (b || 0) + amount);
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

// ===== نافذة الشحن (إضافة جديدة) =====
const dpFs = require('fs');
const dpPath = require('path');
const SYR_CODES = ['00525989', '43833398'];
const SHAM_ADDRESS = 'afeb9f1352b9d297ab8e553ff5eb01e2';
const SHAM_QR_FILE = dpPath.join(__dirname, 'shamcash-qr.jpg');
const DP_MIN = 200;   // أقل شحنة بالعملة الجديدة
const DP_RATE = 100;  // 200 = 20,000 NSP
const DP_METHODS = { syr: 'سيرياتيل كاش', sham: 'شام كاش' };
const dpState = new Map();

function getDepositKeyboard() {
  return {
    inline_keyboard: [
      [{ text: '📲 سيرياتيل كاش', callback_data: 'dp_syr' }],
      [{ text: '💳 شام كاش', callback_data: 'dp_sham' }],
      [{ text: '➡️ الرجوع للقائمة الرئيسية', callback_data: 'back_main' }]
    ]
  };
}

bot.onText(/^\/(cancel|start)/, (msg) => { dpState.delete(msg.from.id); });

bot.on('callback_query', async (query) => {
  const data = query.data || '';
  const userId = query.from.id;
  const chatId = query.message.chat.id;
  try {
    if (data === 'dp_syr' || data === 'dp_sham') {
      dpState.set(userId, { step: 'amount', method: data.slice(3) });
      bot.sendMessage(chatId,
        `الحد الأدنى للشحن بهذه الطريقة: ${num(DP_MIN)} ل.س\n\n` +
        `شحن يدوي - الرجاء قراءة التعليمات بدقة\n\n` +
        `قم بإدخال المبلغ الذي تريد إرساله بالضبط:`);
      return;
    }
    if (data.startsWith('dpc_')) {
      const st = dpState.get(userId);
      if (!st || st.step !== 'code') return;
      st.code = SYR_CODES[parseInt(data.slice(4), 10)] || 'غير محدد';
      st.step = 'tx';
      bot.sendMessage(chatId, 'الآن قم بإدخال رقم العملية المكون من 12 رقم:');
      return;
    }
    if (data === 'dpqr') {
      if (dpFs.existsSync(SHAM_QR_FILE)) {
        await bot.sendPhoto(chatId, dpFs.createReadStream(SHAM_QR_FILE), { caption: 'رمز QR لحساب شام كاش' });
      } else {
        bot.sendMessage(chatId, `عنوان الحساب:\n<code>${SHAM_ADDRESS}</code>`, { parse_mode: 'HTML' });
      }
    }
  } catch (e) { console.log('deposit cb error:', e.message); }
});

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const text = msg.text;
  const st = dpState.get(userId);
  if (!st || !text || text.startsWith('/')) return;
  if (MAIN_BUTTONS.includes(text)) { dpState.delete(userId); return; }
  const input = toEn(text.trim());

  try {
    if (st.step === 'amount') {
      const amount = parseInt(input, 10);
      if (!/^\d+$/.test(input) || amount < DP_MIN) {
        bot.sendMessage(chatId, `❌ المبلغ غير صحيح. الحد الأدنى ${num(DP_MIN)} ل.س، أدخل أرقاماً فقط:`);
        return;
      }
      st.amount = amount;
      if (st.method === 'syr') {
        st.step = 'code';
        bot.sendMessage(chatId,
          `شحن سيرياتيل كاش - تحويل يدوي\n\n` +
          `الآن: قم باختيار أحد الأكواد التالية:\n\n` +
          SYR_CODES.map((c) => `• <code>${c}</code>`).join('\n') +
          `\n\nثم قم بتحويل المبلغ (${num(amount)} ل.س) إليه.\n` +
          `بعد القيام بالتحويل، اضغط على زر الكود الذي قمت بالتحويل إليه.\n\n` +
          `أو اضغط على زر "لم أجد الكود" إذا قمت بالتحويل ولم يكن الكود في القائمة.`,
          {
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [
                ...SYR_CODES.map((c, i) => [{ text: `📲 ${c}`, callback_data: `dpc_${i}` }]),
                [{ text: '🔎 لم أجد الكود', callback_data: 'dpc_x' }]
              ]
            }
          });
      } else {
        st.step = 'tx';
        bot.sendMessage(chatId,
          `لشحن رصيدك عبر شام كاش، أرسل المبلغ (${num(amount)} ل.س) إلى الحساب أدناه:\n\n` +
          `<code>${SHAM_ADDRESS}</code>\n\n` +
          `بعد التحويل، ارسل رقم العملية هنا`,
          {
            parse_mode: 'HTML',
            reply_markup: { inline_keyboard: [[{ text: '📷 إظهار رمز QR للحساب', callback_data: 'dpqr' }]] }
          });
      }
      return;
    }

    if (st.step === 'tx') {
      const re = st.method === 'syr' ? /^\d{12}$/ : /^\d{6,15}$/;
      if (!re.test(input)) {
        bot.sendMessage(chatId, st.method === 'syr'
          ? '❌ رقم العملية غير صحيح. أدخل 12 رقماً:'
          : '❌ رقم العملية غير صحيح. أدخل أرقام العملية فقط:');
        return;
      }
      const reqRef = push(ref(db, 'bot_deposits'));
      const idxPath = `bot_tx_index/${st.method}_${input}`;
      const idx = await runTransaction(ref(db, idxPath), (cur) => (cur === null ? reqRef.key : undefined));
      if (!idx.committed) {
        dpState.delete(userId);
        bot.sendMessage(chatId, '❌ رقم العملية هذا مستخدم من قبل.');
        return;
      }
      const nsp = st.amount * DP_RATE;
      try {
        await set(reqRef, {
          userId, name: msg.from.first_name || '', method: st.method, code: st.code || '',
          txId: input, amount: st.amount, amountNSP: nsp, status: 'pending', createdAt: Date.now()
        });
      } catch (e) {
        await set(ref(db, idxPath), null);
        dpState.delete(userId);
        bot.sendMessage(chatId, '❌ تعذّر إرسال الطلب، حاول مرة أخرى.');
        return;
      }
      dpState.delete(userId);
      bot.sendMessage(chatId,
        `✅ تم استلام طلب الشحن\n\n💳 ${DP_METHODS[st.method]}\n🧾 رقم العملية: ${input}\n` +
        `💰 ${num(st.amount)} ل.س (= ${num(nsp)} NSP)\n\nسيتم مراجعته من الإدارة وإضافة الرصيد قريباً.`);

      if (adminSender) {
        const adminMsg =
          `📥 طلب شحن جديد\n\n👤 ${msg.from.first_name || '-'} | ${userId}\n` +
          `💳 ${DP_METHODS[st.method]}${st.code ? `\n🏷️ الكود: ${st.code}` : ''}\n` +
          `🧾 رقم العملية: ${input}\n💰 ${num(st.amount)} ل.س (= ${num(nsp)} NSP)`;
        const kb = { inline_keyboard: [[
          { text: '✅ تأكيد', callback_data: `dpok_${reqRef.key}` },
          { text: '❌ رفض', callback_data: `dpno_${reqRef.key}` }
        ]] };
        for (const adminId of ADMIN_IDS) {
          adminSender.sendMessage(adminId, adminMsg, { reply_markup: kb }).catch((e) => console.log('admin notify error:', e.message));
        }
      }
    }
  } catch (e) {
    console.log('deposit error:', e.message);
    bot.sendMessage(chatId, '❌ حدث خطأ، حاول مرة أخرى.');
  }
});

// ===== نقل الرصيد بين محفظة البوت ورصيد اللعبة (إضافة جديدة) =====
const GW_MIN = 20000; // أقل مبلغ للنقل بالاتجاهين (بالـ NSP)
const GW_IN_BTN = '➕ شحن حساب اللعبة';
const GW_OUT_BTN = '➖ سحب من حساب اللعبة';
const gwState = new Map();

async function gwBalances(userId) {
  const snap = await get(ref(db, `users/${userId}`));
  const u = snap.exists() ? snap.val() : {};
  return {
    wallet: typeof u.botBalance === 'number' ? u.botBalance : 0,
    game: typeof u.balance === 'number' ? u.balance : 0
  };
}

// نقل ذرّي (transaction واحد): الخصم والإضافة بنفس اللحظة
async function gwTransfer(userId, dir, amount) {
  let r = { ok: false, reason: 'err' };
  const from = dir === 'in' ? 'botBalance' : 'balance';
  const to = dir === 'in' ? 'balance' : 'botBalance';
  const res = await runTransaction(ref(db, `users/${userId}`), (u) => {
    r = { ok: false, reason: 'err' };
    if (u === null) return u;
    const have = typeof u[from] === 'number' ? u[from] : 0;
    const amt = amount === 'all' ? have : amount;
    if (amt <= 0 || amt > have) { r = { ok: false, reason: 'nobal', have }; return; }
    if (amt < GW_MIN) { r = { ok: false, reason: 'min', have }; return; }
    u[from] = have - amt;
    u[to] = (typeof u[to] === 'number' ? u[to] : 0) + amt;
    r = { ok: true, amt, wallet: u.botBalance || 0, game: u.balance || 0 };
    return u;
  });
  if (res.committed && r.ok) return r;
  return r.ok ? { ok: false, reason: 'err' } : r;
}

function gwReply(chatId, dir, r, userId) {
  if (r.ok) {
    gwState.delete(userId);
    const where = dir === 'in' ? 'إلى رصيد اللعبة' : 'إلى محفظة البوت';
    bot.sendMessage(chatId,
      `✅ تم نقل ${num(r.amt)} NSP ${where}\n\n💼 محفظة البوت: ${num(r.wallet)} NSP\n🎮 رصيد اللعبة: ${num(r.game)} NSP`,
      dir === 'in' ? { reply_markup: getGamesKeyboard() } : undefined);
  } else if (r.reason === 'nobal') {
    bot.sendMessage(chatId, `❌ المبلغ أكبر من المتاح (${num(r.have)} NSP). أرسل مبلغاً أصغر:`);
  } else if (r.reason === 'min') {
    bot.sendMessage(chatId, `❌ أقل مبلغ للنقل ${num(GW_MIN)} NSP.`);
  } else {
    gwState.delete(userId);
    bot.sendMessage(chatId, '❌ حدث خطأ، حاول مرة أخرى.');
  }
}

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const text = msg.text;
  if (!text || text.startsWith('/')) return;
  try {
    if (text === GW_IN_BTN || text === GW_OUT_BTN) {
      const dir = text === GW_IN_BTN ? 'in' : 'out';
      const b = await gwBalances(userId);
      const have = dir === 'in' ? b.wallet : b.game;
      const head = `💼 محفظة البوت: ${num(b.wallet)} NSP\n🎮 رصيد اللعبة: ${num(b.game)} NSP\n\n`;
      if (have < GW_MIN) {
        gwState.delete(userId);
        bot.sendMessage(chatId, head + (dir === 'in'
          ? `❌ أقل مبلغ للنقل إلى اللعبة ${num(GW_MIN)} NSP، ومحفظتك أقل من ذلك.`
          : `❌ أقل مبلغ للسحب من اللعبة ${num(GW_MIN)} NSP، ورصيد اللعبة أقل من ذلك.`));
        return;
      }
      gwState.set(userId, { dir });
      const ask = dir === 'in'
        ? `أرسل المبلغ الذي تريد نقله إلى اللعبة (أقل شيء ${num(GW_MIN)}):`
        : `أرسل المبلغ الذي تريد سحبه من اللعبة إلى محفظة البوت (أقل شيء ${num(GW_MIN)}):`;
      const btnText = dir === 'in' ? `💯 شحن كامل الرصيد (${num(have)})` : `💯 سحب كامل الرصيد (${num(have)})`;
      bot.sendMessage(chatId, head + ask + '\n\n⚠️ أغلق اللعبة قبل العملية.', {
        reply_markup: { inline_keyboard: [[{ text: btnText, callback_data: dir === 'in' ? 'gw_in_all' : 'gw_out_all' }]] }
      });
      return;
    }

    const st = gwState.get(userId);
    if (!st) return;
    if (MAIN_BUTTONS.includes(text)) { gwState.delete(userId); return; }
    const input = toEn(text.trim());
    if (!/^\d+$/.test(input) || parseInt(input, 10) <= 0) {
      bot.sendMessage(chatId, '❌ أدخل مبلغاً صحيحاً (أرقام فقط).');
      return;
    }
    const r = await gwTransfer(userId, st.dir, parseInt(input, 10));
    gwReply(chatId, st.dir, r, userId);
  } catch (e) {
    console.log('game wallet error:', e.message);
    bot.sendMessage(chatId, '❌ حدث خطأ، حاول مرة أخرى.').catch(() => {});
  }
});

bot.on('callback_query', async (query) => {
  if (query.data !== 'gw_in_all' && query.data !== 'gw_out_all') return;
  const userId = query.from.id;
  const chatId = query.message.chat.id;
  const dir = query.data === 'gw_in_all' ? 'in' : 'out';
  try {
    const r = await gwTransfer(userId, dir, 'all');
    gwReply(chatId, dir, r, userId);
  } catch (e) {
    console.log('game wallet error:', e.message);
    bot.sendMessage(chatId, '❌ حدث خطأ، حاول مرة أخرى.').catch(() => {});
  }
});

// ===== إنشاء حساب + معلومات حسابي (إضافة جديدة) =====
const AC_CREATE_BTN = '🆕 إنشاء حساب';
const AC_INFO_BTN = '👤 معلومات حسابي';
const AC_BONUS = 10000; // مكافأة إنشاء الحساب (تنزل بمحفظة البوت)
const acState = new Map();
const acEsc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const AC_TERMS =
  `🌳 أهلاً بك في Tree of Chronos\n\n` +
  `لاستخدام البوت يجب الموافقة على الشروط التالية:\n\n` +
  `📜 الشروط والأحكام\n\n` +
  `1️⃣ حسابك مسؤوليتك: احتفظ باسم المستخدم وكلمة المرور ولا تشاركهما مع أحد، ولا تستخدم كلمة سر من حساباتك الحقيقية الأخرى.\n\n` +
  `2️⃣ حساب واحد لكل شخص: إنشاء أكثر من حساب أو أي نشاط احتيالي يعرّض الحسابات للإيقاف وتجميد الرصيد.\n\n` +
  `3️⃣ الشحن والسحب يدويان: كل طلب تتم مراجعته من الإدارة وقد يستغرق بعض الوقت، فتأكد من رقم العملية والمبلغ قبل الإرسال.\n\n` +
  `4️⃣ تحتفظ الإدارة بحق رفض أي عملية أو إيقاف أي حساب عند الاشتباه بمخالفة الشروط.\n\n` +
  `5️⃣ الألعاب للتسلية، وأنت المسؤول عن قرارك باللعب وعن المبالغ التي تشحنها.\n\n` +
  `6️⃣ قد تتغير هذه الشروط في أي وقت، واستمرارك باستخدام البوت يعني موافقتك عليها.\n\n` +
  `بضغطك على «${AC_CREATE_BTN}» فأنت توافق على الشروط، وتحصل على مكافأة ترحيبية 🎁`;

async function acShowInfo(chatId, userId) {
  const snap = await get(ref(db, `users/${userId}`));
  const u = snap.exists() ? snap.val() : {};
  if (!u.accountId) {
    bot.sendMessage(chatId, `❌ ليس لديك حساب بعد.\nاضغط «${AC_CREATE_BTN}» لإنشاء حساب.`);
    return;
  }
  bot.sendMessage(chatId,
    `👤 <b>معلومات حسابي</b>\n\n` +
    `معرّف الحساب: <code>${acEsc(u.accountId)}</code>\n` +
    `معرّف التليغرام: <code>${userId}</code>\n` +
    `اسم الحساب: <code>${acEsc(u.accountName)}</code>\n` +
    `كلمة السر: <code>${acEsc(u.password)}</code>\n\n` +
    `💼 رصيد محفظة البوت: ${num(u.botBalance)} NSP`,
    { parse_mode: 'HTML' });
}

// رسالة الترحيب + الشروط لمن ليس لديه حساب
bot.onText(/^\/start/, async (msg) => {
  acState.delete(msg.from.id);
  try {
    const user = await getOrCreateUser(msg.from.id, msg.from.first_name);
    if (user.accountId) return;
    setTimeout(() => { bot.sendMessage(msg.chat.id, AC_TERMS).catch(() => {}); }, 1200);
  } catch (e) { console.log('terms error:', e.message); }
});

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const text = msg.text;
  if (!text || text.startsWith('/')) return;
  try {
    if (text === AC_INFO_BTN) {
      acState.delete(userId);
      await acShowInfo(chatId, userId);
      return;
    }
    if (text === AC_CREATE_BTN) {
      const snap = await get(ref(db, `users/${userId}`));
      const u = snap.exists() ? snap.val() : {};
      if (u.accountId) {
        acState.delete(userId);
        bot.sendMessage(chatId, '✅ لديك حساب بالفعل.');
        await acShowInfo(chatId, userId);
        return;
      }
      acState.set(userId, { step: 'username' });
      bot.sendMessage(chatId, 'الرجاء إدخال اسم المستخدم الذي تريده:\n(من 3 إلى 20 حرفاً: أحرف وأرقام و _ فقط)');
      return;
    }

    const st = acState.get(userId);
    if (!st) return;
    if (MAIN_BUTTONS.includes(text)) { acState.delete(userId); return; }
    const input = text.trim();

    if (st.step === 'username') {
      if (!/^[A-Za-z0-9_\u0600-\u06FF]{3,20}$/.test(input)) {
        bot.sendMessage(chatId, '❌ الاسم غير صالح. استخدم من 3 إلى 20 حرفاً (أحرف وأرقام و _ فقط، بدون مسافات):');
        return;
      }
      st.username = input;
      st.step = 'password';
      bot.sendMessage(chatId, 'الرجاء إدخال كلمة المرور التي تريدها لحسابك (6 أحرف أو أكثر):');
      return;
    }

    if (st.step === 'password') {
      if (input.length < 6 || input.length > 30 || /\s/.test(input)) {
        bot.sendMessage(chatId, '❌ كلمة المرور يجب أن تكون من 6 إلى 30 حرفاً بدون مسافات. أعد الإدخال:');
        return;
      }
      bot.deleteMessage(chatId, msg.message_id).catch(() => {});
      const accountName = `${st.username}_${Math.floor(1000 + Math.random() * 9000)}`;
      const accountId = Math.floor(100000000 + Math.random() * 900000000);
      let r = { ok: false };
      const res = await runTransaction(ref(db, `users/${userId}`), (u) => {
        r = { ok: false };
        if (u === null) return u;
        if (u.accountId) { r = { ok: false, exists: true }; return; }
        u.accountId = accountId;
        u.accountName = accountName;
        u.username = st.username;
        u.password = input;
        u.accountCreatedAt = Date.now();
        u.botBalance = (typeof u.botBalance === 'number' ? u.botBalance : 0) + AC_BONUS;
        r = { ok: true, wallet: u.botBalance };
        return u;
      });
      acState.delete(userId);
      if (!res.committed || !r.ok) {
        bot.sendMessage(chatId, r.exists ? '✅ لديك حساب بالفعل.' : '❌ حدث خطأ، حاول مرة أخرى.');
        return;
      }
      await bot.sendMessage(chatId,
        `معرّف الحساب: <code>${accountId}</code>\n` +
        `معرّف التليغرام: <code>${userId}</code>\n` +
        `اسم الحساب: <code>${acEsc(accountName)}</code>\n` +
        `كلمة السر: <code>${acEsc(input)}</code>\n` +
        `✅ تم إنشاء الحساب بنجاح`,
        { parse_mode: 'HTML' });
      bot.sendMessage(chatId,
        `💰 لقد حصلت على مكافأة إنشاء حساب بقيمة ${num(AC_BONUS)} NSP!\nرصيد محفظة البوت الجديد: ${num(r.wallet)} NSP`);
    }
  } catch (e) {
    console.log('account error:', e.message);
    bot.sendMessage(chatId, '❌ حدث خطأ، حاول مرة أخرى.').catch(() => {});
  }
});

// ===== القائمة الرئيسية (inline) + زر ستارت الثابت (إضافة جديدة) =====
const MENU_START_BTN = '🚀 ستارت';
const MENU_ITEMS = [
  '🆕 إنشاء حساب', '👤 معلومات حسابي', '🎮 دخول الى الألعاب',
  '📥 شحن رصيد من البوت', '📤 سحب رصيد من البوت',
  '➕ شحن حساب اللعبة', '➖ سحب من حساب اللعبة',
  '🎁 إهداء رصيد', '🎟️ كود هدية',
  '✉️ تواصل مع الدعم', '👥 الإحالات',
  '🔄 السجل', '🌟 العروض'
];

function getMainMenu() {
  const rows = [[0], [1], [2], [3, 4], [5, 6], [7, 8], [9, 10], [11, 12]];
  return {
    inline_keyboard: rows.map((r) => r.map((i) => ({ text: MENU_ITEMS[i], callback_data: `mn_${i}` })))
  };
}

// بعد /start: القائمة الرئيسية (بعد رسالة الترحيب والشروط)
bot.onText(/^\/start/, (msg) => {
  gwState.delete(msg.from.id);
  setTimeout(() => {
    bot.sendMessage(msg.chat.id, '🏠 القائمة الرئيسية:', { reply_markup: getMainMenu() }).catch(() => {});
  }, 2000);
});

// زر ستارت الثابت
bot.on('message', (msg) => {
  if (msg.text !== MENU_START_BTN) return;
  bot.sendMessage(msg.chat.id, '🏠 القائمة الرئيسية:', { reply_markup: getMainMenu() }).catch(() => {});
});

// ضغطة زر من القائمة = نفس ضغط الزر النصي القديم (نفس المعالجات بدون تغيير)
bot.on('callback_query', (query) => {
  const m = /^mn_(\d+)$/.exec(query.data || '');
  if (!m || !query.message) return;
  const text = MENU_ITEMS[parseInt(m[1], 10)];
  if (!text) return;
  bot.emit('message', {
    message_id: query.message.message_id,
    from: query.from,
    chat: query.message.chat,
    date: Math.floor(Date.now() / 1000),
    text
  });
});

// ===== قائمة الأوامر (زر القائمة) + حذف رسالة القائمة عند الاختيار =====
bot.setMyCommands([
  { command: 'start', description: 'بدء استخدام البوت' },
  { command: 'myaccount', description: 'معلومات حسابي' },
  { command: 'cancel', description: 'إلغاء العملية الحالية' }
]).catch(() => {});

bot.onText(/^\/myaccount/, (msg) => {
  acState.delete(msg.from.id);
  acShowInfo(msg.chat.id, msg.from.id).catch(() => {});
});

bot.onText(/^\/cancel/, (msg) => {
  gwState.delete(msg.from.id);
  acState.delete(msg.from.id);
});

// لما يختار زر، رسالة القوائم بتنحذف وبيطلع الخيار بس
bot.on('callback_query', (query) => {
  const d = query.data || '';
  if (!query.message) return;
  if (/^(mn_\d+|back_main|wd_syr|wd_sham|dp_syr|dp_sham|dpc_\d+|dpc_x|gw_in_all|gw_out_all)$/.test(d)) {
    bot.deleteMessage(query.message.chat.id, query.message.message_id).catch(() => {});
  }
});

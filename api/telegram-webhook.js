function generateMemberCode(userId) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'MB-';
  const seed = userId.toString();
  for (let i = 0; i < 6; i++) {
    const idx = (parseInt(seed[i % seed.length]) + i * 7) % chars.length;
    code += chars[idx];
  }
  return code;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const GROUP_ID = '-5113442583';
  const CHATBOT_URL = process.env.CHATBOT_URL || 'https://crypto-edu-bot.vercel.app';

  try {
    const update = req.body;

    // Handle /start di DM bot
    if (update.message) {
      const msg = update.message;
      const isPrivate = msg.chat.type === 'private';
      const isStart = msg.text && (msg.text === '/start' || msg.text.startsWith('/start'));

      if (isPrivate && isStart) {
        const userId = msg.from.id;
        const firstName = msg.from.first_name || 'Kamu';
        const memberCode = generateMemberCode(userId);

        await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: userId,
            text: `👋 Halo ${firstName}! Selamat datang di Belajar Crypto ID!\n\n🎉 Kamu dapat *10 pertanyaan/hari* sebagai member!\n\nKode aktivasi kamu:\n\`${memberCode}\`\n\nCara pakai:\n1. Buka chatbot: ${CHATBOT_URL}\n2. Klik tombol *"Punya kode member?"*\n3. Masukkan kode di atas\n4. Kuota 10/hari langsung aktif! ✅\n\n_Simpan kode ini ya, bisa dipakai kapan saja!_`,
            parse_mode: 'Markdown'
          })
        });
      }
    }

    // Deteksi member baru join grup
    if (update.chat_member) {
      const member = update.chat_member;
      const newStatus = member.new_chat_member?.status;
      const oldStatus = member.old_chat_member?.status;
      const user = member.new_chat_member?.user;
      const chat = member.chat;

      const isOurGroup = String(chat.id) === GROUP_ID;
      const isNewMember = (oldStatus === 'left' || oldStatus === 'kicked') &&
                          (newStatus === 'member' || newStatus === 'administrator');

      if (isOurGroup && isNewMember && user && !user.is_bot) {
        const userId = user.id;
        const firstName = user.first_name || 'Kamu';
        const memberCode = generateMemberCode(userId);

        try {
          await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: userId,
              text: `👋 Halo ${firstName}! Selamat bergabung di Member Belajar Crypto! 🎉\n\nKamu dapat *10 pertanyaan/hari* di Crypto AI kami!\n\nKode aktivasi kamu:\n\`${memberCode}\`\n\nCara pakai:\n1. Buka chatbot: ${CHATBOT_URL}\n2. Klik tombol *"Punya kode member?"*\n3. Masukkan kode di atas\n4. Kuota 10/hari langsung aktif! ✅\n\n_Simpan kode ini ya, bisa dipakai kapan saja!_`,
              parse_mode: 'Markdown'
            })
          });
        } catch (e) {
          console.log('Could not send DM:', e.message);
        }
      }
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

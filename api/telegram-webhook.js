export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const CHANNEL_USERNAME = 'BelajarCryptoID06';
  const CHATBOT_URL = process.env.CHATBOT_URL || 'https://crypto-edu-bot.vercel.app';

  try {
    const update = req.body;

    // Deteksi member baru join channel
    if (update.chat_member) {
      const member = update.chat_member;
      const newStatus = member.new_chat_member?.status;
      const oldStatus = member.old_chat_member?.status;
      const user = member.new_chat_member?.user;
      const chat = member.chat;

      // Cek apakah ini channel yang benar dan user baru join
      const isOurChannel = chat.username === CHANNEL_USERNAME;
      const isNewMember = (oldStatus === 'left' || oldStatus === 'kicked') && 
                          (newStatus === 'member' || newStatus === 'administrator');

      if (isOurChannel && isNewMember && user && !user.is_bot) {
        const userId = user.id;
        const firstName = user.first_name || 'Kamu';
        
        // Buat link aktivasi unik berdasarkan user ID
        const activationLink = `${CHATBOT_URL}/#member-${userId}`;
        
        // Kirim DM ke member baru
        const message = `👋 Halo ${firstName}! Selamat bergabung di Belajar Crypto ID!

🎉 Sebagai member, kamu dapat *10 pertanyaan/hari* di Crypto AI kami!

Klik link di bawah untuk aktifkan kuota member kamu:
👉 ${activationLink}

Selamat belajar crypto! 🚀`;

        await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: userId,
            text: message,
            parse_mode: 'Markdown'
          })
        });
      }
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}


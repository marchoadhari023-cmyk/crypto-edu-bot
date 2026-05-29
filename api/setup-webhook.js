export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const WEBHOOK_URL = `${process.env.CHATBOT_URL}/api/telegram-webhook`;

  try {
    const webhookRes = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_TOKEN}/setWebhook`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: WEBHOOK_URL,
          allowed_updates: ['message', 'chat_member']
        })
      }
    );
    const webhookData = await webhookRes.json();

    await fetch(
      `https://api.telegram.org/bot${TELEGRAM_TOKEN}/setMyCommands`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commands: [
            { command: 'start', description: 'Aktifkan kuota member 10 pertanyaan/hari' }
          ]
        })
      }
    );

    return res.status(200).json({
      success: true,
      webhook: webhookData,
      webhook_url: WEBHOOK_URL
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

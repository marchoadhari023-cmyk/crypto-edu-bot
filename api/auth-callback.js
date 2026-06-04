export default async function handler(req, res) {
  const { code, error } = req.query;

  if (error || !code) {
    return res.redirect('/?error=auth_failed');
  }

  const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
  const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
  const GUILD_ID = process.env.DISCORD_GUILD_ID;
  const REDIRECT_URI = `${process.env.CHATBOT_URL}/api/auth-callback`;
  const PREMIUM_ROLE_ID = process.env.PREMIUM_ROLE_ID;
  const PREMIUM_PLUS_ROLE_ID = process.env.PREMIUM_PLUS_ROLE_ID;
  const ADMIN_ROLE_ID = process.env.ADMIN_ROLE_ID;
  const ADMIN_USERNAME = process.env.ADMIN_DISCORD_USERNAME || 'mrccho_';

  try {
    // Exchange code for token
    const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI
      })
    });

    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      return res.redirect('/?error=token_failed');
    }

    // Get user info
    const userRes = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });
    const user = await userRes.json();

    // Get member info in guild
    const memberRes = await fetch(
      `https://discord.com/api/users/@me/guilds/${GUILD_ID}/member`,
      { headers: { Authorization: `Bearer ${tokenData.access_token}` } }
    );
    const member = await memberRes.json();

    // Determine tier
    let tier = 'free';
    const username = user.username || '';

    if (username === ADMIN_USERNAME || (member.roles && member.roles.includes(ADMIN_ROLE_ID))) {
      tier = 'admin';
    } else if (member.roles && member.roles.includes(PREMIUM_PLUS_ROLE_ID)) {
      tier = 'premiumplus';
    } else if (member.roles && member.roles.includes(PREMIUM_ROLE_ID)) {
      tier = 'premium';
    } else if (member.joined_at) {
      tier = 'classic'; // joined server but no paid role
    }

    // Encode user data
    const userData = Buffer.from(JSON.stringify({
      id: user.id,
      username: user.username,
      discriminator: user.discriminator,
      avatar: user.avatar,
      tier
    })).toString('base64');

    return res.redirect(`/?discord=${encodeURIComponent(userData)}`);

  } catch (err) {
    console.error('Auth error:', err);
    return res.redirect('/?error=server_error');
  }
}

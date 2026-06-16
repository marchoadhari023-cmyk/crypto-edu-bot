export default async function handler(req, res) {
  const code = req.query?.code;
  const error = req.query?.error;

  const CHATBOT_URL = process.env.CHATBOT_URL || 'https://moonbackai.vercel.app';

  if (error || !code) {
    return res.redirect(`${CHATBOT_URL}/?error=auth_failed`);
  }

  const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
  const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
  const GUILD_ID = process.env.DISCORD_GUILD_ID;
  const REDIRECT_URI = `${CHATBOT_URL}/api/auth-callback`;
  const PREMIUM_ROLE_ID = process.env.PREMIUM_ROLE_ID;
  const PREMIUM_PLUS_ROLE_ID = process.env.PREMIUM_PLUS_ROLE_ID;
  const ADMIN_ROLE_ID = process.env.ADMIN_ROLE_ID;
  const ADMIN_USERNAME = process.env.ADMIN_DISCORD_USERNAME || 'mrcho6_22264';

  try {
    // Exchange code for token
    const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: REDIRECT_URI
      }).toString()
    });

    if (!tokenRes.ok) {
      console.error('Token exchange failed:', await tokenRes.text());
      return res.redirect(`${CHATBOT_URL}/?error=token_failed`);
    }

    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      return res.redirect(`${CHATBOT_URL}/?error=no_token`);
    }

    // Get user info
    const userRes = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });
    const user = await userRes.json();

    if (!user.id) {
      return res.redirect(`${CHATBOT_URL}/?error=no_user`);
    }

    // Get member roles in guild
    let memberRoles = [];
    let joinedGuild = false;
    try {
      const memberRes = await fetch(
        `https://discord.com/api/users/@me/guilds/${GUILD_ID}/member`,
        { headers: { Authorization: `Bearer ${tokenData.access_token}` } }
      );
      if (memberRes.ok) {
        const member = await memberRes.json();
        memberRoles = member.roles || [];
        joinedGuild = !!member.joined_at;
      }
    } catch(e) {
      console.log('Could not fetch member roles:', e);
    }

    // Determine tier
    let tier = 'free';
    const username = user.username || '';

    if (username === ADMIN_USERNAME || memberRoles.includes(ADMIN_ROLE_ID)) {
      tier = 'admin';
    } else if (memberRoles.includes(PREMIUM_PLUS_ROLE_ID)) {
      tier = 'premiumplus';
    } else if (memberRoles.includes(PREMIUM_ROLE_ID)) {
      tier = 'premium';
    } else if (joinedGuild) {
      tier = 'classic';
    }

    // Encode and redirect
    const userData = Buffer.from(JSON.stringify({
      id: user.id,
      username: user.username,
      avatar: user.avatar,
      tier
    })).toString('base64');

    return res.redirect(`${CHATBOT_URL}/?discord=${encodeURIComponent(userData)}`);

  } catch (err) {
    console.error('Auth callback error:', err);
    return res.redirect(`${CHATBOT_URL}/?error=server_error`);
  }
}

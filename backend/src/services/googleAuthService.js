const { OAuth2Client } = require('google-auth-library');
const { env } = require('../config/env');

const oauthClient = new OAuth2Client(env.googleClientId, env.googleClientSecret, env.googleRedirectUri);

function buildGoogleAuthUrl(state) {
  return oauthClient.generateAuthUrl({
    access_type: 'online',
    prompt: 'consent',
    scope: ['openid', 'email', 'profile'],
    state
  });
}

async function verifyGoogleCode(code) {
  const { tokens } = await oauthClient.getToken(code);
  if (!tokens?.id_token) {
    throw new Error('Google did not return an id_token');
  }
  const ticket = await oauthClient.verifyIdToken({
    idToken: tokens.id_token,
    audience: env.googleClientId
  });
  const payload = ticket.getPayload();
  return {
    email: payload.email,
    emailVerified: payload.email_verified,
    name: payload.name || payload.email,
    picture: payload.picture,
    sub: payload.sub,
    idToken: tokens.id_token
  };
}

module.exports = {
  buildGoogleAuthUrl,
  verifyGoogleCode
};


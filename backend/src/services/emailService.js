const nodemailer = require('nodemailer');
const { env } = require('../config/env');

const transporter = nodemailer.createTransport({
  host: env.smtpHost,
  port: env.smtpPort,
  secure: env.smtpPort === 465,
  auth: {
    user: env.smtpUser,
    pass: env.smtpPass
  }
});

async function sendVerificationEmail({ to, token, expiresAt }) {
  const safeFrontend = (env.frontendOrigin || '').replace(/\/$/, '');
  const verifyLink = `${safeFrontend}/?verifyToken=${token}`;
  const expiryHours = env.emailVerifyExpiryHours || 24;

  const meta = {
    to,
    from: env.smtpFrom || env.smtpUser,
    host: env.smtpHost,
    port: env.smtpPort,
    expiresAt
  };
  console.log('[email] Sending verification email', meta);

  const html = `
    <p>Hi there,</p>
    <p>Thanks for registering for the RSS Aggregator. Please confirm your email to activate your account.</p>
    <p><a href="${verifyLink}">Confirm my email</a></p>
    <p>This link expires in ${expiryHours} hour${expiryHours === 1 ? '' : 's'}.</p>
    <p>If you didn’t request this, you can ignore this email.</p>
  `;

  const text = `
Thanks for registering for the RSS Aggregator.
Please confirm your email to activate your account.

Confirm: ${verifyLink}

This link expires in ${expiryHours} hour${expiryHours === 1 ? '' : 's'}.
If you didn’t request this, you can ignore this email.
`.trim();

  return transporter.sendMail({
    from: env.smtpFrom || env.smtpUser,
    to,
    subject: 'Confirm your RSS Aggregator account',
    text,
    html
  })
    .then(info => {
      console.log('[email] Verification email sent', {
        to,
        messageId: info?.messageId,
        response: info?.response
      });
      return info;
    })
    .catch(err => {
      console.error('[email] Verification email failed', { to, error: err.message });
      throw err;
    });
}

module.exports = {
  sendVerificationEmail
};



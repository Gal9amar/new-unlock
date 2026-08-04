const nodemailer = require('nodemailer');

// Same Gmail SMTP approach used in functions/index.js's sendMail(), ported
// to read the app password from a Netlify env var instead of a Firebase secret.
// Cached the same way _lib/db.js caches its client, instead of reconnecting
// on every call (functions that send 2 emails via Promise.all were opening
// 2 fresh SMTP connections per request).
let transporter;
function getTransporter() {
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: 'unlock.yavne@gmail.com', pass: process.env.GMAIL_APP_PASSWORD },
  });
  return transporter;
}

function sendMail(mailOptions) {
  return getTransporter().sendMail(mailOptions);
}

module.exports = { sendMail };

const nodemailer = require('nodemailer');

// Same Gmail SMTP approach used in functions/index.js's sendMail(), ported
// to read the app password from a Netlify env var instead of a Firebase secret.
function sendMail(mailOptions) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: 'unlock.yavne@gmail.com', pass: process.env.GMAIL_APP_PASSWORD },
  });
  return transporter.sendMail(mailOptions);
}

module.exports = { sendMail };

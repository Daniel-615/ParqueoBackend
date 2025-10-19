
const nodemailer = require('nodemailer');

const {
  RESEND_API_KEY,
  EMAIL_USER,
  EMAIL_PASSWORD,
  MAIL_FROM, 
} = process.env;

const DEFAULT_FROM = MAIL_FROM || (EMAIL_USER ? `Notificaciones <${EMAIL_USER}>`
                                              : 'Parqueo <onboarding@resend.dev>');

async function sendEmail({ to, subject, text, html, from = DEFAULT_FROM }) {
  if (!to || !subject) throw new Error('Faltan campos para enviar email');

  if (RESEND_API_KEY) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to, subject, html, text }),
    });

    if (!res.ok) {
      const msg = await res.text().catch(()=>'');
      throw new Error(`Resend error ${res.status}: ${msg}`);
    }
    return res.json();
  }


  if (!EMAIL_USER || !EMAIL_PASSWORD) {
    throw new Error('No hay RESEND_API_KEY ni credenciales SMTP');
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail', 
    auth: { user: EMAIL_USER, pass: EMAIL_PASSWORD },
  });

  return transporter.sendMail({ from, to, subject, text, html });
}

module.exports = { sendEmail };

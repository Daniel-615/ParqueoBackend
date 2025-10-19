const nodemailer = require('nodemailer');

const {
  RESEND_API_KEY,
  RESEND_FROM,       
  EMAIL_USER,
  EMAIL_PASSWORD,
  MAIL_FROM,        
} = process.env;

const DEFAULT_FROM_SMTP   = MAIL_FROM || (EMAIL_USER ? `Notificaciones <${EMAIL_USER}>` : undefined);
const DEFAULT_FROM_RESEND = RESEND_FROM || 'Parqueo <onboarding@resend.dev>';

function isGmail(address = '') {
  return /@gmail\.com\s*>?$/.test(address);
}

async function sendEmail({ to, subject, text, html, from }) {
  if (!to || !subject) throw new Error('Faltan campos para enviar email');

  if (RESEND_API_KEY) {

    const effectiveFrom = from || DEFAULT_FROM_RESEND;


    if (isGmail(effectiveFrom)) {
      throw new Error(
        'Remitente con gmail.com no permitido en Resend. Usa RESEND_FROM (p.ej. onboarding@resend.dev) o un dominio verificado.'
      );
    }


    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: effectiveFrom,
        to,
        subject,
        html,
        text,
      }),
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

  return transporter.sendMail({
    from: from || DEFAULT_FROM_SMTP || `Notificaciones <${EMAIL_USER}>`,
    to,
    subject,
    text,
    html,
  });
}

module.exports = { sendEmail };

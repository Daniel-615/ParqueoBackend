
const { sendEmail } = require('./mailer');


async function enviarNotificacionParqueoDisponible(destinatario, parqueoId, info = {}) {
  const {
    nombre = 'Parqueo',           
    asunto = 'Parqueo disponible',
    titulo = 'Notificación de disponibilidad',
    actionUrl = '',                  
    actionText = 'Ver disponibilidad'
  } = info;

  if (!destinatario || !parqueoId) throw new Error('Faltan datos');

  const textoPlano =
`${titulo}

Querido usuario,
${nombre} (ID: ${parqueoId}) ya se encuentra disponible.
${actionUrl ? `\nConsulta aquí: ${actionUrl}\n` : ''}
`;

  const html = `
  <!doctype html>
  <html lang="es">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <style>
      body{font-family:Arial,sans-serif;background:#f4f6f8;margin:0;padding:0}
      .container{max-width:560px;background:#fff;margin:30px auto;border-radius:12px;padding:24px;
                 box-shadow:0 2px 6px rgba(0,0,0,.08)}
      .title{color:#111827;font-size:20px;font-weight:700;margin-bottom:16px;text-align:center}
      .msg{font-size:15px;color:#333;line-height:1.6;text-align:center}
      .btn{display:inline-block;background:#2563eb;color:#fff !important;text-decoration:none;
           font-weight:600;padding:12px 18px;border-radius:8px;margin-top:18px}
      .foot{font-size:12px;color:#999;text-align:center;margin-top:24px}
      code{background:#f3f4f6;padding:2px 6px;border-radius:6px}
    </style>
  </head>
  <body>
    <div class="container">
      <div class="title">${titulo}</div>
      <div class="msg">
        <p>Querido usuario,</p>
        <p>Tu espacio de <strong>${nombre}</strong> (ID: <code>${String(parqueoId)}</code>) ya se encuentra disponible.</p>
        ${actionUrl ? `<p><a class="btn" href="${actionUrl}" target="_blank" rel="noopener">${actionText}</a></p>` : ''}
      </div>
      <div class="foot">Este mensaje fue generado automáticamente. Por favor, no respondas a este correo.</div>
    </div>
  </body>
  </html>
  `;

  await sendEmail({ to: destinatario, subject: asunto, text: textoPlano, html });
}


const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const genCode = (len=6) => Array.from({length:len},()=>CHARS[Math.floor(Math.random()*CHARS.length)]).join('');

async function enviarCodigoConfirmacion(destinatario, info = {}) {
  const {
    nombre = '',
    asunto = 'Código de confirmación',
    titulo = 'Verificación',
    codigo = genCode(6),
    minutosValidez = 10,
    actionUrl = '',
    actionText = 'Confirmar código',
  } = info;

  if (!destinatario) throw new Error('Falta destinatario');

  const preheader = `Tu código es ${codigo}. Vence en ${minutosValidez} minutos.`;

  const textoPlano =
`${titulo}

${nombre ? nombre + ', ' : ''}tu código de confirmación es: ${codigo}
Vence en ${minutosValidez} minutos.
${actionUrl ? `\nConfirma aquí: ${actionUrl}\n` : ''}`;

  const html = `
  <!doctype html>
  <html lang="es">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <style>
      .preheader{display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;mso-hide:all}
      body{margin:0;padding:0;background:#f2f4f7;font-family:Arial,sans-serif}
      .wrap{max-width:560px;background:#fff;border-radius:14px;overflow:hidden;margin:30px auto;box-shadow:0 4px 10px rgba(0,0,0,.06)}
      .head{padding:22px;background:#111827;color:#fff;font-size:22px;font-weight:700;text-align:center}
      .cnt{padding:24px;color:#111827;font-size:16px;line-height:1.6}
      .code{font-family:monospace;font-size:28px;letter-spacing:3px;background:#111;color:#fff;padding:14px 18px;border-radius:10px;display:inline-block}
      .muted{color:#6b7280;font-size:14px;margin-top:12px}
      .btn{display:inline-block;background:#16a34a;color:#fff !important;text-decoration:none;font-weight:700;padding:12px 18px;border-radius:8px;margin-top:18px}
      .foot{padding:12px 24px;background:#f9fafb;border-top:1px solid #eef2f7;color:#6b7280;font-size:12px}
    </style>
  </head>
  <body>
    <span class="preheader">${preheader}</span>
    <div class="wrap">
      <div class="head">${titulo}</div>
      <div class="cnt">
        ${nombre ? `<div style="margin-bottom:8px;">Hola, <strong>${nombre}</strong>.</div>` : ''}
        <div>Tu código de confirmación:</div>
        <div style="margin-top:12px;"><span class="code">${codigo}</span></div>
        <div class="muted">Vence en ${minutosValidez} minutos.</div>
        ${actionUrl ? `<div><a class="btn" href="${actionUrl}" target="_blank" rel="noopener">${actionText}</a></div>` : ''}
      </div>
      <div class="foot">Si no solicitaste este código, puedes ignorar este correo.</div>
    </div>
  </body>
  </html>
  `;

  await sendEmail({ to: destinatario, subject: asunto, text: textoPlano, html });
  return { codigo };
}

module.exports = {
  enviarNotificacionParqueoDisponible,
  enviarCodigoConfirmacion
};

const { EMAIL_USER, EMAIL_PASSWORD} = require("../config/config.js");
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASSWORD,
  },
});

async function enviarNotificacionParqueoDisponible(destinatario, parqueoId, info={}) {
  const {
    nombre = "Parqueo",   
    asunto = "Parqueo disponible",
    titulo = "Notificación de disponibilidad",
    fecha
  } = info;

  if (!destinatario || !parqueoId) {
    throw new Error("Faltan datos para enviar la notificación");
  }

  
  const textoPlano =
`${titulo}

${nombre} (ID: ${parqueoId}) ya está disponible.

Fecha y hora: ${fecha}
`;

  const html =
`<!doctype html>
<html lang="es">
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; background:#f6f7fb; padding:0; margin:0;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
    <tr>
      <td align="center" style="padding:24px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px; background:#fff; padding:24px; border-radius:12px;">
          <tr><td style="font-size:18px; font-weight:700; color:#111;">${titulo}</td></tr>
          <tr><td style="height:8px;"></td></tr>
          <tr><td style="font-size:15px; color:#333; line-height:1.6;">
            <div><strong>${nombre}</strong> (ID: <code>${parqueoId}</code>) ya está disponible.</div>
            <div style="margin-top:12px; color:#555;">Fecha y hora: <em>${fecha}</em></div>
          </td></tr>
          <tr><td style="height:24px;"></td></tr>
          <tr><td style="font-size:12px; color:#999; text-align:center;">
            Esta es una notificación automática. Por favor, no respondas a este correo.
          </td></tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  try {
    await transporter.sendMail({
      from: `"Notificaciones" <${EMAIL_USER}>`,
      to: destinatario,
      subject: asunto,
      text: textoPlano,
      html,
    });
  } catch (err) {
    console.error("Error al enviar notificación de parqueo disponible:", err?.message || err);
    throw err;
  }
}

// --- Generador simple de códigos (evita 0/O y 1/I) ---
function genCode(len = 6) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

/**
 * Envía un correo con un código de confirmación (OTP).
 * @param {string} destinatario  Email del destinatario
 * @param {object} info Opciones:
 *  - nombre?: string         // para personalizar el saludo
 *  - asunto?: string         // "Código de confirmación" por defecto
 *  - titulo?: string         // "Verificación" por defecto
 *  - codigo?: string         // si no lo pasas, se genera uno
 *  - minutosValidez?: number // texto informativo ("Vence en X minutos")
 *  - actionUrl?: string      // opcional: link para confirmar
 *  - actionText?: string     // texto del botón (si actionUrl existe)
 * @returns {Promise<{codigo: string}>}
 */
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

  const html =
`<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <style>
    .preheader{display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;mso-hide:all;}
    .code{font-family: monospace; font-size: 28px; letter-spacing: 3px; background:#111; color:#fff; padding:14px 18px; border-radius:10px; display:inline-block;}
    a.btn{display:inline-block;background:#16a34a;color:#fff !important;text-decoration:none;font-weight:700;padding:12px 18px;border-radius:8px}
  </style>
</head>
<body style="margin:0;padding:0;background:#f2f4f7;font-family:Arial,sans-serif;">
  <span class="preheader">${preheader}</span>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f2f4f7;">
    <tr>
      <td align="center" style="padding:32px 12px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;background:#fff;border-radius:14px;overflow:hidden;">
          <tr>
            <td style="padding:22px;background:#111827;color:#fff;font-size:22px;font-weight:700;">${titulo}</td>
          </tr>
          <tr>
            <td style="padding:24px;color:#111827;font-size:16px;line-height:1.6;">
              ${nombre ? `<div style="margin-bottom:8px;">Hola, <strong>${nombre}</strong>.</div>` : ''}
              <div>Tu código de confirmación:</div>
              <div style="margin-top:12px;"><span class="code">${codigo}</span></div>
              <div style="margin-top:12px;color:#6b7280;font-size:14px;">Vence en ${minutosValidez} minutos.</div>
              ${actionUrl ? `<div style="margin-top:18px;">
                <a class="btn" href="${actionUrl}" target="_blank" rel="noopener">${actionText}</a>
              </div>` : ''}
            </td>
          </tr>
          <tr>
            <td style="padding:12px 24px;background:#f9fafb;border-top:1px solid #eef2f7;color:#6b7280;font-size:12px;">
              Si no solicitaste este código, puedes ignorar este correo.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  await transporter.sendMail({
    from: `"Verificación" <${EMAIL_USER}>`,
    to: destinatario,
    subject: asunto,
    text: textoPlano,
    html,
  });

  return { codigo };
}

module.exports = { enviarNotificacionParqueoDisponible,enviarCodigoConfirmacion };

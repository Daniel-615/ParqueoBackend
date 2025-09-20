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

module.exports = { enviarNotificacionParqueoDisponible };

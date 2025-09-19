const { EMAIL_USER, EMAIL_PASSWORD} = require("../config/config.js");
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASSWORD,
  },
});


async function enviarNotificacionParqueoDisponible(destinatario, parqueoId, info = {}) {
  const {
    nombre = "Parqueo",
    ubicacion = "",        
    cupos,                 
    mensajeExtra = "",     
    asunto = "Parqueo disponible",
    titulo = "Notificación de disponibilidad"
  } = info;

  const ahora = new Date();
  const lineaUbicacion = ubicacion ? `\nUbicación: ${ubicacion}` : "";
  const lineaCupos = typeof cupos === "number" ? `\nCupos disponibles: ${cupos}` : "";
  const lineaExtra = mensajeExtra ? `\n\n${mensajeExtra}` : "";

  const textoPlano =
`${titulo}

${nombre} (ID: ${parqueoId}) ya está disponible.${lineaUbicacion}${lineaCupos}

Fecha y hora: ${ahora}${lineaExtra}
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
            ${ubicacion ? `<div>Ubicación: ${ubicacion}</div>` : ""}
            ${typeof cupos === "number" ? `<div>Cupos disponibles: ${cupos}</div>` : ""}
            <div style="margin-top:8px; color:#555;">Fecha y hora: ${ahora}</div>
            ${mensajeExtra ? `<div style="margin-top:12px;">${mensajeExtra}</div>` : ""}
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

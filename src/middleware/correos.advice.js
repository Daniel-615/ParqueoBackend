const { sendEmail } = require('./mailer');

function fmtFecha(f) {
  try { return new Date(f).toLocaleString('es-GT', { hour12:false }); }
  catch { return String(f); }
}

async function enviarNotificacionParqueoDisponible(destinatario, parqueoId, info = {}) {
  const {
    nombre = 'Parqueo',
    asunto = 'Parqueo disponible',
    titulo = 'Notificación de disponibilidad',
    fecha = new Date(),
  } = info;

  if (!destinatario || !parqueoId) throw new Error('Faltan datos');

  const textoPlano =
`${titulo}

${nombre} (ID: ${parqueoId}) ya está disponible.
Fecha y hora: ${fmtFecha(fecha)}
`;

  const html = `<!doctype html>... (tu HTML igual, usando ${nombre}, ${parqueoId}, ${fmtFecha(fecha)}) ...`;

  await sendEmail({
    to: destinatario,
    subject: asunto,
    text: textoPlano,
    html,
  });
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
  const textoPlano = `${titulo}

${nombre ? nombre + ', ' : ''}tu código: ${codigo}
Vence en ${minutosValidez} minutos.
${actionUrl ? `Confirma aquí: ${actionUrl}\n` : ''}`;

  const html = `<!doctype html>... (tu HTML del OTP, inalterado) ...`;

  await sendEmail({
    to: destinatario,
    subject: asunto,
    text: textoPlano,
    html,
  });

  return { codigo };
}

module.exports = { enviarNotificacionParqueoDisponible, enviarCodigoConfirmacion };

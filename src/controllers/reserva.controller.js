const crypto = require('crypto');
const db = require('../models');
const { Op } = require('sequelize');
const Reserva = db.getModel('Reserva');
const Parqueo = db.getModel('Parqueo');
const { enviarCodigoConfirmacion } = require('../middleware/correos.advice');

const ACTIVE_STATES = ['pending', 'active', 'in_use'];
const TERMINAL_STATES = ['cancelled', 'expired', 'completed'];

// Solapamiento: existe choque si (from_A < to_B) && (to_A > from_B)
function overlapsWhere(parqueo_id, from, to) {
  return {
    parqueo_id,
    status: { [Op.in]: ACTIVE_STATES },
    [Op.and]: [
      { from: { [Op.lt]: to } },
      { to:   { [Op.gt]: from } },
    ],
  };
}

function genCode(len = 6) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: len }, () => chars[crypto.randomInt(0, chars.length)]).join('');
}

function toDate(x) {
  const d = new Date(x);
  if (Number.isNaN(+d)) throw new Error('Fecha inválida');
  return d;
}

class ReservaController {

  async create(req, res) {
    const t = await db.sequelize.transaction();
    try {
      const { parqueo_id, email, nombre, from, to, minutosValidez = 10 } = req.body || {};
      if (!parqueo_id || !email || !from || !to) {
        await t.rollback();
        return res.status(400).json({ message: 'Faltan datos obligatorios (parqueo_id, email, from, to)' });
      }

      const start = toDate(from);
      const end   = toDate(to);
      if (!(start < end)) {
        await t.rollback();
        return res.status(400).json({ message: 'Rango de fechas inválido (from < to)' });
      }

      // Lock "per-slot" para evitar carreras entre reservas del mismo parqueo
      const p = await Parqueo.findByPk(parqueo_id, { transaction: t, lock: t.LOCK.UPDATE });
      if (!p || !p.activo) {
        await t.rollback();
        return res.status(404).json({ message: 'Parqueo no disponible' });
      }

      // Chequeo de solapamiento dentro de la transacción
      const choque = await Reserva.findOne({ where: overlapsWhere(parqueo_id, start, end), transaction: t, lock: t.LOCK.UPDATE });
      if (choque) {
        await t.rollback();
        return res.status(409).json({ message: 'El parqueo ya está reservado en ese rango de fechas' });
      }

      const code = genCode(6);
      const otpExpiresAt = new Date(Date.now() + minutosValidez * 60 * 1000);

      // Creamos en "pending"
      const r = await Reserva.create({
        parqueo_id,
        email: String(email).trim().toLowerCase(),
        nombre: nombre || null,
        code,
        from: start,
        to: end,
        status: 'pending',
        meta: { otp_expires_at: otpExpiresAt.toISOString(), otp_attempts: 0 },
      }, { transaction: t });

      // Importante: enviar correo FUERA del lock pesado, pero antes de commit
      try {
        await enviarCodigoConfirmacion(String(email).trim().toLowerCase(), {
          nombre: nombre || '',
          codigo: code,
          minutosValidez,
        });
      } catch (mailErr) {
        // si falla el email, revertimos la creación
        await t.rollback();
        console.error('Error enviando código:', mailErr);
        return res.status(500).json({ message: 'No se pudo enviar el código de confirmación' });
      }

      await t.commit();

      return res.status(201).json({
        id: r.id,
        message: "Reserva creada en estado 'pending'. Se envió un código de confirmación al correo.",
        expiresAt: otpExpiresAt.toISOString(),
      });
    } catch (e) {
      await t.rollback().catch(() => {});
      console.error('reservas.create', e);
      return res.status(500).json({ message: 'Error al crear la reserva' });
    }
  }

  async confirm(req, res) {
    try {
      const { id } = req.params;
      const { code } = req.body || {};
      if (!code) return res.status(400).json({ message: 'Código requerido' });

      const r = await Reserva.findByPk(id);
      if (!r) return res.status(404).json({ message: 'Reserva no encontrada' });

      if (r.status !== 'pending') {
        return res.status(400).json({ message: `La reserva no está pendiente. Estado actual: ${r.status}` });
      }

      if (r.code !== code) {
        // opcional: incrementar intentos
        const attempts = (r.meta?.otp_attempts ?? 0) + 1;
        await r.update({ meta: { ...r.meta, otp_attempts: attempts } });
        return res.status(403).json({ message: 'Código inválido' });
      }

      const expiresAt = r.meta?.otp_expires_at ? new Date(r.meta.otp_expires_at) : null;
      if (expiresAt && new Date() > expiresAt) {
        return res.status(400).json({ message: 'El código ha expirado' });
      }

      const now = new Date();
      const nextStatus = (r.from <= now && now < r.to) ? 'in_use' : 'active';
      await r.update({ status: nextStatus, confirmed_at: now });

      return res.json({ ok: true, status: nextStatus });
    } catch (e) {
      console.error('reservas.confirm', e);
      return res.status(500).json({ message: 'Error al confirmar la reserva' });
    }
  }

  async cancel(req, res) {
    try {
      const { id } = req.params;
      const { code } = req.body || {};
      const r = await Reserva.findByPk(id);
      if (!r) return res.status(404).json({ message: 'Reserva no encontrada' });
      if (r.code !== code) return res.status(403).json({ message: 'Código de cancelación inválido' });
      if (TERMINAL_STATES.includes(r.status)) {
        return res.status(400).json({ message: `Estado actual: ${r.status}` });
      }
      await r.update({ status: 'cancelled', canceled_at: new Date() });
      return res.json({ ok: true });
    } catch (e) {
      console.error('reservas.cancel', e);
      return res.status(500).json({ message: 'Error al cancelar la reserva' });
    }
  }

  async checkin(req, res) {
    try {
      const { id } = req.params;
      const { code } = req.body || {};
      const r = await Reserva.findByPk(id);
      if (!r) return res.status(404).json({ message: 'Reserva no encontrada' });
      if (r.code !== code) return res.status(403).json({ message: 'Código inválido' });

      const now = new Date();
      if (!(r.from <= now && now < r.to)) {
        return res.status(400).json({ message: 'Fuera de la ventana de reserva' });
      }
      // Requerir confirmación previa
      if (!['active', 'in_use'].includes(r.status)) {
        return res.status(400).json({ message: `La reserva debe estar confirmada. Estado actual: ${r.status}` });
      }
      await r.update({ status: 'in_use', checked_in_at: now });
      return res.json({ ok: true });
    } catch (e) {
      console.error('reservas.checkin', e);
      return res.status(500).json({ message: 'Error en check-in' });
    }
  }

  async availability(req, res) {
    try {
      const { parqueo_id, from, to } = req.query || {};
      if (!parqueo_id || !from || !to) {
        return res.status(400).json({ message: 'parqueo_id, from, to requeridos' });
      }
      const start = toDate(from);
      const end   = toDate(to);
      if (!(start < end)) return res.status(400).json({ message: 'Rango inválido (from < to)' });

      const choque = await Reserva.findOne({ where: overlapsWhere(parqueo_id, start, end), attributes: ['id'] });
      return res.json({ available: !choque });
    } catch (e) {
      console.error('reservas.availability', e);
      return res.status(500).json({ message: 'Error consultando disponibilidad' });
    }
  }
}

module.exports = ReservaController;

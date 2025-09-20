
const db = require('../models');
const { Op } = require('sequelize');
const Reserva = db.getModel('Reserva');
const Parqueo = db.getModel('Parqueo');
const { enviarCodigoConfirmacion } = require('../middleware/correos.advice');

const ACTIVE_STATES = ['pending', 'active', 'in_use'];


function overlapsWhere(parqueo_id, from, to) {
  return {
    parqueo_id,
    status: ACTIVE_STATES,
    [Op.not]: {
      [Op.or]: [
        { to:   { [Op.lte]: from } },
        { from: { [Op.gte]: to }   },
      ],
    },
  };
}


function genCode(len = 6) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

class ReservaController {

  async create(req, res) {
    try {
      const { parqueo_id, email, nombre, from, to, minutosValidez = 10 } = req.body || {};
      if (!parqueo_id || !email || !from || !to) {
        return res.status(400).json({ message: 'Faltan datos obligatorios (parqueo_id, email, from, to)' });
      }

      const p = await Parqueo.findByPk(parqueo_id);
      if (!p || !p.activo) {
        return res.status(404).json({ message: 'Parqueo no disponible' });
      }

      const start = new Date(from);
      const end   = new Date(to);
      if (!(start < end)) {
        return res.status(400).json({ message: 'Rango de fechas inválido (from < to)' });
      }

      const clash = await Reserva.count({ where: overlapsWhere(parqueo_id, start, end) });
      if (clash) {
        return res.status(409).json({ message: 'El parqueo ya está reservado en ese rango de fechas' });
      }

      // Generar código + expiración
      const code = genCode(6);
      const otpExpiresAt = new Date(Date.now() + minutosValidez * 60 * 1000);

      // Crear en estado "pending"
      const r = await Reserva.create({
        parqueo_id,
        email: String(email).trim().toLowerCase(),
        nombre: nombre || null,
        code,
        from: start,
        to: end,
        status: 'pending',
        meta: { otp_expires_at: otpExpiresAt.toISOString() },
      });

      // Enviar email con el código
      try {
        await enviarCodigoConfirmacion(String(email).trim().toLowerCase(), {
          nombre: nombre || '',
          codigo: code,                 
          minutosValidez,
        });
      } catch (mailErr) {
        await r.destroy().catch(() => {});
        console.error('Error enviando código:', mailErr);
        return res.status(500).json({ message: 'No se pudo enviar el código de confirmación' });
      }

      return res.status(201).json({
        id: r.id,
        message: "Reserva creada en estado 'pending'. Se envió un código de confirmación al correo.",
        expiresAt: otpExpiresAt.toISOString(),
      });
    } catch (e) {
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
        return res.status(403).json({ message: 'Código inválido' });
      }

      const expiresAt = r.meta?.otp_expires_at ? new Date(r.meta.otp_expires_at) : null;
      if (expiresAt && new Date() > expiresAt) {
        return res.status(400).json({ message: 'El código ha expirado' });
      }

      // Si ya estamos dentro del rango ahora mismo -> in_use, si no -> active
      const now = new Date();
      const nextStatus = (r.from <= now && now < r.to) ? 'in_use' : 'active';

      await r.update({ status: nextStatus });

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
      if (['cancelled', 'expired', 'completed'].includes(r.status)) {
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
      if (!['pending', 'active', 'in_use'].includes(r.status)) {
        return res.status(400).json({ message: `Estado actual: ${r.status}` });
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
      const start = new Date(from), end = new Date(to);
      if (!(start < end)) return res.status(400).json({ message: 'Rango inválido (from < to)' });

      const clash = await Reserva.count({ where: overlapsWhere(parqueo_id, start, end) });
      return res.json({ available: clash === 0 });
    } catch (e) {
      console.error('reservas.availability', e);
      return res.status(500).json({ message: 'Error consultando disponibilidad' });
    }
  }
}

module.exports = ReservaController;

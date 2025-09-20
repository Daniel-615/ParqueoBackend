const db = require("../models");
const Parqueo = db.getModel('Parqueo');
const ParqueoWaitlist = db.getModel('ParqueoWaitlist');
const ParqueoLog = db.getModel('ParqueoLog');
const Reserva = db.getModel('Reserva');
const { Op } = require("sequelize");
const { enviarNotificacionParqueoDisponible } = require('../middleware/correos.advice');

const ACTIVE_STATES = ['pending','active','in_use'];

async function hasUpcomingOrActiveReservation(parqueoId, minutesAhead = 10) {
  const now = new Date();
  const soon = new Date(now.getTime() + minutesAhead * 60 * 1000);
  const count = await Reserva.count({
    where: {
      parqueo_id: parqueoId,
      status: ACTIVE_STATES,
      [Op.or]: [
        // en curso
        { from: { [Op.lte]: now }, to: { [Op.gt]: now } },
        // arranca pronto
        { from: { [Op.lte]: soon }, to: { [Op.gt]: now } },
      ],
    },
  });
  return count > 0;
}

class ParqueoController {
  _emitUpdate(io, parqueo) {
    const payload = {
      id: parqueo.id,
      nombre: parqueo.nombre,
      ocupado: !!parqueo.ocupado,
      activo: !!parqueo.activo,
      updatedAt: parqueo.updatedAt ? new Date(parqueo.updatedAt).toISOString() : null
    };
    io.of("/parqueos").to("parqueos:all").emit("parqueo_updated", payload);
    io.of("/parqueos").to(`parqueo:${parqueo.id}`).emit("parqueo_updated", payload);
  }

  async getAllParqueos(req, res) {
    try {
      const parqueos = await Parqueo.findAll({ where: { activo: true } });
      return res.status(200).send(parqueos);
    } catch {
      return res.status(500).send({ message: "Error al obtener los parqueos" });
    }
  }

  async createParqueo(req, res) {
    try {
      const { nombre } = req.body;
      if (!nombre) return res.status(400).send({ message: "El nombre es obligatorio" });

      const nuevoParqueo = await Parqueo.create({ nombre, activo: true, ocupado: false });
      const io = req.app.locals.io;
      this._emitUpdate(io, nuevoParqueo);

      return res.status(201).send({ message: "Parqueo creado exitosamente", parqueo: nuevoParqueo });
    } catch {
      return res.status(500).send({ message: "Error al crear el parqueo" });
    }
  }

  // logs para estadísticas
  async _logParqueo(parqueoId, event = 'update') {
    try {
      await ParqueoLog.create({ parqueo_id: parqueoId, event });
    } catch (e) {
      console.error('log error:', e.message);
    }
  }

  async updateParqueo(req, res) {
    try {
      const parqueos = req.body;
      if (!Array.isArray(parqueos) || parqueos.length === 0) {
        return res.status(400).send({ message: "Se espera un arreglo de parqueos para actualizar" });
      }

      const io = req.app.locals.io;

      const updates = parqueos.map(async ({ id, ocupado }) => {
        if (!id || typeof ocupado !== "boolean") {
          throw new Error("Cada parqueo debe tener un id y un estado booleano");
        }

        const p = await Parqueo.findByPk(id);
        if (!p) throw new Error(`Parqueo con id ${id} no encontrado`);

        const estabaOcupado = !!p.ocupado;
        p.ocupado = ocupado;
        await p.save(); 

        // libre -> ocupado : poner reserva en uso si aplica
        if (!estabaOcupado && p.ocupado) {
          const now = new Date();
          const r = await Reserva.findOne({
            where: {
              parqueo_id: p.id,
              status: ['pending','active'],
              from: { [Op.lte]: now },
              to:   { [Op.gt]: now },
            },
            order: [['from','DESC']],
          });
          if (r) await r.update({ status: 'in_use', checked_in_at: now });
        }

        // ocupado -> libre : completar reserva en uso si aplica
        if (estabaOcupado && !p.ocupado) {
          const now = new Date();
          const r = await Reserva.findOne({
            where: {
              parqueo_id: p.id,
              status: 'in_use',
              to: { [Op.gte]: new Date(now.getTime() - 30*60*1000) }, // tolerancia 30 min
            },
            order: [['checked_in_at','DESC']],
          });
          if (r) await r.update({ status: 'completed', completed_at: now });
        }

        // Emitir cambio siempre
        this._emitUpdate(io, p);

        // Log si cambió el estado
        if (estabaOcupado !== !!p.ocupado) {
          await this._logParqueo(p.id, 'update');
        }

        // Transición a disponible y activo → waitlist (salvo reserva inmediata)
        if (p.activo && estabaOcupado === true && p.ocupado === false) {
          if (!(await hasUpcomingOrActiveReservation(p.id, 10))) {
            await this._notifyAndClearWaitlist(p, io);
          }
        }
      });

      await Promise.all(updates);
      return res.status(200).send({ message: "Parqueos actualizados exitosamente" });
    } catch (err) {
      return res.status(500).send({ message: err.message || "Error al actualizar los parqueos" });
    }
  }

  async activateParqueo(req, res) {
    try {
      const { id } = req.params;
      const parqueo = await Parqueo.findByPk(id);
      if (!parqueo) return res.status(404).send({ message: "Parqueo no encontrado" });

      parqueo.activo = true;
      await parqueo.save();

      const io = req.app.locals.io;
      this._emitUpdate(io, parqueo);

      if (!parqueo.ocupado) {
        if (!(await hasUpcomingOrActiveReservation(parqueo.id, 10))) {
          await this._notifyAndClearWaitlist(parqueo, io);
        }
      }

      return res.status(200).send({ message: "Parqueo activado exitosamente" });
    } catch {
      return res.status(500).send({ message: "Error al activar el parqueo" });
    }
  }

  async deactivateParqueo(req, res) {
    try {
      const { id } = req.params;
      const parqueo = await Parqueo.findByPk(id);
      if (!parqueo) return res.status(404).send({ message: "Parqueo no encontrado" });

      parqueo.activo = false;
      await parqueo.save();

      const io = req.app.locals.io;
      this._emitUpdate(io, parqueo);

      return res.status(200).send({ message: "Parqueo desactivado exitosamente" });
    } catch {
      return res.status(500).send({ message: "Error al desactivar el parqueo" });
    }
  }

  async sendNotifier(req, res) {
    try {
      const { id } = req.params;
      const { email, nombre } = req.body || {};

      if (!id) return res.status(400).send({ message: "No se ha encontrado un parqueo con el id recibido." });

      const emailNorm = (email || '').trim().toLowerCase();
      if (!emailNorm) return res.status(400).send({ message: "Es necesario el correo para enviar la notificación." });
      if (!/^\S+@\S+\.\S+$/.test(emailNorm)) return res.status(400).send({ message: 'Email inválido' });

      const parqueo = await Parqueo.findByPk(id);
      if (!parqueo) return res.status(404).send({ message: "Parqueo no encontrado." });

      // Disponible ahora → notifica ya (incluye fecha)
      if (parqueo.activo && !parqueo.ocupado) {
        await enviarNotificacionParqueoDisponible(emailNorm, id, {
          nombre: nombre || parqueo.nombre,          
          fecha: parqueo.updatedAt ?? new Date(),
        });
        const io = req.app.locals.io;
        io.of("/parqueos").to(`parqueo:${parqueo.id}`).emit("parqueo_disponible", { id: parqueo.id });
        return res.status(200).send({ message: "Parqueo disponible, notificación enviada." });
      }

      // Ocupado → suscribir (idempotente)
      await ParqueoWaitlist.findOrCreate({
        where: { parqueoId: id, email: emailNorm },
        defaults: { parqueoId: id, email: emailNorm }
      });

      return res.status(200).send({ message: "Suscripción registrada. Te avisaremos cuando esté disponible" });
    } catch (err) {
      console.error('sendNotifier error: ', err);
      return res.status(500).send({ message: "Error al emitir notificación." });
    }
  }

  // Notificar a toda la waitlist y limpiar
  async _notifyAndClearWaitlist(parqueo, io) {
    try {
      const subs = await ParqueoWaitlist.findAll({
        where: { parqueoId: parqueo.id, notifiedAt: null }
      });

      if (!subs.length) {
        io.of("/parqueos").to(`parqueo:${parqueo.id}`).emit("parqueo_disponible", { id: parqueo.id });
        return;
      }

      const jobs = subs.map(async (s) => {
        try {
          await enviarNotificacionParqueoDisponible(s.email, parqueo.id, {
            nombre: parqueo.nombre,
            fecha: parqueo.updatedAt ?? new Date(),
          });
          s.notifiedAt = new Date();
          await s.save();
        } catch (e) {
          console.error("Error notificando a", s.email, e.message);
        }
      });

      await Promise.allSettled(jobs);

      io.of("/parqueos").to(`parqueo:${parqueo.id}`).emit("parqueo_disponible", { id: parqueo.id });

      await ParqueoWaitlist.destroy({
        where: { parqueoId: parqueo.id, notifiedAt: { [Op.ne]: null } }
      });
    } catch (err) {
      console.error("Error al limpiar la lista de espera.", err);
    }
  }
}

module.exports = ParqueoController;

const db = require("../models");
const Parqueo = db.getModel('Parqueo');
const ParqueoWaitlist = db.getModel('ParqueoWaitlist'); 
const { enviarNotificacionParqueoDisponible } = require('../middleware/correos.advice');

class ParqueoController {
  async getAllParqueos(req, res) {
    try {
      const parqueos = await Parqueo.findAll({ where: { activo: true } });
      return res.status(200).send(parqueos);
    } catch (err) {
      return res.status(500).send({ message: "Error al obtener los parqueos" });
    }
  }

  async createParqueo(req, res) {
    try {
      const { nombre } = req.body;
      if (!nombre) return res.status(400).send({ message: "El nombre es obligatorio" });

      const nuevoParqueo = await Parqueo.create({ nombre });
      return res.status(201).send({ message: "Parqueo creado exitosamente", parqueo: nuevoParqueo });
    } catch (err) {
      return res.status(500).send({ message: "Error al crear el parqueo" });
    }
  }

  async updateParqueo(req, res) {
    try {
      const parqueos = req.body;
      if (!Array.isArray(parqueos) || parqueos.length === 0) {
        return res.status(400).send({ message: "Se espera un arreglo de parqueos para actualizar" });
      }

      const updates = parqueos.map(async ({ id, ocupado }) => {
        if (!id || typeof ocupado !== "boolean") {
          throw new Error("Cada parqueo debe tener un id y un estado booleano");
        }

        const p = await Parqueo.findByPk(id);
        if (!p) throw new Error(`Parqueo con id ${id} no encontrado`);

        const estabaOcupado = !!p.ocupado;
        p.ocupado = ocupado;
        await p.save();

        // Transición a disponible: estaba ocupado y ahora queda libre, además debe estar activo
        if (p.activo && estabaOcupado === true && p.ocupado === false) {
          await this._notifyAndClearWaitlist(p);
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

      // Si queda activo y no está ocupado, está disponible → notificar
      if (!parqueo.ocupado) {
        await this._notifyAndClearWaitlist(parqueo);
      }

      return res.status(200).send({ message: "Parqueo activado exitosamente" });
    } catch (err) {
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
      return res.status(200).send({ message: "Parqueo desactivado exitosamente" });
    } catch (err) {
      return res.status(500).send({ message: "Error al desactivar el parqueo" });
    }
  }

  async sendNotifier(req, res) {
    try {
      const { id } = req.params;
      const { email, nombre, ubicacion } = req.body || {};

      if (!id) return res.status(400).send({ message: "No se ha encontrado un parqueo con el id recibido." });

      const emailNorm = (email || '').trim().toLowerCase();
      if (!emailNorm) return res.status(400).send({ message: "Es necesario el correo para enviar la notificación." });
      if (!/^\S+@\S+\.\S+$/.test(emailNorm)) return res.status(400).send({ message: 'Email inválido' });

      const parqueo = await Parqueo.findByPk(id);
      if (!parqueo) return res.status(404).send({ message: "Parqueo no encontrado." });

      // Si está disponible ahora mismo → notifica de una
      if (parqueo.activo && !parqueo.ocupado) {
        await enviarNotificacionParqueoDisponible(emailNorm, id, { nombre: nombre || parqueo.nombre, ubicacion });
        return res.status(200).send({ message: "Parqueo disponible, notificación enviada." });
      }

      // Si está ocupado → guarda suscripción idempotente
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

  // Helper: notificar a toda la waitlist y limpiar
  async _notifyAndClearWaitlist(parqueo) {
    try {
      const subs = await ParqueoWaitlist.findAll({
        where: { parqueoId: parqueo.id, notifiedAt: null }
      });
      if (!subs.length) return;

      const jobs = subs.map(async (s) => {
        try {
          await enviarNotificacionParqueoDisponible(s.email, parqueo.id, {
            nombre: parqueo.nombre,
            // ubicacion: parqueo.ubicacion, // si existe el campo
          });
          s.notifiedAt = new Date();
          await s.save();
        } catch (e) {
          console.error("Error notificando a", s.email, e.message);
        }
      });

      await Promise.allSettled(jobs);

      // Opcional: limpiar los ya notificados para no crecer la tabla
      await ParqueoWaitlist.destroy({
        where: { parqueoId: parqueo.id, notifiedAt: { [Op.ne]: null } }
      });
    } catch (err) {
      console.error("Error al limpiar la lista de espera.", err);
    }
  }
}

module.exports = ParqueoController;

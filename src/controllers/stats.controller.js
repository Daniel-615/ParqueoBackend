const db = require("../models");
const sequelize = db.sequelize;

function toInt(val, def) {
  const n = Number.parseInt(val, 10);
  return Number.isFinite(n) && n > 0 ? n : def;
}


function clampDays(d, min = 1, max = 365) {
  return Math.max(min, Math.min(d, max));
}

class StatsController {
  static async hours(req, res) {
    try {
      const days = clampDays(toInt(req.query.days, 30));
      const [rows] = await sequelize.query(
        `
        SELECT DATE_TRUNC('hour', created_at AT TIME ZONE 'America/Guatemala') AS hora_gt,
               COUNT(*)::int AS updates
        FROM parqueo_logs
        WHERE event = 'update'
          AND created_at >= NOW() - INTERVAL :days || ' days'
        GROUP BY hora_gt
        ORDER BY hora_gt
        `,
        { replacements: { days: String(days) } }
      );

      const data = rows.map(r => ({
        hour_local_iso: new Date(r.hora_gt).toISOString(),
        updates: r.updates
      }));
      res.json({ days, data });
    } catch (e) {
      console.error('stats.hours', e);
      res.status(500).json({ message: 'Error generando estadísticas por hora' });
    }
  }

  static async topParqueos(req, res) {
    try {
      const days = clampDays(toInt(req.query.days, 30));
      const limit = Math.min(toInt(req.query.limit, 10), 100);
      const [rows] = await sequelize.query(
        `
        SELECT parqueo_id, COUNT(*)::int AS updates
        FROM parqueo_logs
        WHERE event = 'update'
          AND created_at >= NOW() - INTERVAL :days || ' days'
        GROUP BY parqueo_id
        ORDER BY updates DESC
        LIMIT :limit
        `,
        { replacements: { days: String(days), limit } }
      );
      res.json({ days, limit, data: rows });
    } catch (e) {
      console.error('stats.topParqueos', e);
      res.status(500).json({ message: 'Error generando top de parqueos' });
    }
  }


  static async daily(req, res) {
    try {
      const days = clampDays(toInt(req.query.days, 60));
      const [rows] = await sequelize.query(
        `
        SELECT (created_at AT TIME ZONE 'America/Guatemala')::date AS fecha_gt,
               COUNT(*)::int AS updates
        FROM parqueo_logs
        WHERE event = 'update'
          AND created_at >= NOW() - INTERVAL :days || ' days'
        GROUP BY fecha_gt
        ORDER BY fecha_gt
        `,
        { replacements: { days: String(days) } }
      );

      const data = rows.map(r => ({
        date_local: r.fecha_gt, 
        updates: r.updates
      }));
      res.json({ days, data });
    } catch (e) {
      console.error('stats.daily', e);
      res.status(500).json({ message: 'Error generando estadísticas diarias' });
    }
  }


  static async heatmap(req, res) {
    try {
      const days = clampDays(toInt(req.query.days, 30));
      const [rows] = await sequelize.query(
        `
        WITH base AS (
          SELECT (created_at AT TIME ZONE 'America/Guatemala') AS ts_gt
          FROM parqueo_logs
          WHERE event='update'
            AND created_at >= NOW() - INTERVAL :days || ' days'
        )
        SELECT EXTRACT(DOW FROM ts_gt)::int AS dow,  -- 0..6 (Sun..Sat)
               EXTRACT(HOUR FROM ts_gt)::int AS hour,
               COUNT(*)::int AS updates
        FROM base
        GROUP BY dow, hour
        ORDER BY dow, hour
        `,
        { replacements: { days: String(days) } }
      );
      res.json({ days, data: rows });
    } catch (e) {
      console.error('stats.heatmap', e);
      res.status(500).json({ message: 'Error generando heatmap' });
    }
  }
}

module.exports = StatsController;

const Sequelize = require("sequelize");
const dbConfig = require("../config/db.config.js");

class Database {
  constructor() {
    this._sequelize = new Sequelize(
      dbConfig.DB,
      dbConfig.USER,
      dbConfig.PASSWORD,
      {
        host: dbConfig.HOST,
        dialect: dbConfig.dialect,
        pool: dbConfig.pool,
        dialectOptions: dbConfig.dialectOptions || {
          ssl: { require: true, rejectUnauthorized: false },
        },
        logging: false,
      }
    );

    this.Sequelize = Sequelize;
    this.models = {};
    this._loadModels();
    this._associate();
  }

  _loadModels() {
    this.models.Parqueo = require("./parqueo.js")(this._sequelize);
    this.models.ParqueoWaitlist = require("./parqueo_wait_list.js")(this._sequelize);
    this.models.ParqueoLog = require("./parqueo_logs.js")(this._sequelize);
    this.models.Reserva=require("./reserva.js")(this._sequelize);
  }

  _associate() {
    const { Parqueo, ParqueoWaitlist, ParqueoLog,Reserva } = this.models;

    Parqueo.hasMany(ParqueoWaitlist, {
      foreignKey: "parqueoId",
      as: "waitlist",
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    });
    ParqueoWaitlist.belongsTo(Parqueo, {
      foreignKey: "parqueoId",
      as: "parqueo",
    });

    Parqueo.hasMany(ParqueoLog, {
      foreignKey: "parqueo_id",
      as: "logs",
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    });
    ParqueoLog.belongsTo(Parqueo, {
      foreignKey: "parqueo_id",
      as: "parqueo",
    });
    
    Parqueo.hasMany(Reserva,{
      foreignKey: 'parqueo_id',
      as: 'reservas'
    })
    Reserva.belongsTo(Parqueo,{
      foreignKey: 'parqueo_id',
      as: 'parqueo'
    })
  }

  async connect() {
    try {
      await this._sequelize.authenticate();
      console.log("Conexión establecida con la base de datos");
    } catch (error) {
      console.error("Error al conectar con la base de datos:", error);
      throw error;
    }
  }

  async sync(options = { alter: false, force: false }) {
    try {
      await this._sequelize.sync(options);
      console.log("Modelos sincronizados");
    } catch (error) {
      console.error("Error al sincronizar modelos:", error);
      throw error;
    }
  }

  getModel(name) {
    return this.models[name];
  }

  get Op() {
    return this.Sequelize.Op;
  }

  get sequelize() {
    return this._sequelize;
  }
}

module.exports = new Database();

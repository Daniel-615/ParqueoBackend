const {HOST, USER,PASSWORD,DB,DB_PORT}= require('./config.js'); 
class DBConfig {
  constructor() {
    this.HOST = HOST
    this.USER = USER
    this.PASSWORD = PASSWORD
    this.DB = DB
    this.PORT = DB_PORT
    this.dialect = "postgres"
    this.pool = {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    };
  }

  getConfig() {
    return {
      HOST: this.HOST,
      USER: this.USER,
      PASSWORD: this.PASSWORD,
      DB: this.DB,
      PORT: this.PORT,
      dialect: this.dialect,
      pool: this.pool
    };
  }
}

module.exports = new DBConfig().getConfig();

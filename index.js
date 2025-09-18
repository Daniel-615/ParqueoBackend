const express = require("express");
const cors = require("cors");
const db = require("./src/models/index.js"); 
const ParqueoRoutes = require("./src/routes/parqueo.route.js");
class Server {
  constructor() {
    this.app = express();
    this.port = process.env.PORT;

    // Middlewares principales
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    this.configureMiddlewares();
    this.configureRoutes();
    this.connectDatabase();
  }

  configureMiddlewares() {
    this.app.use(
      cors({
        origin: process.env.FRONTEND_URL || "http://localhost:3002",
        credentials: true,
      })
    );
  }

  configureRoutes() {
    new ParqueoRoutes(this.app);
  }

  async connectDatabase() {
    try {
      await db.connect();
      await db._sequelize.sync({ alter: true });
      console.log("Base de datos conectada y sincronizada.");
      const tables = await db._sequelize.getQueryInterface().showAllTables();
      console.log(" Tablas en la base de datos:", tables);
    } catch (error) {
      console.error("Error al conectar con la base de datos:", error);
    }
  }

  start() {
    this.app.listen(this.port, () => {
      console.log(`Servidor corriendo en el puerto ${this.port}`);
    });
  }
}

const server = new Server();
server.start();

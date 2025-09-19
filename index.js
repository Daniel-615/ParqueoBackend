const express = require("express");
const http = require("http");                 
const cors = require("cors");
const { Server: IOServer } = require("socket.io"); 
const db = require("./src/models/index.js");
const ParqueoRoutes = require("./src/routes/parqueo.route.js");
const StatsRoutes = require("./src/routes/stats.route.js");
class Server {
  constructor() {
    this.app = express();
    this.port = process.env.PORT || 3000;

    this.httpServer = http.createServer(this.app);
    this.io = new IOServer(this.httpServer, {      
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3002",
        credentials: true,
      },
    });

    this.app.locals.io = this.io; 

    // Middlewares
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    this.configureMiddlewares();
    this.configureRoutes();
    this.configureSockets(); 
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
    new StatsRoutes(this.app);
  }

  configureSockets() {

    const nsp = this.io.of("/parqueos");

    nsp.on("connection", (socket) => {

      socket.join("parqueos:all");


      socket.on("subscribe", ({ parqueoId }) => {
        if (parqueoId) socket.join(`parqueo:${parqueoId}`);
      });


      socket.on("toggle_parqueo", async ({ id, activo }) => {

      });

      socket.on("disconnect", () => {});
    });
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
    this.httpServer.listen(this.port, () => {
      console.log(`Servidor corriendo en el puerto ${this.port}`);
    });
  }
}

const server = new Server();
server.start();

const express = require('express');
const StatsController = require('../controllers/stats.controller');

class StatsRoutes{
    constructor(app){
        this.router=express.Router();
        this.controller=new StatsController();
        this.registerRoutes();
        app.use('/api/stats',this.router);
    }
    registerRoutes(){
        this.router.get('/hours', StatsController.hours);
        this.router.get('/daily', StatsController.daily);
        this.router.get('/top-parqueos', StatsController.topParqueos);
        this.router.get('/heatmap', StatsController.heatmap);
    }
}
module.exports=StatsRoutes;
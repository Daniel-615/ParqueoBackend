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
        router.get('/hours', StatsController.hours);
        router.get('/daily', StatsController.daily);
        router.get('/top-parqueos', StatsController.topParqueos);
        router.get('/heatmap', StatsController.heatmap);
    }
}
module.exports=StatsRoutes;
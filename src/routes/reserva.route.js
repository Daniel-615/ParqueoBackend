const express= require('express');
const ReservaController= require('../controllers/reserva.controller.js')
class ReservaRoutes{
    constructor(app){
        this.router=express.Router();
        this.controller=new ReservaController();
        this.registerRoutes();
        app.use('/api/reserva',this.router);
    }
    registerRoutes(){
        this.router.post('/',this.controller.create.bind(this.controller));
        this.router.post('/:id/confirm',this.controller.confirm.bind(this.controller));
        this.router.post('/:id/cancel',this.controller.cancel.bind(this.controller));
        this.router.post('/:id/checkin',this.controller.checkin.bind(this.controller));
        this.router.get('/availability',this.controller.availability.bind(this.controller));
    }
}
module.exports=ReservaRoutes;
const express=require('express');
const ParqueoController=require('../controllers/parqueo.controller.js')

class ParqueoRoutes{
    constructor(app){
        this.router=express.Router();
        this.controller=new ParqueoController();
        this.registerRoutes();
        app.use('/api/parqueo',this.router);
    }
    registerRoutes(){
        this.router.get('/',this.controller.getAllParqueos.bind(this.controller))
        this.router.post('/',this.controller.createParqueo.bind(this.controller))
        //aqui enviaré los 10 ids con su estado para actualizar.
        this.router.post('/actualizar',this.controller.updateParqueo.bind(this.controller))
        this.router.put('/:id',this.controller.activateParqueo.bind(this.controller))
        this.router.put('/desactivar/:id',this.controller.deactivateParqueo.bind(this.controller))
        //suscripcion para estar pendiente 
        this.router.post('/:id/notify', this.controller.sendNotifier.bind(this.controller));
    }
}
module.exports=ParqueoRoutes;
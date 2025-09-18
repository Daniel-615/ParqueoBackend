const {Model ,DataTypes} = require('sequelize');
class Parqueo extends Model{
}
module.exports=(sequelize)=>{
    Parqueo.init({
        id:{
            type:DataTypes.INTEGER,
            primaryKey:true,
            autoIncrement: true
        },
        nombre:{
            type:DataTypes.STRING,
            allowNull: false
        },
        activo:{
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        ocupado:{
            type: DataTypes.BOOLEAN,
            defaultValue: false
        }
    },{
        sequelize,
        modelName:'Parqueo',
        tableName: 'parqueos',
        timestamps: true
    }
    );
    return Parqueo;
}
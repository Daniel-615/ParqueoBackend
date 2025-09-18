const { Model, DataTypes } = require('sequelize');

class ParqueoWaitlist extends Model {}

module.exports = (sequelize) => {
  ParqueoWaitlist.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    parqueoId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'parqueos', // nombre de la tabla Parqueo
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false
    },
    notifiedAt: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'ParqueoWaitlist',
    tableName: 'parqueo_waitlist',
    timestamps: true
  });

  return ParqueoWaitlist;
};

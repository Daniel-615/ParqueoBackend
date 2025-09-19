const { Model, DataTypes } = require('sequelize');

class ParqueoLog extends Model {}

module.exports = (sequelize) => {
  ParqueoLog.init({
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    parqueo_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    event: {
      type: DataTypes.STRING(32),
      allowNull: false,
      defaultValue: 'update',   
    },
    created_at: {
      type: DataTypes.DATE,    
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  }, {
    sequelize,
    modelName: 'ParqueoLog',
    tableName: 'parqueo_logs',
    timestamps: false,
    underscored: true,
  });

  return ParqueoLog;
};

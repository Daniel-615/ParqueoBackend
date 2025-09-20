
const { Model, DataTypes, Op } = require('sequelize');
class Reserva extends Model {
  static overlapsWhere(parqueo_id, from, to) {
    return {
      parqueo_id,
      status: ['pending', 'active', 'in_use'], // solo chocamos con reservas vigentes
      [Op.not]: {
        [Op.or]: [
          { to:   { [Op.lte]: from } },
          { from: { [Op.gte]: to }   },
        ],
      },
    };
  }
}

module.exports = (sequelize) => {
  Reserva.init(
    {
      id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
      },

      // relación con parqueos
      parqueo_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      email: {
        type: DataTypes.STRING(50),
        allowNull: false,
        validate: { isEmail: true, len: [5, 50] },
      },
      nombre: {
        type: DataTypes.STRING(60),
        allowNull: true,
      },

      code: {
        type: DataTypes.STRING(8),
        allowNull: false,
      },

      from: { type: DataTypes.DATE, allowNull: false },
      to:   { type: DataTypes.DATE, allowNull: false },

      status: {
        type: DataTypes.ENUM('pending', 'active', 'in_use', 'cancelled', 'expired', 'completed'),
        allowNull: false,
        defaultValue: 'active',
      },
      created_at:   { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      canceled_at:  { type: DataTypes.DATE },
      checked_in_at:{ type: DataTypes.DATE },
      completed_at: { type: DataTypes.DATE },

    },
    {
      sequelize,
      modelName: 'Reserva',
      tableName: 'reservas',
      underscored: true,
      timestamps: false,
      indexes: [
        { fields: ['parqueo_id', 'from', 'to'] },
        { fields: ['email'] },
        { unique: true, fields: ['code'] }, 
      ],
      validate: {
        rangoValido() {
          if (!this.from || !this.to || this.from >= this.to) {
            throw new Error('Rango horario inválido: from debe ser < to');
          }
        },
      },
    }
  );

  return Reserva;
};

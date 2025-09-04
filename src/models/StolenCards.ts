import { DataTypes, Model } from "sequelize"
import connexion from "../config/db"
import { StolenCardsAttributes } from "../types"

class StolenCards extends Model<StolenCardsAttributes> implements StolenCardsAttributes {
  declare card_type: string
  declare card_serial_number: string
  declare date: Date
  declare estado: boolean
}

StolenCards.init(
  {
    card_type: {
      type: DataTypes.STRING,
      allowNull: false
    },
    card_serial_number: {
      type: DataTypes.STRING,
      allowNull: false,
      primaryKey: true
    },
    date: {
      type: DataTypes.DATE,
      allowNull: false
    },
    estado: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'ACTIVO'
    }
  },
  {
    sequelize: connexion,
    modelName: 'StolenCards',
    tableName: 'stolencards',
    timestamps: false
  }
)
export default StolenCards
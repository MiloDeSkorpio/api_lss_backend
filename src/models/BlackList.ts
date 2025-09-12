import { DataTypes, Model } from "sequelize"
import connexion from "../config/db"
import { BlackListAttributtes } from "../types"

class BlackList extends Model<BlackListAttributtes> implements BlackListAttributtes {
  declare card_type: string
  declare card_serial_number: string
  declare priority: string
  declare blacklisting_date: Date
  declare version_ln: number
  declare estado: boolean
}

BlackList.init(
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
    priority: {
      type: DataTypes.STRING,
      allowNull: false
    },
    blacklisting_date: {
      type: DataTypes.DATE,
      allowNull: false
    },
    version_ln: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    estado: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      primaryKey: true
    }
  },
  {
    sequelize: connexion,
    modelName: 'BlackList',
    tableName: 'blacklist',
    timestamps: false
  }
)

export default BlackList
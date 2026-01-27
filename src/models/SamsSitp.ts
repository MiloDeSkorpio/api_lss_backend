import { DataTypes, Model } from "sequelize"
import connexion from "../config/db"
import { SamsSitpAttributes } from "../types"


class SamsSitp extends Model<SamsSitpAttributes> implements SamsSitpAttributes {
  declare production_log_file: string
  declare serial_number_decimal: bigint
  declare serial_number_hexadecimal: string
  declare configuration: string
  declare reference: string
  declare line_operator_or_recipient: string
  declare lock_index: string
  declare production_date: string
  declare version: number
}

SamsSitp.init(
  {
    production_log_file: {
      type: DataTypes.STRING,
      allowNull: false
    },
    serial_number_decimal: {
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true
    },
    serial_number_hexadecimal: {
      type: DataTypes.STRING,
      allowNull: false
    },
    configuration: {
      type: DataTypes.STRING,
      allowNull: false
    },
    reference: {
      type: DataTypes.STRING,
      allowNull: false
    },
    line_operator_or_recipient: {
      type: DataTypes.STRING,
      allowNull: false
    },
    lock_index: {
      type: DataTypes.STRING,
      allowNull: false
    },
    production_date: {
      type: DataTypes.STRING,
      allowNull: false
    },
    version: {
      type: DataTypes.INTEGER,
      allowNull: false
    }
  }, 
  {
    sequelize: connexion,
    modelName: 'SamsSitp',
    tableName: 'sams_sitp',
    timestamps: false
  }
)
export default SamsSitp
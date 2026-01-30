import { DataTypes, Model } from "sequelize"
import connexion from "../config/db"

export class LSS_TCSM extends Model {
  public serial_hex!: string
  public location_zone!: number
  public status!: string
  public version!: number
}

LSS_TCSM.init(
  {
    serial_hex: {
      type: DataTypes.STRING,
      primaryKey: true,
      allowNull: false,
    },
    location_zone: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    status: {
      type: DataTypes.STRING,
      defaultValue: 'ACTIVO',
      allowNull: false,
      primaryKey: true
    },
    version: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
  },
  {
    tableName: 'lss_tcsm',
    sequelize: connexion,
    timestamps: false,
  }
)
// LSS_TCSM.sync({alter: true})


import { DataTypes, Model } from "sequelize"
import connexion from "../config/db"

export class LSS_TIMT extends Model {
  public serial_hex!: string
  public location_id!: string
  public dias!: string
  public horario!: string
  public status!: boolean
  public version!: number
}
LSS_TIMT.init(
  {
    serial_hex: {
      type: DataTypes.STRING, 
      primaryKey: true,
      allowNull: false,
    },
    location_id: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    dias: {
      type: DataTypes.STRING,
      allowNull: false,

    },
    horario: {
      type: DataTypes.STRING,
      allowNull: false, 
    },
    status: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
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
    tableName: 'lss_timt',
    sequelize: connexion,
    timestamps: false,
  }
)
// LSS_TIMT.sync({alter: true})
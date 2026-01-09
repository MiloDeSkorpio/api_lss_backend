import { DataTypes, Model } from "sequelize"
import connexion from "../config/db"

export class Role extends Model {
  public id!: number
  public name!: string
}

Role.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(128),
      allowNull: false,
      unique: true,
    },
  },
  {
    tableName: 'roles',
    sequelize: connexion,
    timestamps: false,
  }
)
import { DataTypes, Model } from "sequelize"
import connexion from "../config/db"

export class Role extends Model {
  public id!: number
  public name!: string
}

Role.init(
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
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
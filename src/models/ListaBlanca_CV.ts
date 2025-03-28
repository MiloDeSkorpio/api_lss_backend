import { DataTypes, Model } from "sequelize";
import connexion from "../config/db";

class WhiteListCV extends Model {
  public SERIAL_DEC!: number;
  public SERIAL_HEX!: string;
  public CONFIG!: string;
  public OPERATOR!: string;
  public LOCATION_ID!: string;
  public ESTACION!: string;
}

WhiteListCV.init(
  {
    SERIAL_DEC: {
      type: DataTypes.INTEGER, 
      allowNull: false,
      primaryKey: true // clave primaria
    },
    SERIAL_HEX: {
      type: DataTypes.STRING, 
      allowNull: false, 
    },
    CONFIG: {
      type: DataTypes.STRING, 
      allowNull: false, 
    },
    OPERATOR: {
      type: DataTypes.STRING, 
      allowNull: false, 
    },
    LOCATION_ID: {
      type: DataTypes.STRING, 
      allowNull: false, 
    },
    ESTACION: {
      type: DataTypes.STRING, 
      allowNull: false, 
    },
    VERSION: {
      type: DataTypes.INTEGER, 
      allowNull: false, 
      primaryKey: true // clave primaria
    }
  },
  {
    sequelize: connexion, // Usa la conexión importada
    modelName: 'WhiteListCV', // Nombre del modelo
    tableName: 'whitelist_cv', // Nombre de la tabla en la base de datos
    timestamps: false, // Desactiva los campos createdAt y updatedAt
  }
)

export default WhiteListCV
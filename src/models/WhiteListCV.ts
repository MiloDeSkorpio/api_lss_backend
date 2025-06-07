import { DataTypes, Model } from "sequelize"
import connexion from "../config/db"

interface WhiteListCVAttributes {
   SERIAL_DEC: number
   SERIAL_HEX: string
   CONFIG: string
   OPERATOR: string
   LOCATION_ID: string
   ESTACION: string
   VERSION: number
   ESTADO: string
}

class WhiteListCV extends Model<WhiteListCVAttributes> implements WhiteListCVAttributes {
  declare SERIAL_DEC: number
  declare SERIAL_HEX: string
  declare CONFIG: string
  declare OPERATOR: string
  declare LOCATION_ID: string
  declare ESTACION: string
  declare VERSION: number
  declare ESTADO: string
}

WhiteListCV.init(
  {
    SERIAL_DEC: {
      type: DataTypes.BIGINT, 
      allowNull: false,
      primaryKey: true
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
      primaryKey: true
    },
    ESTADO: {
      type: DataTypes.STRING, 
      allowNull: false, 
      defaultValue: 'ACTIVO',
      primaryKey: true
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
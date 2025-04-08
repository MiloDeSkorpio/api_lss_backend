import { DataTypes, Model } from "sequelize"
import connexion from "../config/db"

interface WhiteListCVAttributes {
   SERIAL_DEC: number
   SERIAL_HEX: string
   CONFIG: string
   OPERATOR: string
   LOCATION_ID: string
   ESTACION: string
   VERSION: string
   ESTADO: string
}

class WhiteListCV extends Model<WhiteListCVAttributes> implements WhiteListCVAttributes {
  public SERIAL_DEC!: number
  public SERIAL_HEX!: string
  public CONFIG!: string
  public OPERATOR!: string
  public LOCATION_ID!: string
  public ESTACION!: string
  public VERSION!: string
  public ESTADO!: string
}

WhiteListCV.init(
  {
    SERIAL_DEC: {
      type: DataTypes.BIGINT, 
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
    },
    ESTADO: {
      type: DataTypes.STRING, 
      allowNull: false, 
      defaultValue: 'ACTIVO'
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
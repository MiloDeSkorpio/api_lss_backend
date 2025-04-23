import { DataTypes, Model } from "sequelize"
import connexion from "../config/db"

interface SamsSitpAttributes {
  id_semovi: string
  sam_id_hex: string
  sam_id_dec: bigint
  provider_code: string
  sam_tipo: string
  sam_config: string
  llaves_tipo: string
  version_parametros: string
  lock_index: string
  fecha_produccion: string
  hora_produccion: string
  atr: string
  samsp_id_hex: string
  samsp_version_parametros: string
  sam_fabricante: string
  sam_archivo_produccion: string
  receptor_operador_linea: string
  recibido_por: string
  documento_soporte1: string
  documento_soporte2: string
  observaciones: string
}

class SamsSitp extends Model<SamsSitpAttributes> implements SamsSitpAttributes {
  declare id_semovi: string
  declare sam_id_hex: string
  declare sam_id_dec: bigint
  declare provider_code: string
  declare sam_tipo: string
  declare sam_config: string
  declare llaves_tipo: string
  declare version_parametros: string
  declare lock_index: string
  declare fecha_produccion: string
  declare hora_produccion: string
  declare atr: string
  declare samsp_id_hex: string
  declare samsp_version_parametros: string
  declare sam_fabricante: string
  declare sam_archivo_produccion: string
  declare receptor_operador_linea: string
  declare recibido_por: string
  declare documento_soporte1: string
  declare documento_soporte2: string
  declare observaciones: string
}

SamsSitp.init(
  {
    id_semovi: {
      type: DataTypes.STRING,
      allowNull: false,
      primaryKey: true
    },
    sam_id_hex: {
      type: DataTypes.STRING,
      allowNull: false,
      primaryKey: true
    },
    sam_id_dec: {
      type: DataTypes.BIGINT,
      allowNull: false,
      primaryKey: true
    },
    provider_code: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    sam_tipo: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    sam_config: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    llaves_tipo: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    version_parametros: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    lock_index: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    fecha_produccion: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    hora_produccion: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    atr: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    samsp_id_hex: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    samsp_version_parametros: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    sam_fabricante: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    sam_archivo_produccion: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    receptor_operador_linea: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    recibido_por: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    documento_soporte1: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    documento_soporte2: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    observaciones: {
      type: DataTypes.STRING,
      allowNull: false,
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
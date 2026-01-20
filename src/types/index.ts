import { Request } from "express"

export interface MulterRequest extends Request {
  files: Express.Multer.File[]
}

export interface StolenCardsAttributes {
  card_type: string
  card_serial_number: string
  date: Date
  estado: string
}

export interface BlackListAttributtes {
  card_type: string
  card_serial_number: string
  priority: string
  blacklisting_date: Date
  version_ln: number
  estado: string
}

export interface CategorizedFiles {
  altasFiles: Express.Multer.File[]
  bajasFiles: Express.Multer.File[]
  cambiosFiles?: Express.Multer.File[]
}

export const categorized: CategorizedFiles = {
  altasFiles: [],
  bajasFiles: [],
  cambiosFiles: [],
}
export interface ValidationErrorItem {
  message?: string
}

export interface ValidationError {
  fileName?: string
  fileErrors?: ValidationErrorItem[]
}

export const priorityValues = ['48', '60', '64', '80']
export const headers_ups_blacklist = ['card_type', 'card_serial_number', 'priority', 'blacklisting_date']
export const headers_downs_blacklist = ['card_type', 'card_serial_number']
export const prov_codes_bl = ['01', '5A', '15', '32', '46', '64']
export const REQUIRED_HEADERS = ['SERIAL_DEC', 'SERIAL_HEX', 'CONFIG', 'OPERATOR', 'LOCATION_ID', 'ESTACION']
export const PROVIDER_CODES = ['01', '02', '03', '04', '05', '06', '07', '15', '32', '3C', '46', '5A', '64']

export const categorizedBl = {
  altas: [],
  bajas: []
}

export interface CategorizedBLFiles {
  altas: Express.Multer.File[],
  bajas: Express.Multer.File[]
}
export interface HeaderValidationResult {
  missing: string[]    // Headers requeridos que faltan
  extra: string[]      // Headers presentes pero no requeridos
  valid: boolean       // Si todos los requeridos están presentes
}

export const catByOrg = {
  mb: {
    altas: [],
    bajas: []
  },
  ste: {
    altas: [],
    bajas: []
  },
  ort: {
    altas: [],
    bajas: []
  },
  stc: {
    altas: [],
    bajas: []
  },
  rtp: {
    altas: [],
    bajas: []
  },
  sem: {
    altas: [],
    bajas: []
  }
}

export interface FileData {
  fileName: string
  errors: any
  validData: any[]
}

export interface ValidationResult {
  datosValidos: any[]
  datosDuplicados: any[]
}

export interface OrgResults {
  altasValidas: any[]
  altasDuplicadas: any[]
  altasInactivas: any[]
  bajasValidas: any[]
  bajasInactivas: any[]
  bajasInStolen: any[]
  bajasSinRegistro: any[]
}

export interface FinalResult {
  altasFinal: any[]
  bajasFinal: any[]
  results: { [orgCode: string]: OrgResults }[]
}

// Mapeo de códigos a organizaciones para evitar repetir condiciones
export const ORG_MAPPING: { [key: string]: keyof typeof catByOrg } = {
  '_01_': 'mb',
  '_5A_': 'ste',
  '_15_': 'ort',
  '_32_': 'stc',
  '_46_': 'rtp',
  '_64_': 'sem'
}

export const listNames = ['SAMS','WHITELIST', 'BLACKLIST', 'WHITELIST_CV', 'LSS-TCSM','LSS-TIMT'] as const
export const operationTypes = ['CREATION', 'ROLLBACK'] as const

export type ListName = typeof listNames[number]
export type OperationType = typeof operationTypes[number]

export interface VersionHistoryAttributes {
  id: number
  listName: typeof listNames[number]
  version: string
  operationType: typeof operationTypes[number]
  userId: number
  createdAt?: Date
  updatedAt?: Date
}

export interface UserAttributes {
  id?: string
  name: string
  email: string
  password: string
  roleId: string
  verification_code: string
  verification_expires: Date
  verification_last_sent: Date
  verification_resend_count: number
  reset_code: string
  reset_expires: Date
  reset_last_sent: Date
  reset_resend_count: number
  is_verified: boolean
  createdAt?: Date
  updatedAt?: Date
}

export interface SamsSitpAttributes {
production_log_file: string
serial_number_decimal: bigint
serial_number_hexadecimal: string
configuration: string
reference: string
line_operator_or_recipient: string
lock_index: string
production_date: string
version?: number
}

export const headers_sams = [
    'production_log_file',
    'serial_number_decimal',
    'serial_number_hexadecimal',
    'configuration',
    'reference',
    'line_operator_or_recipient',
    'lock_index',
    'production_date',
]

export interface CategoryConfig {
  key: string
  label: string
  regex: RegExp
}

export const CATEGORIES: CategoryConfig[] = [
  { key: 'STC', label: 'STC', regex: /STC/i },
  { key: 'STE', label: 'STE', regex: /STE|Cablebus/i },
  { key: 'ORT', label: 'ORT', regex: /ORT/i },
  { key: 'RTP', label: 'RTP', regex: /RTP/i },
  { key: 'Metrobus', label: 'Metrobus', regex: /MB Line/i },
  { key: 'Edomex', label: 'Edomex', regex: /Mexicable|Mexibus/i },
  { key: 'Spirtech', label: 'Spirtech', regex: /Spirtech/i }
]

export const headers_lss_tcsm = [
    'serial_hex',
    'location_zone',
]
export const headers_lss_timt = [
    'serial_hex',
    'location_id',
    'dias',
    'horario',
]
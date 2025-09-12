import { Request } from "express"

export interface MulterRequest extends Request {
  files: Express.Multer.File[]
}

export interface StolenCardsAttributes {
  card_type: string
  card_serial_number: string
  date: Date
  estado: boolean
}

export interface BlackListAttributtes {
  card_type: string
  card_serial_number: string
  priority: string
  blacklisting_date: Date
  version_ln: number
  estado: boolean
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
  missing: string[];    // Headers requeridos que faltan
  extra: string[];      // Headers presentes pero no requeridos
  valid: boolean;       // Si todos los requeridos están presentes
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
  fileName: string;
  errors: any
  validData: any[];
}

export interface ValidationResult {
  datosValidos: any[];
  datosDuplicados: any[];
}

export interface OrgResults {
  altasValidas: any[];
  altasDuplicadas: any[];
  bajasValidas: any[];
  bajasInactivas: any[];
  bajasInStolen: any[];
}

export interface FinalResult {
  altasFinal: any[];
  bajasFinal: any[];
  results: { [orgCode: string]: OrgResults }[];
}

// Mapeo de códigos a organizaciones para evitar repetir condiciones
export const ORG_MAPPING: { [key: string]: keyof typeof catByOrg } = {
  '_01_': 'mb',
  '_5A_': 'ste',
  '_15_': 'ort',
  '_32_': 'stc',
  '_46_': 'rtp',
  '_64_': 'sem'
};
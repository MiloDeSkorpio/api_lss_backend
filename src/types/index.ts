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
  version: number
  estado: boolean
}

export const headers_ups_blacklist = ['card_type','card_serial_number','priority','blacklisting_date']
export const headers_downs_blacklist = ['card_type','card_serial_number']
export const prov_codes_bl = ['01','5A','15','32','46','64']

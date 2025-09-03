export interface MulterRequest extends Request {
  files: Express.Multer.File[]
}

export interface StolenCardsAttributes {
  card_type: string
  card_serial_number: string
  date: Date
}

export interface BlackListAttributtes {
  card_type: string
  card_serial_number: string
  priority: string
  blacklisting_date: Date
  version: number
  estado: boolean
}
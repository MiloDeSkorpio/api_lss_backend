import { Sequelize } from 'sequelize'
import colors from 'colors'
import { exit } from 'node:process'
import dotenv from 'dotenv'
dotenv.config()

const connexion = new Sequelize(process.env.DB_NAME,process.env.DB_USER,process.env.DB_PASS,{
  dialect: 'mysql', 
  host: process.env.DB_HOST, 
  port: Number.parseInt(process.env.DB_PORT || '3306', 10), 
  logging: false,
})

export const connectDB = async () => {
  try {
    await connexion.authenticate()
    // await connexion.sync({alter: true})
    console.log(colors.magenta.bold(`MySQL conectado en: ${process.env.DB_HOST}:${process.env.DB_PORT}`))
  } catch (error) {
    console.log(colors.red.bold('Error al conectar a MySQL:'))
    console.log(error)
    exit(1)
  }
}
export default connexion
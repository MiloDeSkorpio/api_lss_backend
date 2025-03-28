import express from 'express'
import morgan from 'morgan'
import whiteListRoutes from './routes/whitelistRoutes'
import { connectDB } from './config/db'
// Iniciar la conexion a la DB
connectDB()
// Iniciar el Servidor
const server = express()
server.use(morgan('dev'))
// Leer datos de formularios
server.use(express.json())
// Rutas
server.use('/api/whitelist',whiteListRoutes)

export default server
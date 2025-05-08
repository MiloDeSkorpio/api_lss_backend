import express from 'express'
import morgan from 'morgan'
import cors from 'cors'
import whiteListRoutes from './routes/whitelistRoutes'
import samsRoutes from './routes/samsRoutes'
import { connectDB } from './config/db'
// Iniciar la conexion a la DB
connectDB()
// Iniciar el Servidor
const server = express()

server.use(cors({
  origin: process.env.FRONTEND_URL,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization','Access-Control-Allow-Origin','origin'],
}))

server.use(morgan('dev'))
// Leer datos de formularios
server.use(express.json())
// Rutas
server.use('/api/whitelist',whiteListRoutes)
server.use('/api/sams',samsRoutes)

export default server
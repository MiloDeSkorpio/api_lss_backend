import 'reflect-metadata'
import express from 'express'
import morgan from 'morgan'
import cors from 'cors'
import { connectDB } from './config/db'
import whiteListRoutes from './routes/whitelistRoutes'
import samsRoutes from './routes/samsRoutes'
import blackListRoutes from './routes/blacklistRoutes'
import versionHistoryRoutes from './routes/versionHistoryRoutes' 
import authRoutes from './routes/authRoutes'
import cookieParser from 'cookie-parser'
import lssRoutes from './routes/lssRoutes'
// Iniciar la conexion a la DB
connectDB()
// Iniciar el Servidor
const server = express()
server.use(cookieParser())
server.use(cors({
  origin: process.env.FRONTEND_URL,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization','Access-Control-Allow-Origin','origin'],
  credentials: true
}))

server.use(morgan('dev'))
// Leer datos de formularios
server.use(express.json({limit: '50mb'}))
// Rutas
server.use("/api/auth", authRoutes)
server.use('/api/blacklist',blackListRoutes)
server.use('/api/whitelist',whiteListRoutes)
server.use('/api/sams',samsRoutes)
server.use('/api/lss',lssRoutes)
server.use('/api/version-history', versionHistoryRoutes)

export default server
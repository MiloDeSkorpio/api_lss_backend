import { Router } from "express"
import { AuthController } from "../controllers/AuthController"
import { validateDto } from "../middleware/validateDto"
import { RegisterUserDto } from "../dtos/RegisterUserDto"
import { LoginUserDto } from "../dtos/LoginUserDto"
import { authMiddleware } from "../middleware/auth"
import { VerifyEmailDto } from "../dtos/VerifyEmailDto"

const router = Router()
const controller = new AuthController()

router.post('/register', validateDto(RegisterUserDto), controller.register)
router.post('/login', validateDto(LoginUserDto), controller.login)
router.post('/logout', authMiddleware, controller.logout)
router.post('/verify', validateDto(VerifyEmailDto), controller.verify)
router.post('/resend-code', controller.resendCode)
router.get('/me', authMiddleware, controller.me)


export default router
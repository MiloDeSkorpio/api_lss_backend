import { Router } from "express"
import { AuthController } from "../controllers/AuthController"
import { validateDto } from "../middleware/validateDto"
import { RegisterUserDto } from "../dtos/RegisterUserDto"
import { LoginUserDto } from "../dtos/LoginUserDto"
import { authMiddleware } from "../middleware/auth"
import { VerifyEmailDto } from "../dtos/VerifyEmailDto"
import { AuthService } from "../services/AuthService"

const router = Router()

const authService = new AuthService()

const controller = new AuthController(authService)

router.post('/register', validateDto(RegisterUserDto), controller.register)
router.post('/login', validateDto(LoginUserDto), controller.login)
router.post('/logout', authMiddleware, controller.logout)
router.post('/verify', validateDto(VerifyEmailDto), controller.verify)
router.post('/resend-code', controller.resendCode)
router.get('/me', authMiddleware, controller.me)
router.post('/request-reset', controller.requestReset)
router.post('/verify-reset', controller.verifyReset)
router.post('/reset-password', controller.resetPassword)

export default router
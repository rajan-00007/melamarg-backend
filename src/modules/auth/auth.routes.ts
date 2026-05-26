import { Router } from 'express';
import { authController } from './auth.controller';
import { validate } from '../../middleware/validate.middleware';
import { sendOtpSchema, verifyOtpSchema, refreshTokenSchema, logoutSchema } from './auth.schema';

const router = Router();

router.post('/send-otp', validate(sendOtpSchema), authController.sendOtp);
router.post('/verify-otp', validate(verifyOtpSchema), authController.verifyOtp);
router.post('/refresh', validate(refreshTokenSchema), authController.refreshToken);
router.post('/refresh-token', validate(refreshTokenSchema), authController.refreshToken);
router.post('/logout', validate(logoutSchema), authController.logout);

export default router;

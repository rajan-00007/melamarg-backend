import { Request, Response } from 'express';
import { authService } from './auth.service';
import logger from '../../utils/logger';

export const authController = {
  async sendOtp(req: Request, res: Response) {
    try {
      const { phone } = req.body;

      if (!phone) {
        return res.status(400).json({ error: 'Phone number is required' });
      }

      const result = await authService.sendOtp(phone);
      console.log("otp", result)
      
      return res.status(200).json({
        message: 'OTP sent successfully',
        sessionId: result.sessionId
      });
    } catch (error: any) {
      logger.error(`Error sending OTP: ${error.message}`);
      return res.status(500).json({ error: 'Failed to send OTP' });
    }
  },

  async verifyOtp(req: Request, res: Response) {
    try {
      const { sessionId, phone, otpCode } = req.body;

      if (!sessionId || !phone || !otpCode) {
        return res.status(400).json({ error: 'sessionId, phone, and otpCode are required' });
      }

      const result = await authService.verifyOtp(sessionId, phone, otpCode);
      
      // Set the refresh token in a secure httpOnly cookie
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
      });

      return res.status(200).json({
        message: 'Verified successfully',
        ...result
      });
    } catch (error: any) {
      logger.error(`Error verifying OTP: ${error.message}`);
      
      if (error.message === 'Invalid or expired OTP' || error.message === 'OTP has expired') {
          return res.status(400).json({ error: error.message });
      }
      
      return res.status(500).json({ error: 'Failed to verify OTP' });
    }
  },

  async refreshToken(req: Request, res: Response) {
    try {
      const refreshToken = (req.cookies && req.cookies.refreshToken) || req.body.refreshToken;
      if (!refreshToken) {
        return res.status(400).json({ error: 'Refresh token is required' });
      }

      const result = await authService.refreshToken(refreshToken);
      return res.status(200).json({
        message: 'Token refreshed successfully',
        accessToken: result.accessToken
      });
    } catch (error: any) {
      logger.error(`Error refreshing token: ${error.message}`);
      return res.status(401).json({ error: error.message });
    }
  },

  async logout(req: Request, res: Response) {
    try {
      const refreshToken = (req.cookies && req.cookies.refreshToken) || req.body.refreshToken;
      if (refreshToken) {
        await authService.logout(refreshToken);
      }

      res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
      });

      return res.status(200).json({ message: 'Logged out successfully' });
    } catch (error: any) {
      logger.error(`Error during logout: ${error.message}`);
      return res.status(500).json({ error: 'Logout failed' });
    }
  }
};

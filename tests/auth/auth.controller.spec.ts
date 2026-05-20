import { authController } from '@modules/auth/auth.controller';
import { authService } from '@modules/auth/auth.service';
import { Request, Response } from 'express';
import logger from '@utils/logger';

jest.mock('@modules/auth/auth.service');
jest.mock('@utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
}));

describe('authController', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    req = { body: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    jest.clearAllMocks();
  });

  describe('sendOtp', () => {
    it('should return 400 if phone is not provided', async () => {
      await authController.sendOtp(req as Request, res as Response);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Phone number is required' });
    });

    it('should call authService.sendOtp and return 200 on success', async () => {
      req.body = { phone: '1234567890' };
      (authService.sendOtp as jest.Mock).mockResolvedValue({ sessionId: 'session123' });
      await authController.sendOtp(req as Request, res as Response);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: 'OTP sent successfully', sessionId: 'session123' });
    });

    it('should return 500 on error', async () => {
      req.body = { phone: '1234567890' };
      (authService.sendOtp as jest.Mock).mockRejectedValue(new Error('Test error'));
      await authController.sendOtp(req as Request, res as Response);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to send OTP' });
    });
  });

  describe('verifyOtp', () => {
    it('should return 400 if required fields are missing', async () => {
      await authController.verifyOtp(req as Request, res as Response);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'sessionId, phone, and otpCode are required' });
    });

    it('should return 200 on successful verification', async () => {
      req.body = { sessionId: 'session123', phone: '1234567890', otpCode: '123456' };
      (authService.verifyOtp as jest.Mock).mockResolvedValue({ accessToken: 'access', refreshToken: 'refresh' });
      await authController.verifyOtp(req as Request, res as Response);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: 'Verified successfully', accessToken: 'access', refreshToken: 'refresh' });
    });

    it('should return 400 on Invalid or expired OTP error', async () => {
      req.body = { sessionId: 'session123', phone: '1234567890', otpCode: '123456' };
      (authService.verifyOtp as jest.Mock).mockRejectedValue(new Error('Invalid or expired OTP'));
      await authController.verifyOtp(req as Request, res as Response);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid or expired OTP' });
    });

    it('should return 400 on OTP has expired error', async () => {
      req.body = { sessionId: 'session123', phone: '1234567890', otpCode: '123456' };
      (authService.verifyOtp as jest.Mock).mockRejectedValue(new Error('OTP has expired'));
      await authController.verifyOtp(req as Request, res as Response);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'OTP has expired' });
    });

    it('should return 500 on other errors', async () => {
      req.body = { sessionId: 'session123', phone: '1234567890', otpCode: '123456' };
      (authService.verifyOtp as jest.Mock).mockRejectedValue(new Error('Some other error'));
      await authController.verifyOtp(req as Request, res as Response);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to verify OTP' });
    });
  });

  describe('refreshToken', () => {
    it('should return 400 if refreshToken is not provided', async () => {
      await authController.refreshToken(req as Request, res as Response);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Refresh token is required' });
    });

    it('should return 200 on successful token refresh', async () => {
      req.body = { refreshToken: 'oldToken' };
      (authService.refreshToken as jest.Mock).mockResolvedValue({ accessToken: 'newToken' });
      await authController.refreshToken(req as Request, res as Response);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: 'Token refreshed successfully', accessToken: 'newToken' });
    });

    it('should return 401 on error', async () => {
      req.body = { refreshToken: 'oldToken' };
      (authService.refreshToken as jest.Mock).mockRejectedValue(new Error('Invalid token'));
      await authController.refreshToken(req as Request, res as Response);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid token' });
    });
  });

  describe('logout', () => {
    it('should call authService.logout and return 200', async () => {
      req.body = { refreshToken: 'token' };
      (authService.logout as jest.Mock).mockResolvedValue(undefined);
      await authController.logout(req as Request, res as Response);
      expect(authService.logout).toHaveBeenCalledWith('token');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: 'Logged out successfully' });
    });

    it('should not call authService.logout if no token but return 200', async () => {
      await authController.logout(req as Request, res as Response);
      expect(authService.logout).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should return 500 on error', async () => {
      req.body = { refreshToken: 'token' };
      (authService.logout as jest.Mock).mockRejectedValue(new Error('Logout failed'));
      await authController.logout(req as Request, res as Response);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Logout failed' });
    });
  });
});

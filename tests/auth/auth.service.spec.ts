import { authService } from '@modules/auth/auth.service';
import { query } from '@config/database';
import { msg91Provider } from '@providers/msg91Provider';
import { generateToken, generateRefreshToken, verifyRefreshToken } from '@utils/jwt';
import logger from '@utils/logger';

jest.mock('crypto', () => ({ randomUUID: () => 'mock-uuid' }));
jest.mock('@config/database');
jest.mock('@providers/msg91Provider', () => ({
  msg91Provider: { send: jest.fn() }
}));
jest.mock('@utils/jwt');
jest.mock('@utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
}));

describe('authService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('sendOtp', () => {
    it('should generate OTP, save to DB, send via MSG91, and return sessionId when in production', async () => {
      process.env.NODE_ENV = 'production';
      delete process.env.MSG91_AUTH_KEY;
      (query as jest.Mock).mockResolvedValue({});
      
      const result = await authService.sendOtp('1234567890');
      
      expect(result).toHaveProperty('sessionId', 'mock-uuid');
      expect(query).toHaveBeenCalled();
      expect(msg91Provider.send).toHaveBeenCalled();
    });

    it('should send via MSG91 if MSG91_AUTH_KEY is set even if not in production', async () => {
      process.env.NODE_ENV = 'development';
      process.env.MSG91_AUTH_KEY = 'some-key';
      (query as jest.Mock).mockResolvedValue({});
      
      await authService.sendOtp('1234567890');
      expect(msg91Provider.send).toHaveBeenCalled();
    });

    it('should NOT send via MSG91 if not in production and no MSG91_AUTH_KEY', async () => {
      process.env.NODE_ENV = 'development';
      delete process.env.MSG91_AUTH_KEY;
      (query as jest.Mock).mockResolvedValue({});
      
      await authService.sendOtp('1234567890');
      expect(msg91Provider.send).not.toHaveBeenCalled();
    });
  });

  describe('verifyOtp', () => {
    it('should throw error if OTP is invalid', async () => {
      (query as jest.Mock).mockResolvedValue({ rows: [] });
      await expect(authService.verifyOtp('sess', 'phone', 'otp')).rejects.toThrow('Invalid or expired OTP');
    });

    it('should throw error if OTP is expired', async () => {
      (query as jest.Mock).mockResolvedValue({ rows: [{ expires_at: new Date(Date.now() - 10000) }] });
      await expect(authService.verifyOtp('sess', 'phone', 'otp')).rejects.toThrow('OTP has expired');
    });

    it('should create new admin if not exists, verify OTP and return tokens', async () => {
      const futureDate = new Date(Date.now() + 10000);
      (query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: 1, expires_at: futureDate }] }) 
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({ rows: [] }) // check admin
        .mockResolvedValueOnce({ rows: [{ id: 'mock-uuid', phone: 'phone' }] }) 
        .mockResolvedValueOnce({}); // insert refresh token

      (generateToken as jest.Mock).mockReturnValue('access_token');
      (generateRefreshToken as jest.Mock).mockReturnValue('refresh_token');

      const result = await authService.verifyOtp('sess', 'phone', 'otp');

      expect(result).toHaveProperty('accessToken', 'access_token');
      expect(result).toHaveProperty('refreshToken', 'refresh_token');
      expect(result.admin).toHaveProperty('id', 'mock-uuid');
    });

    it('should throw error if admin is deactivated', async () => {
      const futureDate = new Date(Date.now() + 10000);
      (query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: 1, expires_at: futureDate }] }) // verify otp
        .mockResolvedValueOnce({}) // mark used
        .mockResolvedValueOnce({ rows: [{ id: 'mock-uuid', phone: 'phone', is_active: false }] }); // check admin

      await expect(authService.verifyOtp('sess', 'phone', 'otp')).rejects.toThrow('Account is deactivated');
    });
    
    it('should verify OTP and return tokens for existing admin', async () => {
      const futureDate = new Date(Date.now() + 10000);
      (query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: 1, expires_at: futureDate }] }) // verify otp
        .mockResolvedValueOnce({}) // mark used
        .mockResolvedValueOnce({ rows: [{ id: 'mock-uuid', phone: 'phone', is_active: true }] }) // check admin
        .mockResolvedValueOnce({}); // insert refresh token

      (generateToken as jest.Mock).mockReturnValue('access_token');
      (generateRefreshToken as jest.Mock).mockReturnValue('refresh_token');

      const result = await authService.verifyOtp('sess', 'phone', 'otp');

      expect(result).toHaveProperty('accessToken', 'access_token');
      expect(result).toHaveProperty('refreshToken', 'refresh_token');
    });
  });

  describe('refreshToken', () => {
    it('should throw error if token is invalid or expired', async () => {
      (verifyRefreshToken as jest.Mock).mockReturnValue(null);
      await expect(authService.refreshToken('old')).rejects.toThrow('Invalid or expired refresh token');
    });

    it('should throw error if token not in DB', async () => {
      (verifyRefreshToken as jest.Mock).mockReturnValue({ id: 'admin1' });
      (query as jest.Mock).mockResolvedValue({ rows: [] });
      await expect(authService.refreshToken('old')).rejects.toThrow('Invalid refresh token');
    });

    it('should throw error if token is expired in DB', async () => {
      (verifyRefreshToken as jest.Mock).mockReturnValue({ id: 'admin1' });
      (query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: 1, expires_at: new Date(Date.now() - 10000) }] })
        .mockResolvedValueOnce({});
      await expect(authService.refreshToken('old')).rejects.toThrow('Refresh token has expired');
    });

    it('should throw error if admin account is invalid or deactivated', async () => {
      (verifyRefreshToken as jest.Mock).mockReturnValue({ id: 'admin1' });
      (query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: 1, expires_at: new Date(Date.now() + 10000) }] }) // token check
        .mockResolvedValueOnce({ rows: [{ is_active: false }] }); // admin check
      
      await expect(authService.refreshToken('old')).rejects.toThrow('Admin account is invalid or deactivated');
    });

    it('should return new access token', async () => {
      (verifyRefreshToken as jest.Mock).mockReturnValue({ id: 'admin1' });
      (query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: 1, expires_at: new Date(Date.now() + 10000) }] }) // token check
        .mockResolvedValueOnce({ rows: [{ is_active: true, id: 'admin1', phone: 'phone' }] }); // admin check
      
      (generateToken as jest.Mock).mockReturnValue('new_access_token');

      const result = await authService.refreshToken('old');
      expect(result).toHaveProperty('accessToken', 'new_access_token');
    });
  });

  describe('logout', () => {
    it('should delete token', async () => {
      (query as jest.Mock).mockResolvedValue({});
      await authService.logout('token');
      expect(query).toHaveBeenCalledWith('DELETE FROM refresh_tokens WHERE token = $1', ['token']);
    });

    it('should do nothing if token is not provided', async () => {
      await authService.logout('');
      expect(query).not.toHaveBeenCalled();
    });
  });
});

import { z } from 'zod';

export const sendOtpSchema = z.object({
  body: z.object({
    phone: z.string().min(10, 'Phone number must be at least 10 characters')
  })
});

export const verifyOtpSchema = z.object({
  body: z.object({
    sessionId: z.string().min(1, 'Session ID is required'),
    phone: z.string().min(10, 'Phone number must be at least 10 characters'),
    otpCode: z.string().min(4, 'OTP Code is required')
  })
});

export const refreshTokenSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1, 'Refresh token is required')
  })
});

export const logoutSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1, 'Refresh token is required').optional()
  })
});

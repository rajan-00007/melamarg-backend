import { v4 as uuidv4 } from 'uuid';
import { query } from '../../config/database';
import { msg91Provider } from '../../providers/msg91Provider';
import { generateToken, generateRefreshToken, verifyRefreshToken } from '../../utils/jwt';
import logger from '../../utils/logger';

export const authService = {
  async sendOtp(phone: string) {
    // Generate a 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const sessionId = uuidv4();
    
    // Set expiration to 10 minutes from now
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);

    // Save to database
    await query(
      `INSERT INTO otp_verifications (session_id, phone_number, otp_code, expires_at) 
       VALUES ($1, $2, $3, $4)`,
      [sessionId, phone, otp, expiresAt]
    );

    // Always log OTP for now (as requested)
    console.log(`[OTP LOG] OTP for ${phone} is ${otp}`);
    logger.info(`[OTP LOG] OTP for ${phone} is ${otp}`);

    // Send OTP via MSG91
    if (process.env.NODE_ENV === 'production' || process.env.MSG91_AUTH_KEY) {
        await msg91Provider.send(phone, `Your MelaMarg OTP is ${otp}`, { otp });
    }

    return { sessionId, otp };
  },

  async verifyOtp(sessionId: string, phone: string, otpCode: string) {
    // Check if OTP is valid
    const result = await query(
      `SELECT * FROM otp_verifications 
       WHERE session_id = $1 AND phone_number = $2 AND otp_code = $3 AND is_used = FALSE`,
      [sessionId, phone, otpCode]
    );

    if (result.rows.length === 0) {
      throw new Error('Invalid or expired OTP');
    }

    const verificationRecord = result.rows[0];

    if (new Date() > new Date(verificationRecord.expires_at)) {
      throw new Error('OTP has expired');
    }

    // Mark as used
    await query(
      `UPDATE otp_verifications SET is_used = TRUE WHERE id = $1`,
      [verificationRecord.id]
    );

    // Check if admin exists
    let adminResult = await query(
      `SELECT * FROM admins WHERE phone = $1`,
      [phone]
    );

    let admin;
    if (adminResult.rows.length === 0) {
      // Create new admin
      const adminId = uuidv4();
      const insertResult = await query(
        `INSERT INTO admins (id, phone) VALUES ($1, $2) RETURNING *`,
        [adminId, phone]
      );
      admin = insertResult.rows[0];
      logger.info(`New admin created with phone ${phone}`);
    } else {
      admin = adminResult.rows[0];
      
      if (!admin.is_active) {
        throw new Error('Account is deactivated');
      }
    }

    // Generate JWT Access Token
    const accessToken = generateToken({
      id: admin.id,
      phone: admin.phone,
      role: admin.role
    });

    // Generate JWT Refresh Token
    const refreshToken = generateRefreshToken({
      id: admin.id
    });

    // Save refresh token to DB
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days expiry

    await query(
      `INSERT INTO refresh_tokens (admin_id, token, expires_at) VALUES ($1, $2, $3)`,
      [admin.id, refreshToken, expiresAt]
    );

    return {
      accessToken,
      refreshToken,
      admin: {
        id: admin.id,
        phone: admin.phone,
        name: admin.name,
        role: admin.role
      }
    };
  },

  async refreshToken(oldRefreshToken: string) {
    const payload = verifyRefreshToken(oldRefreshToken);
    
    if (!payload || !payload.id) {
      throw new Error('Invalid or expired refresh token');
    }

    // Verify token exists in database
    const result = await query(
      `SELECT * FROM refresh_tokens WHERE token = $1 AND admin_id = $2`,
      [oldRefreshToken, payload.id]
    );

    if (result.rows.length === 0) {
      throw new Error('Invalid refresh token');
    }

    const tokenRecord = result.rows[0];

    if (new Date() > new Date(tokenRecord.expires_at)) {
      // Delete expired token
      await query(`DELETE FROM refresh_tokens WHERE id = $1`, [tokenRecord.id]);
      throw new Error('Refresh token has expired');
    }

    // Get admin to generate new access token
    const adminResult = await query(`SELECT * FROM admins WHERE id = $1`, [payload.id]);
    
    if (adminResult.rows.length === 0 || !adminResult.rows[0].is_active) {
       throw new Error('Admin account is invalid or deactivated');
    }
    
    const admin = adminResult.rows[0];

    // Generate new Access Token
    const newAccessToken = generateToken({
      id: admin.id,
      phone: admin.phone,
      role: admin.role
    });

    // Optionally rotate the refresh token here, but for now we'll just return a new access token
    return {
      accessToken: newAccessToken
    };
  },

  async logout(refreshToken: string) {
     if (!refreshToken) return;
     await query(`DELETE FROM refresh_tokens WHERE token = $1`, [refreshToken]);
  }
};

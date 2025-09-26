const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { query, transaction } = require('../config/database');
const logger = require('../utils/logger');

/**
 * Authentication service for user login, registration, and token management
 */
class AuthService {
  constructor() {
    this.saltRounds = 12; // bcrypt salt rounds
    this.jwtSecret = process.env.JWT_SECRET;
    this.refreshTokenSecret = process.env.JWT_REFRESH_SECRET || this.jwtSecret + '_refresh';

    if (!this.jwtSecret) {
      throw new Error('JWT_SECRET environment variable is required');
    }
  }

  /**
   * Hash password using bcrypt
   * @param {string} password - Plain text password
   * @returns {Promise<string>} Hashed password
   */
  async hashPassword(password) {
    return bcrypt.hash(password, this.saltRounds);
  }

  /**
   * Verify password against hash
   * @param {string} password - Plain text password
   * @param {string} hash - Hashed password
   * @returns {Promise<boolean>} Password match result
   */
  async verifyPassword(password, hash) {
    return bcrypt.compare(password, hash);
  }

  /**
   * Generate JWT token
   * @param {Object} payload - Token payload
   * @param {string} type - Token type ('access' or 'refresh')
   * @returns {string} JWT token
   */
  generateToken(payload, type = 'access') {
    const secret = type === 'refresh' ? this.refreshTokenSecret : this.jwtSecret;
    const expiresIn = type === 'refresh' ? '7d' : '1h';

    return jwt.sign(payload, secret, {
      expiresIn,
      issuer: 'loadblock-api',
      audience: 'loadblock-client'
    });
  }

  /**
   * Verify JWT token
   * @param {string} token - JWT token
   * @param {string} type - Token type ('access' or 'refresh')
   * @returns {Object} Decoded token payload
   */
  verifyToken(token, type = 'access') {
    const secret = type === 'refresh' ? this.refreshTokenSecret : this.jwtSecret;

    return jwt.verify(token, secret, {
      issuer: 'loadblock-api',
      audience: 'loadblock-client'
    });
  }

  /**
   * Hash token for database storage
   * @param {string} token - Token to hash
   * @returns {string} SHA-256 hash of token
   */
  hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Register new user
   * @param {Object} userData - User registration data
   * @returns {Promise<Object>} Created user (without password)
   */
  async registerUser({
    email,
    password,
    firstName,
    lastName,
    phone = null,
    companyName = null,
    roles = ['shipper'] // Default role
  }) {
    // Validate required fields
    if (!email || !password || !firstName || !lastName) {
      throw new Error('Email, password, first name, and last name are required');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Invalid email format');
    }

    // Validate password strength
    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }

    // Validate roles
    const validRoles = ['admin', 'carrier', 'shipper', 'broker', 'consignee'];
    const invalidRoles = roles.filter(role => !validRoles.includes(role));
    if (invalidRoles.length > 0) {
      throw new Error(`Invalid roles: ${invalidRoles.join(', ')}`);
    }

    return transaction(async (client) => {
      // Check if user already exists
      const existingUser = await client.query(
        'SELECT id FROM users WHERE email = $1',
        [email.toLowerCase()]
      );

      if (existingUser.rows.length > 0) {
        throw new Error('User with this email already exists');
      }

      // Hash password
      const passwordHash = await this.hashPassword(password);

      // Insert new user
      const result = await client.query(`
        INSERT INTO users (
          email, password_hash, first_name, last_name, phone, company_name, roles
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, email, first_name, last_name, phone, company_name, roles, is_active, created_at
      `, [
        email.toLowerCase(),
        passwordHash,
        firstName,
        lastName,
        phone,
        companyName,
        roles
      ]);

      const user = result.rows[0];

      logger.info('User registered successfully', {
        userId: user.id,
        email: user.email,
        roles: user.roles
      });

      return user;
    });
  }

  /**
   * Authenticate user and create session
   * @param {string} email - User email
   * @param {string} password - User password
   * @param {Object} sessionInfo - Session metadata (IP, user agent, etc.)
   * @returns {Promise<Object>} Authentication result with tokens
   */
  async authenticateUser(email, password, sessionInfo = {}) {
    // Get user from database
    const userResult = await query(`
      SELECT id, email, password_hash, first_name, last_name, phone, company_name,
             roles, is_active, email_verified
      FROM users
      WHERE email = $1
    `, [email.toLowerCase()]);

    if (userResult.rows.length === 0) {
      throw new Error('Invalid email or password');
    }

    const user = userResult.rows[0];

    // Check if user is active
    if (!user.is_active) {
      throw new Error('User account is deactivated');
    }

    // Verify password
    const passwordMatch = await this.verifyPassword(password, user.password_hash);
    if (!passwordMatch) {
      throw new Error('Invalid email or password');
    }

    // Generate tokens
    const tokenPayload = {
      sub: user.id,
      email: user.email,
      roles: user.roles,
      firstName: user.first_name,
      lastName: user.last_name
    };

    const accessToken = this.generateToken(tokenPayload, 'access');
    const refreshToken = this.generateToken({ sub: user.id }, 'refresh');

    // Create session record
    const sessionResult = await query(`
      INSERT INTO user_sessions (
        user_id, token_hash, refresh_token_hash, device_info,
        ip_address, user_agent, expires_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `, [
      user.id,
      this.hashToken(accessToken),
      this.hashToken(refreshToken),
      JSON.stringify(sessionInfo.deviceInfo || {}),
      sessionInfo.ipAddress,
      sessionInfo.userAgent,
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    ]);

    // Update last login
    await query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );

    logger.info('User authenticated successfully', {
      userId: user.id,
      email: user.email,
      sessionId: sessionResult.rows[0].id,
      ipAddress: sessionInfo.ipAddress
    });

    // Return user data (without password) and tokens
    const { password_hash, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: 3600, // 1 hour in seconds
        tokenType: 'Bearer'
      }
    };
  }

  /**
   * Refresh access token using refresh token
   * @param {string} refreshToken - Valid refresh token
   * @returns {Promise<Object>} New tokens
   */
  async refreshTokens(refreshToken) {
    try {
      // Verify refresh token
      const decoded = this.verifyToken(refreshToken, 'refresh');
      const userId = decoded.sub;

      // Check if session exists and is active
      const sessionResult = await query(`
        SELECT s.id, s.user_id, u.email, u.first_name, u.last_name, u.roles, u.is_active
        FROM user_sessions s
        JOIN users u ON s.user_id = u.id
        WHERE s.refresh_token_hash = $1
          AND s.is_active = true
          AND s.expires_at > CURRENT_TIMESTAMP
      `, [this.hashToken(refreshToken)]);

      if (sessionResult.rows.length === 0) {
        throw new Error('Invalid or expired refresh token');
      }

      const session = sessionResult.rows[0];

      if (!session.is_active) {
        throw new Error('User account is deactivated');
      }

      // Generate new tokens
      const tokenPayload = {
        sub: session.user_id,
        email: session.email,
        roles: session.roles,
        firstName: session.first_name,
        lastName: session.last_name
      };

      const newAccessToken = this.generateToken(tokenPayload, 'access');
      const newRefreshToken = this.generateToken({ sub: session.user_id }, 'refresh');

      // Update session with new token hashes
      await query(`
        UPDATE user_sessions
        SET token_hash = $1, refresh_token_hash = $2, last_used_at = CURRENT_TIMESTAMP
        WHERE id = $3
      `, [
        this.hashToken(newAccessToken),
        this.hashToken(newRefreshToken),
        session.id
      ]);

      logger.info('Tokens refreshed successfully', {
        userId: session.user_id,
        sessionId: session.id
      });

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        expiresIn: 3600,
        tokenType: 'Bearer'
      };

    } catch (error) {
      logger.error('Token refresh failed', error);
      throw new Error('Invalid refresh token');
    }
  }

  /**
   * Logout user and invalidate session
   * @param {string} accessToken - User's access token
   * @returns {Promise<void>}
   */
  async logout(accessToken) {
    try {
      const tokenHash = this.hashToken(accessToken);

      // Mark session as inactive
      const result = await query(`
        UPDATE user_sessions
        SET is_active = false, logout_at = CURRENT_TIMESTAMP
        WHERE token_hash = $1 AND is_active = true
      `, [tokenHash]);

      if (result.rowCount > 0) {
        logger.info('User logged out successfully', { tokenHash });
      }

    } catch (error) {
      logger.error('Logout failed', error);
      // Don't throw error for logout failures
    }
  }

  /**
   * Logout all sessions for a user
   * @param {number} userId - User ID
   * @returns {Promise<number>} Number of sessions logged out
   */
  async logoutAllSessions(userId) {
    const result = await query(`
      UPDATE user_sessions
      SET is_active = false, logout_at = CURRENT_TIMESTAMP
      WHERE user_id = $1 AND is_active = true
    `, [userId]);

    logger.info('All user sessions logged out', {
      userId,
      sessionCount: result.rowCount
    });

    return result.rowCount;
  }

  /**
   * Validate session token
   * @param {string} accessToken - Access token to validate
   * @returns {Promise<Object>} User data if valid
   */
  async validateSession(accessToken) {
    try {
      // Verify token signature and expiration
      const decoded = this.verifyToken(accessToken, 'access');
      const tokenHash = this.hashToken(accessToken);

      // Check if session exists and is active
      const sessionResult = await query(`
        SELECT s.id, s.user_id, s.last_used_at,
               u.email, u.first_name, u.last_name, u.phone, u.company_name,
               u.roles, u.is_active, u.email_verified
        FROM user_sessions s
        JOIN users u ON s.user_id = u.id
        WHERE s.token_hash = $1
          AND s.is_active = true
          AND s.expires_at > CURRENT_TIMESTAMP
      `, [tokenHash]);

      if (sessionResult.rows.length === 0) {
        throw new Error('Invalid or expired session');
      }

      const session = sessionResult.rows[0];

      if (!session.is_active) {
        throw new Error('User account is deactivated');
      }

      // Update last used timestamp
      await query(`
        UPDATE user_sessions
        SET last_used_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [session.id]);

      // Return user data
      const { user_id, last_used_at, ...userData } = session;

      return {
        id: user_id,
        ...userData
      };

    } catch (error) {
      logger.debug('Session validation failed', { error: error.message });
      throw new Error('Invalid session');
    }
  }
}

module.exports = new AuthService();
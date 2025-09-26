const authService = require('../../services/authService');
const { query } = require('../../config/database');
const logger = require('../../utils/logger');

/**
 * Create default admin user for LoadBlock system
 */
const createAdminUser = async () => {
  try {
    const adminEmail = process.env.DEFAULT_ADMIN_EMAIL || 'admin@loadblock.io';
    const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD || '12345678';

    // Check if admin user already exists
    const existingUser = await query(
      'SELECT id FROM users WHERE email = $1',
      [adminEmail]
    );

    if (existingUser.rows.length > 0) {
      logger.info('Admin user already exists', { email: adminEmail });
      return;
    }

    // Create admin user
    const adminUser = await authService.registerUser({
      email: adminEmail,
      password: adminPassword,
      firstName: 'LoadBlock',
      lastName: 'Administrator',
      companyName: 'LoadBlock Inc.',
      roles: ['admin']
    });

    // Verify email for admin user
    await query(
      'UPDATE users SET email_verified = true WHERE id = $1',
      [adminUser.id]
    );

    logger.info('Default admin user created successfully', {
      userId: adminUser.id,
      email: adminUser.email
    });

    return adminUser;

  } catch (error) {
    logger.error('Failed to create admin user', error);
    throw error;
  }
};

// Run seeder if called directly
if (require.main === module) {
  (async () => {
    try {
      await createAdminUser();
      console.log('Admin user seeder completed successfully');
      process.exit(0);
    } catch (error) {
      console.error('Admin user seeder failed:', error.message);
      process.exit(1);
    }
  })();
}

module.exports = createAdminUser;
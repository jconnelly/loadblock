// Load environment variables
require('dotenv').config();

const fs = require('fs').promises;
const path = require('path');
const { query, testConnection } = require('../config/database');
const logger = require('../utils/logger');

/**
 * Database migration runner for LoadBlock
 * Handles running SQL migration files in order
 */
class MigrationRunner {
  constructor() {
    this.migrationsDir = path.join(__dirname, 'migrations');
    this.migrationsTable = 'schema_migrations';
  }

  /**
   * Initialize the migrations tracking table
   */
  async initializeMigrationsTable() {
    const createMigrationsTableSQL = `
      CREATE TABLE IF NOT EXISTS ${this.migrationsTable} (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        checksum VARCHAR(64) NOT NULL
      );
    `;

    await query(createMigrationsTableSQL);
    logger.info('Migrations table initialized');
  }

  /**
   * Get list of applied migrations
   */
  async getAppliedMigrations() {
    const result = await query(`
      SELECT filename, checksum
      FROM ${this.migrationsTable}
      ORDER BY filename
    `);

    return result.rows.reduce((acc, row) => {
      acc[row.filename] = row.checksum;
      return acc;
    }, {});
  }

  /**
   * Get list of migration files
   */
  async getMigrationFiles() {
    const files = await fs.readdir(this.migrationsDir);
    return files
      .filter(file => file.endsWith('.sql'))
      .sort(); // Ensure consistent ordering
  }

  /**
   * Calculate checksum for migration file content
   */
  calculateChecksum(content) {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
  }

  /**
   * Run a single migration file
   */
  async runMigration(filename) {
    const filePath = path.join(this.migrationsDir, filename);
    const content = await fs.readFile(filePath, 'utf8');
    const checksum = this.calculateChecksum(content);

    logger.info(`Running migration: ${filename}`);

    try {
      // Execute the migration SQL
      await query(content);

      // Record the migration as applied
      await query(`
        INSERT INTO ${this.migrationsTable} (filename, checksum)
        VALUES ($1, $2)
      `, [filename, checksum]);

      logger.info(`Migration completed: ${filename}`);
    } catch (error) {
      logger.error(`Migration failed: ${filename}`, error);
      throw error;
    }
  }

  /**
   * Verify migration integrity by checking checksums
   */
  async verifyMigrationIntegrity() {
    const appliedMigrations = await this.getAppliedMigrations();
    const migrationFiles = await this.getMigrationFiles();

    for (const filename of migrationFiles) {
      if (appliedMigrations[filename]) {
        const filePath = path.join(this.migrationsDir, filename);
        const content = await fs.readFile(filePath, 'utf8');
        const currentChecksum = this.calculateChecksum(content);

        if (appliedMigrations[filename] !== currentChecksum) {
          throw new Error(
            `Migration integrity check failed for ${filename}. ` +
            `File has been modified after being applied.`
          );
        }
      }
    }

    logger.info('Migration integrity verification passed');
  }

  /**
   * Run pending migrations
   */
  async migrate() {
    try {
      // Test database connection
      await testConnection();

      // Initialize migrations table
      await this.initializeMigrationsTable();

      // Verify existing migrations haven't been tampered with
      await this.verifyMigrationIntegrity();

      // Get applied and available migrations
      const appliedMigrations = await this.getAppliedMigrations();
      const migrationFiles = await this.getMigrationFiles();

      // Filter out already applied migrations
      const pendingMigrations = migrationFiles.filter(
        filename => !appliedMigrations[filename]
      );

      if (pendingMigrations.length === 0) {
        logger.info('No pending migrations');
        return;
      }

      logger.info(`Found ${pendingMigrations.length} pending migrations`);

      // Run pending migrations
      for (const filename of pendingMigrations) {
        await this.runMigration(filename);
      }

      logger.info(`Successfully applied ${pendingMigrations.length} migrations`);

    } catch (error) {
      logger.error('Migration failed', error);
      throw error;
    }
  }

  /**
   * Show migration status
   */
  async status() {
    try {
      await testConnection();
      await this.initializeMigrationsTable();

      const appliedMigrations = await this.getAppliedMigrations();
      const migrationFiles = await this.getMigrationFiles();

      console.log('\nMigration Status:');
      console.log('================');

      for (const filename of migrationFiles) {
        const status = appliedMigrations[filename] ? '[APPLIED]' : '[PENDING]';
        const appliedAt = appliedMigrations[filename] ?
          ` (${new Date().toISOString()})` : '';
        console.log(`${status} ${filename}${appliedAt}`);
      }

      const pendingCount = migrationFiles.length - Object.keys(appliedMigrations).length;
      console.log(`\nTotal: ${migrationFiles.length} migrations, ${pendingCount} pending\n`);

    } catch (error) {
      logger.error('Failed to get migration status', error);
      throw error;
    }
  }
}

// CLI interface
if (require.main === module) {
  const runner = new MigrationRunner();
  const command = process.argv[2] || 'migrate';

  (async () => {
    try {
      switch (command) {
        case 'migrate':
          await runner.migrate();
          break;
        case 'status':
          await runner.status();
          break;
        default:
          console.log('Usage: node migrate.js [migrate|status]');
          process.exit(1);
      }
      process.exit(0);
    } catch (error) {
      console.error('Migration command failed:', error.message);
      process.exit(1);
    }
  })();
}

module.exports = MigrationRunner;
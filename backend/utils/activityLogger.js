const pool = require('../config/db');

/**
 * Log activity to the activity_logs table
 * @param {number} userId - User ID performing the action
 * @param {string} action - Action performed (e.g., 'created', 'updated', 'deleted')
 * @param {string} entityType - Type of entity (e.g., 'vendor', 'rfq', 'approval', 'invoice')
 * @param {number} entityId - ID of the entity
 * @param {string} description - Human-readable description of the action
 */
async function logActivity(userId, action, entityType, entityId, description) {
  try {
    const query = `
      INSERT INTO activity_logs (user_id, action, entity_type, entity_id, description)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `;
    
    const result = await pool.query(query, [userId, action, entityType, entityId, description]);
    return result.rows[0];
  } catch (error) {
    console.error('Failed to log activity:', error);
    // Don't throw - activity logging should not break the main operation
    return null;
  }
}

module.exports = { logActivity };

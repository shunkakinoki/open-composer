// =============================================================================
// CONSTANTS
// =============================================================================

export const SESSION_NAME_PATTERN = /^[a-zA-Z0-9_-]+$/;
export const MAX_SESSION_NAME_LENGTH = 100;
export const MAX_COMMAND_LENGTH = 10000;

export const DEFAULT_TIMEOUTS = {
  PROCESS_SPAWN: 30000, // 30 seconds
  FILE_OPERATION: 10000, // 10 seconds
  PROCESS_CHECK: 5000, // 5 seconds
};

export const LOG_LIMITS = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB per log file
  MAX_BACKUP_FILES: 5, // Keep up to 5 backup files
  ROTATION_CHECK_INTERVAL: 1000, // Check every 1KB of data written
};

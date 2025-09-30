import * as fsSync from "node:fs";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { LOG_LIMITS } from "./constants.js";

export function createLogWriter(
  logFile: string,
  onRotation?: () => Promise<void>,
): {
  write: (data: string | Buffer) => void;
  close: () => void;
  getBytesWritten: () => number;
} {
  // Ensure directory exists
  const dir = path.dirname(logFile);
  if (!fsSync.existsSync(dir)) {
    fsSync.mkdirSync(dir, { recursive: true });
  }

  const logStream = fsSync.createWriteStream(logFile, { flags: "a" });
  let bytesWritten = 0;

  const writeWithRotation = async (data: string | Buffer) => {
    const dataSize = Buffer.isBuffer(data)
      ? data.length
      : Buffer.byteLength(data);
    bytesWritten += dataSize;

    // Check if rotation is needed
    if (bytesWritten >= LOG_LIMITS.MAX_FILE_SIZE) {
      if (onRotation) {
        await onRotation();
      }
      bytesWritten = dataSize; // Reset counter for new file
    }

    logStream.write(data);
  };

  const close = () => {
    if (!logStream.destroyed) {
      logStream.end();
    }
  };

  const getBytesWritten = () => bytesWritten;

  return { write: writeWithRotation, close, getBytesWritten };
}

export async function rotateLogFile(logFile: string): Promise<void> {
  try {
    const logDir = path.dirname(logFile);
    const baseName = path.basename(logFile, path.extname(logFile));
    const ext = path.extname(logFile);

    // Rotate existing backup files
    for (let i = LOG_LIMITS.MAX_BACKUP_FILES - 1; i >= 1; i--) {
      const oldFile = path.join(logDir, `${baseName}.${i}${ext}`);
      const newFile = path.join(logDir, `${baseName}.${i + 1}${ext}`);

      try {
        await fs.access(oldFile);
        await fs.rename(oldFile, newFile);
      } catch {
        // File doesn't exist, skip
      }
    }

    // Move current log to .1 backup
    const backupFile = path.join(logDir, `${baseName}.1${ext}`);
    try {
      await fs.rename(logFile, backupFile);
    } catch (error) {
      console.warn(`Failed to create backup log file: ${error}`);
    }
  } catch (error) {
    console.warn(`Failed to rotate log file ${logFile}:`, error);
  }
}

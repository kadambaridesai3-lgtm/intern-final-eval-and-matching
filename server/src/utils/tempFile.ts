import fs from 'fs';
import path from 'path';

export function getUploadsDir(): string {
  const dir = path.join(process.cwd(), 'uploads');
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  } catch (err) {
    console.error('Failed to create uploads directory:', err);
  }
  return dir;
}

export function writeTempFile(buffer: Buffer, originalName: string): string {
  const uploadsDir = getUploadsDir();
  const ext = path.extname(originalName) || '.xlsx';
  const tempName = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`;
  const fullPath = path.join(uploadsDir, tempName);
  
  // Write the file to disk
  fs.writeFileSync(fullPath, buffer);
  return fullPath;
}

export function deleteTempFile(filePath: string): void {
  try {
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (err) {
    console.error(`Failed to delete temp file ${filePath}:`, err);
  }
}

import { PrismaClient } from '@prisma/client';
import fs from 'node:fs';
import dotenv from 'dotenv';
import path from 'node:path';

let client: PrismaClient | null = null;

dotenv.config({ path: path.resolve(__dirname, '../../../.env'), override: true });
const serverDatabasePath = path.resolve(__dirname, '../../prisma/dev.db');
const rootDatabasePath = path.resolve(__dirname, '../../../prisma/dev.db');

console.log('[prisma] server DB =', serverDatabasePath, fs.existsSync(serverDatabasePath));
console.log('[prisma] root DB =', rootDatabasePath, fs.existsSync(rootDatabasePath));

if (fs.existsSync(serverDatabasePath)) {
  process.env.DATABASE_URL = `file:${serverDatabasePath.replace(/\\/g, '/')}`;
} else if (fs.existsSync(rootDatabasePath)) {
  process.env.DATABASE_URL = `file:${rootDatabasePath.replace(/\\/g, '/')}`;
} else if (!process.env.DATABASE_URL?.startsWith('file:')) {
  process.env.DATABASE_URL = 'file:./prisma/dev.db';
}

console.log('[prisma] DATABASE_URL =', process.env.DATABASE_URL);

// Extra verification: ensure the SQLite file is accessible before creating PrismaClient.
try {
  const dbUrl = process.env.DATABASE_URL ?? '';
  const filePath = dbUrl.startsWith('file:') ? dbUrl.slice(5) : dbUrl;
  const resolved = path.resolve(filePath);
  console.log('[prisma] resolved DB file =', resolved);
  // Check read/write access when file exists
  if (fs.existsSync(resolved)) {
    fs.accessSync(resolved, fs.constants.R_OK | fs.constants.W_OK);
    console.log('[prisma] DB file is readable and writable');
  } else {
    console.warn('[prisma] DB file does not exist at resolved path');
  }
} catch (err) {
  console.error('[prisma] DB access check failed:', err);
}

export function getPrisma(): PrismaClient {
  if (!client) {
    client = new PrismaClient({
      datasources: {
        db: { url: process.env.DATABASE_URL },
      },
    });
  }
  return client;
}

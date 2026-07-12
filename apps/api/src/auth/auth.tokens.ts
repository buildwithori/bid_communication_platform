import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'crypto';
import { promisify } from 'util';

const scrypt = promisify(scryptCallback);
const PASSWORD_KEY_BYTES = 64;

export function createPlainToken(bytes = 32) {
  return randomBytes(bytes).toString('base64url');
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('base64url');
  const derived = (await scrypt(password, salt, PASSWORD_KEY_BYTES)) as Buffer;

  return `scrypt:${salt}:${derived.toString('base64url')}`;
}

export async function verifyPassword(password: string, passwordHash: string | null) {
  if (!passwordHash) {
    return false;
  }

  const [algorithm, salt, stored] = passwordHash.split(':');
  if (algorithm !== 'scrypt' || !salt || !stored) {
    return false;
  }

  const derived = (await scrypt(password, salt, PASSWORD_KEY_BYTES)) as Buffer;
  const storedBuffer = Buffer.from(stored, 'base64url');

  if (derived.length !== storedBuffer.length) {
    return false;
  }

  return timingSafeEqual(derived, storedBuffer);
}

export async function hashToken(token: string) {
  const encoded = Buffer.from(token).toString('base64url');
  const derived = (await scrypt(encoded, 'bid-auth-token-v1', 32)) as Buffer;

  return derived.toString('base64url');
}

export function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60_000);
}

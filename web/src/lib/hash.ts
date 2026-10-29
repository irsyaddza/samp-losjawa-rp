import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export function whirlpool(text: string): string {
  try {
    return crypto.createHash('whirlpool').update(text).digest('hex').toUpperCase();
  } catch (error) {
    console.error("Whirlpool hash failed. Make sure NODE_OPTIONS='--openssl-legacy-provider' is set.", error);
    throw error;
  }
}

export function isBcryptHash(hash: string): boolean {
  return hash.startsWith('$2a$') || hash.startsWith('$2y$') || hash.startsWith('$2b$');
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  if (isBcryptHash(storedHash)) {
    return bcrypt.compare(password, storedHash);
  }

  return storedHash.toUpperCase() === whirlpool(password);
}

import crypto from 'crypto';

export function whirlpool(text: string): string {
  try {
    return crypto.createHash('whirlpool').update(text).digest('hex').toUpperCase();
  } catch (error) {
    console.error("Whirlpool hash failed. Make sure NODE_OPTIONS='--openssl-legacy-provider' is set.", error);
    throw error;
  }
}

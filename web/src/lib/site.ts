export const MAIN_SITE_URL = 'https://losjawa-rp.fun';
export const FORUM_URL = 'https://forum.losjawa-rp.fun';
export const UCP_URL = 'https://ucp.losjawa-rp.fun';

function isLocalhostUrl(value: string): boolean {
  const hostname = new URL(value).hostname;
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '0.0.0.0' ||
    hostname === '::1' ||
    hostname === '[::1]' ||
    hostname === '::' ||
    hostname === '[::]'
  );
}

export function normalizeBaseUrl(value: string | null | undefined): string | null {
  if (!value) return null;

  const trimmed = value.trim();
  if (!trimmed || trimmed.includes('?') || trimmed.includes('#')) return null;

  try {
    const url = new URL(trimmed);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    if (url.username || url.password) return null;
    return url.href.replace(/\/+$/, '');
  } catch {
    return null;
  }
}

export function getTrustedBaseUrl(): string {
  const configured = normalizeBaseUrl(process.env.NEXT_PUBLIC_BASE_URL);
  if (configured && !isLocalhostUrl(configured)) return configured;
  return UCP_URL;
}

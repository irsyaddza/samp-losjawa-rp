export const MAIN_SITE_URL = 'https://losjawa-rp.fun';
export const FORUM_URL = 'https://forum.losjawa-rp.fun';
export const UCP_URL = 'https://ucp.losjawa-rp.fun';

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
  return normalizeBaseUrl(process.env.NEXT_PUBLIC_BASE_URL) || UCP_URL;
}

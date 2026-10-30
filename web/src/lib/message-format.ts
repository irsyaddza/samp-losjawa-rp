const URL_PATTERN = /https?:\/\/[^\s<>"']+/g;
const IMAGE_EXTENSION = /\.(png|jpe?g|gif|webp|avif)$/i;

export function splitUrlPunctuation(value: string): { url: string; trailing: string } {
  const match = value.match(/^(.*?)([.,!?;:)]*)$/);
  return { url: match?.[1] || value, trailing: match?.[2] || '' };
}

export function isImageUrl(value: string): boolean {
  const { url } = splitUrlPunctuation(value);

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
    return IMAGE_EXTENSION.test(parsed.pathname);
  } catch {
    return false;
  }
}

export function extractImageUrls(text: string): string[] {
  const matches = text.match(URL_PATTERN) || [];
  const urls = matches
    .map((match) => splitUrlPunctuation(match).url)
    .filter(isImageUrl);

  return Array.from(new Set(urls));
}

export function messagePreview(bodyText: string, maxLength = 120): string {
  const text = bodyText
    .replace(URL_PATTERN, (url) => (isImageUrl(url) ? '[image]' : url))
    .replace(/\s+/g, ' ')
    .trim();

  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}

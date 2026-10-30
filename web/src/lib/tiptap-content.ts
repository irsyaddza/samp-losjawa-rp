import type { JSONContent } from '@tiptap/core';

export const MAX_BODY_TEXT_LENGTH = 5000;
export const MAX_BODY_JSON_LENGTH = 20000;

const ALLOWED_NODES = new Set([
  'doc',
  'paragraph',
  'text',
  'hardBreak',
  'image',
  'bulletList',
  'orderedList',
  'listItem',
  'blockquote',
  'codeBlock',
]);

const ALLOWED_MARKS = new Set(['bold', 'italic', 'underline', 'strike', 'code', 'link', 'textStyle']);
const ALIGNMENTS = new Set(['left', 'center', 'right', 'justify']);
const HEX_COLOR = /^#[0-9a-f]{3}(?:[0-9a-f]{3})?$/i;
const MAX_DEPTH = 20;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isHttpUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false;

  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function sanitizeMark(value: unknown): NonNullable<JSONContent['marks']>[number] | null {
  if (!isRecord(value) || typeof value.type !== 'string' || !ALLOWED_MARKS.has(value.type)) {
    return null;
  }

  if (value.type === 'link') {
    const href = isRecord(value.attrs) ? value.attrs.href : undefined;
    return isHttpUrl(href) ? { type: 'link', attrs: { href } } : null;
  }

  if (value.type === 'textStyle') {
    const color = isRecord(value.attrs) ? value.attrs.color : undefined;
    return typeof color === 'string' && HEX_COLOR.test(color)
      ? { type: 'textStyle', attrs: { color } }
      : null;
  }

  return { type: value.type };
}

function sanitizeAttrs(type: string, value: unknown): Record<string, unknown> | undefined {
  if (!isRecord(value)) return undefined;

  if (type === 'paragraph') {
    return typeof value.textAlign === 'string' && ALIGNMENTS.has(value.textAlign)
      ? { textAlign: value.textAlign }
      : undefined;
  }

  if (type === 'orderedList') {
    const start = Number(value.start);
    return Number.isInteger(start) && start > 0 && start <= 10000 ? { start } : undefined;
  }

  if (type === 'codeBlock') {
    return typeof value.language === 'string' && value.language.length <= 40
      ? { language: value.language }
      : undefined;
  }

  if (type === 'image') {
    if (!isHttpUrl(value.src)) return undefined;

    const attrs: Record<string, unknown> = { src: value.src };
    if (typeof value.alt === 'string') attrs.alt = value.alt.slice(0, 200);
    if (typeof value.title === 'string') attrs.title = value.title.slice(0, 200);
    return attrs;
  }

  return undefined;
}

function sanitizeNode(value: unknown, depth: number): JSONContent | null {
  if (!isRecord(value) || depth > MAX_DEPTH || typeof value.type !== 'string') return null;
  if (!ALLOWED_NODES.has(value.type)) return null;

  const type = value.type;

  if (type === 'text') {
    if (typeof value.text !== 'string' || value.text.length === 0) return null;

    const marks = Array.isArray(value.marks)
      ? value.marks
          .map(sanitizeMark)
          .filter((mark): mark is NonNullable<JSONContent['marks']>[number] => mark !== null)
      : [];

    return { type, text: value.text, ...(marks.length > 0 ? { marks } : {}) };
  }

  if (type === 'hardBreak') return { type };

  const attrs = sanitizeAttrs(type, value.attrs);
  if (type === 'image') return attrs ? { type, attrs } : null;

  const content = Array.isArray(value.content)
    ? value.content
        .map((child) => sanitizeNode(child, depth + 1))
        .filter((child): child is JSONContent => child !== null)
    : [];

  if (type === 'codeBlock') {
    const code = content
      .filter((child) => child.type === 'text' || child.type === 'hardBreak')
      .map((child) =>
        child.type === 'text' ? { type: 'text' as const, text: child.text || '' } : child
      )
      .filter((child) => child.type === 'hardBreak' || Boolean(child.text));

    return code.length > 0
      ? { type, ...(attrs ? { attrs } : {}), content: code }
      : null;
  }

  if (type !== 'doc' && type !== 'paragraph' && content.length === 0) return null;

  return {
    type,
    ...(attrs ? { attrs } : {}),
    ...(type === 'doc' || content.length > 0 ? { content } : {}),
  };
}

export function sanitizeMailboxDoc(value: unknown): JSONContent | null {
  const doc = sanitizeNode(value, 0);
  return doc && doc.type === 'doc' ? doc : null;
}

export function parseMailboxBody(body: string): JSONContent | null {
  try {
    return sanitizeMailboxDoc(JSON.parse(body));
  } catch {
    return null;
  }
}

const BLOCK_CONTAINERS = new Set(['doc', 'bulletList', 'orderedList', 'listItem', 'blockquote']);

function countNode(node: JSONContent): number {
  const type = node.type;
  if (!type) return 0;
  if (type === 'text') return (node.text || '').length;
  if (type === 'image') return '[image]'.length;
  if (type === 'hardBreak') return 1;

  const children = node.content || [];
  let total = 0;

  children.forEach((child, index) => {
    if (index > 0 && BLOCK_CONTAINERS.has(type)) total += 1;
    total += countNode(child);
  });

  return total;
}

export function countMailboxText(doc: JSONContent): number {
  return countNode(doc);
}

function textFromNode(node: JSONContent): string {
  if (node.type === 'text') return node.text || '';
  if (node.type === 'image') return '[image]';
  if (node.type === 'hardBreak') return '\n';

  const inner = (node.content || []).map(textFromNode).join('');
  if (
    node.type === 'paragraph' ||
    node.type === 'listItem' ||
    node.type === 'blockquote' ||
    node.type === 'codeBlock'
  ) {
    return `${inner}\n`;
  }

  return inner;
}

export function extractMailboxText(doc: JSONContent): string {
  return textFromNode(doc).replace(/\n{3,}/g, '\n\n').trim();
}

export function hasMailboxContent(doc: JSONContent): boolean {
  return extractMailboxText(doc).length > 0;
}

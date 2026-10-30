import CharacterCount from '@tiptap/extension-character-count';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import { Color, TextStyle } from '@tiptap/extension-text-style';
import StarterKit from '@tiptap/starter-kit';
import { isHttpUrl, MAX_BODY_TEXT_LENGTH } from './tiptap-content';

const linkOptions = {
  openOnClick: false,
  autolink: true,
  linkOnPaste: true,
  defaultProtocol: 'https',
  protocols: ['http', 'https'],
  isAllowedUri: (url: string, { defaultValidate }: { defaultValidate: (url: string) => boolean }) =>
    isHttpUrl(url) && Boolean(defaultValidate(url)),
  HTMLAttributes: {
    rel: 'noopener noreferrer nofollow',
    target: '_blank',
  },
};

export function createMailboxExtensions() {
  return [
    StarterKit.configure({
      heading: false,
      horizontalRule: false,
      link: linkOptions,
    }),
    Image.configure({
      allowBase64: false,
      HTMLAttributes: {
        loading: 'lazy',
        decoding: 'async',
        referrerPolicy: 'no-referrer',
      },
    }),
    TextAlign.configure({
      types: ['paragraph'],
      alignments: ['left', 'center', 'right', 'justify'],
    }),
    TextStyle,
    Color,
  ];
}

export const mailboxExtensions = createMailboxExtensions();

export function createEditorExtensions() {
  return [
    ...createMailboxExtensions(),
    Placeholder.configure({ placeholder: 'Write your message...' }),
    CharacterCount.configure({ limit: MAX_BODY_TEXT_LENGTH }),
  ];
}

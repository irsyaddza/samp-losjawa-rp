'use client';

import { useEffect, useMemo, useRef } from 'react';
import type { ReactNode } from 'react';
import type { JSONContent } from '@tiptap/core';
import { EditorContent, useEditor } from '@tiptap/react';
import {
  AlignCenter,
  Bold,
  Code2,
  Image as ImageIcon,
  Italic,
  Link2,
  List,
  ListOrdered,
  Quote,
  Redo2,
  Strikethrough,
  Underline,
  Undo2,
} from 'lucide-react';
import { createEditorExtensions } from '@/lib/tiptap-extensions';
import { isHttpUrl, MAX_BODY_TEXT_LENGTH } from '@/lib/tiptap-content';

interface ComposeEditorProps {
  onChange: (json: JSONContent, isEmpty: boolean) => void;
  onError: (message: string) => void;
  disabled: boolean;
}

interface ToolButtonProps {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}

function ToolButton({ label, active = false, disabled = false, onClick, children }: ToolButtonProps) {
  return (
    <button
      type="button"
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={`inline-flex h-7 w-7 items-center justify-center rounded-md border text-zinc-300 transition disabled:cursor-not-allowed disabled:opacity-40 ${
        active
          ? 'border-amber-500/40 bg-amber-500/15 text-amber-300'
          : 'border-zinc-800 bg-zinc-900/60 hover:border-amber-500/30 hover:text-white'
      }`}
    >
      {children}
    </button>
  );
}

export default function ComposeEditor({ onChange, onError, disabled }: ComposeEditorProps) {
  const extensions = useMemo(() => createEditorExtensions(), []);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const editor = useEditor({
    extensions,
    content: '',
    immediatelyRender: false,
    autofocus: true,
    shouldRerenderOnTransaction: true,
    editable: !disabled,
    editorProps: {
      attributes: {
        class: 'mailbox-editor-content',
        'aria-label': 'Message',
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      onChangeRef.current(currentEditor.getJSON(), currentEditor.isEmpty);
    },
  });

  useEffect(() => {
    editor?.setEditable(!disabled);
  }, [editor, disabled]);

  if (!editor) {
    return (
      <div className="h-40 animate-pulse rounded-xl border border-zinc-800 bg-zinc-900/40" />
    );
  }

  const isDisabled = disabled;
  const characterCount = editor.storage.characterCount.characters();
  const color = (editor.getAttributes('textStyle').color as string | undefined) || '#f59e0b';

  function applyLink() {
    if (!editor) return;
    const previous = editor.getAttributes('link').href as string | undefined;
    const value = window.prompt('Link URL', previous || 'https://');
    if (value === null) return;

    const href = value.trim();
    if (!href) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      onError('');
      return;
    }

    if (!isHttpUrl(href)) {
      onError('Link must start with http:// or https://.');
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href }).run();
    onError('');
  }

  function applyImage() {
    if (!editor) return;
    const value = window.prompt('Image URL (https://...)');
    if (!value) return;

    const src = value.trim();
    if (!isHttpUrl(src)) {
      onError('Image URL must start with http:// or https://.');
      return;
    }

    editor.chain().focus().setImage({ src }).run();
    onError('');
  }

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/40 focus-within:border-amber-500/40">
      <div className="flex flex-wrap items-center gap-1 border-b border-zinc-800/80 p-2">
        <ToolButton
          label="Bold"
          active={editor.isActive('bold')}
          disabled={isDisabled}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="h-3.5 w-3.5" />
        </ToolButton>
        <ToolButton
          label="Italic"
          active={editor.isActive('italic')}
          disabled={isDisabled}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="h-3.5 w-3.5" />
        </ToolButton>
        <ToolButton
          label="Underline"
          active={editor.isActive('underline')}
          disabled={isDisabled}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <Underline className="h-3.5 w-3.5" />
        </ToolButton>
        <ToolButton
          label="Strikethrough"
          active={editor.isActive('strike')}
          disabled={isDisabled}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          <Strikethrough className="h-3.5 w-3.5" />
        </ToolButton>

        <span className="mx-1 h-5 w-px bg-zinc-800" />

        <ToolButton
          label="Bullet list"
          active={editor.isActive('bulletList')}
          disabled={isDisabled}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="h-3.5 w-3.5" />
        </ToolButton>
        <ToolButton
          label="Ordered list"
          active={editor.isActive('orderedList')}
          disabled={isDisabled}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="h-3.5 w-3.5" />
        </ToolButton>
        <ToolButton
          label="Quote"
          active={editor.isActive('blockquote')}
          disabled={isDisabled}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <Quote className="h-3.5 w-3.5" />
        </ToolButton>
        <ToolButton
          label="Code block"
          active={editor.isActive('codeBlock')}
          disabled={isDisabled}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        >
          <Code2 className="h-3.5 w-3.5" />
        </ToolButton>

        <span className="mx-1 h-5 w-px bg-zinc-800" />

        <ToolButton label="Link" active={editor.isActive('link')} disabled={isDisabled} onClick={applyLink}>
          <Link2 className="h-3.5 w-3.5" />
        </ToolButton>
        <ToolButton label="Image" disabled={isDisabled} onClick={applyImage}>
          <ImageIcon className="h-3.5 w-3.5" />
        </ToolButton>
        <ToolButton
          label="Align center"
          active={editor.isActive({ textAlign: 'center' })}
          disabled={isDisabled}
          onClick={() => editor.chain().focus().toggleTextAlign('center').run()}
        >
          <AlignCenter className="h-3.5 w-3.5" />
        </ToolButton>

        <input
          type="color"
          value={color}
          disabled={isDisabled}
          onChange={(event) => editor.chain().focus().setColor(event.target.value).run()}
          aria-label="Text color"
          title="Text color"
          className="h-7 w-7 cursor-pointer rounded-md border border-zinc-800 bg-zinc-900/60 p-0.5 disabled:cursor-not-allowed disabled:opacity-40"
        />

        <span className="mx-1 h-5 w-px bg-zinc-800" />

        <ToolButton
          label="Undo"
          disabled={isDisabled || !editor.can().undo()}
          onClick={() => editor.chain().focus().undo().run()}
        >
          <Undo2 className="h-3.5 w-3.5" />
        </ToolButton>
        <ToolButton
          label="Redo"
          disabled={isDisabled || !editor.can().redo()}
          onClick={() => editor.chain().focus().redo().run()}
        >
          <Redo2 className="h-3.5 w-3.5" />
        </ToolButton>

        <span className="ml-auto text-[10px] text-zinc-600">
          {characterCount}/{MAX_BODY_TEXT_LENGTH}
        </span>
      </div>

      <EditorContent editor={editor} />
    </div>
  );
}

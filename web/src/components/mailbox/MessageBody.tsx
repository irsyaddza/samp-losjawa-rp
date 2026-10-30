import { renderToReactElement } from '@tiptap/static-renderer/pm/react';
import { extractImageUrls } from '@/lib/message-format';
import { extractMailboxText, parseMailboxBody } from '@/lib/tiptap-content';
import { mailboxExtensions } from '@/lib/tiptap-extensions';

export default function MessageBody({ body }: { body: string }) {
  const doc = parseMailboxBody(body);

  if (!doc) {
    return (
      <div className="whitespace-pre-wrap break-words text-sm leading-7 text-zinc-300">
        {body}
      </div>
    );
  }

  const imageUrls = extractImageUrls(extractMailboxText(doc));

  return (
    <div>
      <div className="mailbox-content break-words text-sm leading-7 text-zinc-300">
        {renderToReactElement({ content: doc, extensions: mailboxExtensions })}
      </div>

      {imageUrls.length > 0 ? (
        <div className="mt-4 grid gap-3">
          {imageUrls.map((url) => (
            <a
              key={url}
              href={url}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="w-fit max-w-full rounded-xl border border-zinc-800 bg-zinc-900/60 p-1 transition hover:border-amber-500/30"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt="Image linked in message"
                loading="lazy"
                decoding="async"
                referrerPolicy="no-referrer"
                className="max-h-[28rem] max-w-full rounded-lg object-contain"
              />
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );
}

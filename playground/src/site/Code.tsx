import { CheckIcon, CopyIcon } from '@phosphor-icons/react';
import { useState, type ReactNode } from 'react';
import { IconButton } from './ui';

const TOKENS = /(\/\/[^\n]*)|('(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*")|(<\/?[A-Za-z][\w.]*|\/?>)|\b(import|from|export|const|let|return|function|await|async|new|true|false)\b/g;

/** Just enough TSX highlighting for short snippets: comments, strings, tags and keywords. */
function highlight(code: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  for (const m of code.matchAll(TOKENS)) {
    const at = m.index ?? 0;
    if (at > last) out.push(code.slice(last, at));
    const cls = m[1] ? 'c' : m[2] ? 's' : m[3] ? (m[3].endsWith('>') ? 'p' : 't') : 'k';
    out.push(
      <span key={at} className={cls}>
        {m[0]}
      </span>,
    );
    last = at + m[0].length;
  }
  if (last < code.length) out.push(code.slice(last));
  return out;
}

export function CodeBlock({ code, label }: { code: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const copy = (): void => {
    void navigator.clipboard?.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    });
  };
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-line bg-surface">
      <pre className="code overflow-x-auto px-5 py-4 pr-14 font-mono text-[13px] leading-[1.75] text-ink">
        <code>{highlight(code)}</code>
      </pre>
      <IconButton label={copied ? 'Copied' : `Copy ${label}`} onClick={copy} className="absolute top-2.5 right-2.5 border border-line bg-surface">
        {copied ? <CheckIcon size={15} /> : <CopyIcon size={15} />}
      </IconButton>
    </div>
  );
}

import { Fragment } from 'react';
import { Link } from 'react-router-dom';

/** Renders text with #hashtag and @mention links. Plain text only — never HTML. */
export function RichText({ text, onNavigate }: { text: string; onNavigate?: () => void }) {
  const parts = text.split(/([#@][\p{L}\p{N}_.]{2,40})/gu);
  return (
    <>
      {parts.map((p, i) => {
        if (p.startsWith('#') && p.length > 2) return <Link key={i} to={`/tag/${encodeURIComponent(p.slice(1).toLowerCase())}`} onClick={onNavigate} className="font-medium text-primary">{p}</Link>;
        if (p.startsWith('@') && p.length > 2) return <Link key={i} to={`/@${p.slice(1).toLowerCase().replace(/\.$/, '')}`} onClick={onNavigate} className="font-medium text-primary">{p}</Link>;
        return <Fragment key={i}>{p}</Fragment>;
      })}
    </>
  );
}

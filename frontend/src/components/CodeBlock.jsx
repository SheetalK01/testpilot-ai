import { Check, Copy } from 'lucide-react';
import { Highlight } from 'prism-react-renderer';
import { useEffect, useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { darkCodeTheme, lightCodeTheme } from './prismThemes';

export default function CodeBlock({ code, language = 'javascript', filename, testId }) {
  const { theme } = useTheme();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return undefined;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  const copy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
      <div className="flex items-center justify-between gap-3 border-b border-line bg-surface-2/60 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="flex gap-1.5" aria-hidden="true">
            <span className="size-2.5 rounded-full bg-red-400" />
            <span className="size-2.5 rounded-full bg-amber-400" />
            <span className="size-2.5 rounded-full bg-emerald-400" />
          </span>
          {filename && <span className="ml-2 font-mono text-xs text-muted">{filename}</span>}
        </div>
        <button
          type="button"
          onClick={copy}
          data-testid="copy-script"
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium text-muted transition hover:bg-surface hover:text-fg"
        >
          {copied ? (
            <Check className="size-3.5 text-success" aria-hidden="true" />
          ) : (
            <Copy className="size-3.5" aria-hidden="true" />
          )}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <Highlight
        theme={theme === 'dark' ? darkCodeTheme : lightCodeTheme}
        code={code.trimEnd()}
        language={language}
      >
        {({ className, style, tokens, getLineProps, getTokenProps }) => (
          <pre
            data-testid={testId}
            role="region"
            tabIndex={0}
            aria-label={filename ? `Code: ${filename}` : 'Code'}
            className={`${className} max-h-[32rem] overflow-auto p-4 font-mono text-[13px] leading-relaxed`}
            style={{ ...style, background: 'transparent' }}
          >
            {tokens.map((line, i) => {
              const { key: _lineKey, ...lineProps } = getLineProps({ line, key: i });
              return (
                <div key={i} {...lineProps}>
                  <span
                    className="mr-4 inline-block w-6 text-right text-subtle select-none"
                    aria-hidden="true"
                  >
                    {i + 1}
                  </span>
                  {line.map((token, j) => {
                    const { key: _tokenKey, ...tokenProps } = getTokenProps({ token, key: j });
                    return <span key={j} {...tokenProps} />;
                  })}
                </div>
              );
            })}
          </pre>
        )}
      </Highlight>
    </div>
  );
}

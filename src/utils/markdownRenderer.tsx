import React from 'react';
import { ExternalLink, Copy, Check } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  const [copiedIndex, setCopiedIndex] = React.useState<number | null>(null);

  const copyCode = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Simple, robust Markdown parser that handles headings, lists, code blocks, visual cues, and paragraphs
  const renderFormattedMarkdown = (text: string) => {
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let inCodeBlock = false;
    let codeLanguage = '';
    let codeBuffer: string[] = [];
    let codeBlockIndex = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Code blocks
      if (line.startsWith('```')) {
        if (inCodeBlock) {
          const codeString = codeBuffer.join('\n');
          const currentIndex = codeBlockIndex++;
          elements.push(
            <div key={`code-${i}`} className="my-3 rounded-xl overflow-hidden border border-slate-800 bg-slate-950 font-mono text-xs">
              <div className="flex items-center justify-between px-4 py-1.5 bg-slate-900 border-b border-slate-800 text-slate-400">
                <span>{codeLanguage || 'code'}</span>
                <button
                  onClick={() => copyCode(codeString, currentIndex)}
                  className="flex items-center gap-1 hover:text-slate-200 transition text-[11px]"
                >
                  {copiedIndex === currentIndex ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="p-4 overflow-x-auto text-slate-300">
                <code>{codeString}</code>
              </pre>
            </div>
          );
          inCodeBlock = false;
          codeBuffer = [];
          codeLanguage = '';
        } else {
          inCodeBlock = true;
          codeLanguage = line.replace('```', '').trim();
        }
        continue;
      }

      if (inCodeBlock) {
        codeBuffer.push(line);
        continue;
      }

      // Headings
      if (line.startsWith('# ')) {
        elements.push(
          <h1 key={`h1-${i}`} className="text-xl sm:text-2xl font-extrabold text-white mt-5 mb-2.5 pb-2 border-b border-slate-800/80">
            {formatInlineText(line.replace('# ', ''))}
          </h1>
        );
        continue;
      }

      if (line.startsWith('## ')) {
        elements.push(
          <h2 key={`h2-${i}`} className="text-lg sm:text-xl font-bold text-indigo-300 mt-4 mb-2 flex items-center gap-2">
            {formatInlineText(line.replace('## ', ''))}
          </h2>
        );
        continue;
      }

      if (line.startsWith('### ')) {
        elements.push(
          <h3 key={`h3-${i}`} className="text-base sm:text-lg font-semibold text-slate-200 mt-3 mb-1.5">
            {formatInlineText(line.replace('### ', ''))}
          </h3>
        );
        continue;
      }

      // Blockquotes or YouTube callouts
      if (line.startsWith('> ')) {
        elements.push(
          <blockquote key={`bq-${i}`} className="my-2 pl-4 border-l-4 border-indigo-500 bg-indigo-500/5 py-1.5 pr-3 rounded-r text-sm text-slate-300 italic">
            {formatInlineText(line.replace('> ', ''))}
          </blockquote>
        );
        continue;
      }

      // Unordered list
      if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        const listText = line.trim().substring(2);
        elements.push(
          <li key={`li-${i}`} className="ml-4 list-disc text-sm text-slate-300 my-1 leading-relaxed">
            {formatInlineText(listText)}
          </li>
        );
        continue;
      }

      // Ordered list
      const numMatch = line.trim().match(/^(\d+)\.\s+(.+)$/);
      if (numMatch) {
        elements.push(
          <div key={`num-${i}`} className="flex items-start gap-2 text-sm text-slate-300 my-1 leading-relaxed ml-2">
            <span className="font-bold text-indigo-400 min-w-5">{numMatch[1]}.</span>
            <span>{formatInlineText(numMatch[2])}</span>
          </div>
        );
        continue;
      }

      // Empty line
      if (!line.trim()) {
        elements.push(<div key={`empty-${i}`} className="h-2" />);
        continue;
      }

      // Check for Visual Cue or Director Cue for YouTube
      if (line.includes('[Visual Cue]') || line.includes('[Visual/B-Roll]') || line.includes('[B-Roll]')) {
        elements.push(
          <div key={`vc-${i}`} className="my-2 p-2.5 rounded-lg bg-cyan-950/40 border border-cyan-700/50 text-xs text-cyan-300 flex items-center gap-2">
            <span className="px-1.5 py-0.5 rounded bg-cyan-800/60 font-bold uppercase tracking-wider text-[10px]">
              Visual Cue
            </span>
            <span>{formatInlineText(line.replace(/\[Visual( Cue|\/B-Roll)?\]:?/gi, '').trim())}</span>
          </div>
        );
        continue;
      }

      // Regular paragraph
      elements.push(
        <p key={`p-${i}`} className="text-sm text-slate-300 leading-relaxed my-1.5">
          {formatInlineText(line)}
        </p>
      );
    }

    return elements;
  };

  const formatInlineText = (text: string): React.ReactNode => {
    // Process bold, italic, inline code, and links
    const parts: React.ReactNode[] = [];
    let remaining = text;
    let keyIdx = 0;

    // Pattern for **bold**, `code`, [link](url)
    const regex = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
    const splitArr = remaining.split(regex);

    for (const chunk of splitArr) {
      if (!chunk) continue;

      if (chunk.startsWith('**') && chunk.endsWith('**')) {
        parts.push(
          <strong key={keyIdx++} className="font-bold text-slate-100">
            {chunk.slice(2, -2)}
          </strong>
        );
      } else if (chunk.startsWith('`') && chunk.endsWith('`')) {
        parts.push(
          <code key={keyIdx++} className="px-1.5 py-0.5 bg-slate-800 text-indigo-300 rounded text-xs font-mono">
            {chunk.slice(1, -1)}
          </code>
        );
      } else if (chunk.startsWith('[') && chunk.includes('](') && chunk.endsWith(')')) {
        const linkMatch = chunk.match(/\[([^\]]+)\]\(([^)]+)\)/);
        if (linkMatch) {
          parts.push(
            <a
              key={keyIdx++}
              href={linkMatch[2]}
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-400 hover:text-cyan-300 underline inline-flex items-center gap-0.5"
            >
              {linkMatch[1]}
              <ExternalLink className="w-3 h-3 inline" />
            </a>
          );
        } else {
          parts.push(chunk);
        }
      } else {
        parts.push(chunk);
      }
    }

    return parts;
  };

  return <div className="space-y-1">{renderFormattedMarkdown(content)}</div>;
};

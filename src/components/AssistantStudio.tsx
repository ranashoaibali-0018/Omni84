import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Sparkles,
  Search,
  Video,
  PenTool,
  Mail,
  Bot,
  Globe,
  Save,
  Copy,
  Check,
  Maximize2,
  X,
  ExternalLink,
  ShieldAlert,
  Loader2,
  Trash2,
  Tv,
} from 'lucide-react';
import { AssistantMode, ChatMessage, GroundingSource, ProposedAction } from '../types/agent';
import { MarkdownRenderer } from '../utils/markdownRenderer';

interface AssistantStudioProps {
  useLiveSearch: boolean;
  onRequestSave: (action: ProposedAction) => void;
  prefilledPrompt?: { text: string; mode: AssistantMode } | null;
  onClearPrefilledPrompt?: () => void;
}

export const AssistantStudio: React.FC<AssistantStudioProps> = ({
  useLiveSearch,
  onRequestSave,
  prefilledPrompt,
  onClearPrefilledPrompt,
}) => {
  const [mode, setMode] = useState<AssistantMode>('research');
  const [inputPrompt, setInputPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // When a prefilled prompt is sent from the 30 Freelance Tasks Hub
  useEffect(() => {
    if (prefilledPrompt) {
      setMode(prefilledPrompt.mode);
      setInputPrompt(prefilledPrompt.text);
      onClearPrefilledPrompt?.();
    }
  }, [prefilledPrompt]);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      mode: 'general',
      content: `# Hello! I am OmniAgent, your Personal AI Assistant.
I am equipped with **Google Gemini 3.8 Flash** and **Live Google Search Grounding**.

Here is what I can do for you:
- **🔬 Live Research**: Search the internet in real time for trending products, papers, market data, and competitor breakdowns.
- **🎬 YouTube Script Studio**: Structure high-retention video scripts with killer hooks, scene-by-scene visual cues, and CTAs.
- **✍️ Content Creation**: Generate publication-ready articles, LinkedIn posts, and newsletters.
- **✉️ Email Drafting**: Produce high-converting outreach emails with multiple subject line variants.
- **🛡️ Critical Action Shield**: Every file save or disk operation requires your explicit "Yes/No" authorization.

Select a mode above or ask me anything!`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [teleprompterContent, setTeleprompterContent] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isGenerating]);

  // Mode configuration
  const MODES: { id: AssistantMode; label: string; icon: React.ReactNode; desc: string }[] = [
    {
      id: 'research',
      label: 'Research & Trends',
      icon: <Search className="w-4 h-4" />,
      desc: 'Live web search for latest facts, products, and market intelligence',
    },
    {
      id: 'youtube',
      label: 'YouTube Script Studio',
      icon: <Video className="w-4 h-4" />,
      desc: 'Viral hooks, retention bridges, visual & B-roll cues, teleprompter view',
    },
    {
      id: 'content',
      label: 'Content & Copy',
      icon: <PenTool className="w-4 h-4" />,
      desc: 'High-impact blogs, newsletter deep dives, and social posts',
    },
    {
      id: 'email',
      label: 'Email Drafter',
      icon: <Mail className="w-4 h-4" />,
      desc: 'Executive outreach with 3 subject lines and strategic follow-ups',
    },
    {
      id: 'general',
      label: 'General Assistant',
      icon: <Bot className="w-4 h-4" />,
      desc: 'Versatile problem solving, coding, and brainstorming',
    },
  ];

  // Quick prompt suggestions
  const PROMPT_PRESETS: { mode: AssistantMode; text: string }[] = [
    {
      mode: 'research',
      text: 'Research the most trending AI agent tools and multi-agent frameworks in 2025/2026. Include key features and live sources.',
    },
    {
      mode: 'youtube',
      text: 'Plan a viral 10-minute YouTube script titled: "5 AI Productivity Secrets That Save Me 20 Hours a Week". Include hooks and visual cues.',
    },
    {
      mode: 'email',
      text: 'Draft a professional cold email to a potential enterprise client pitching our AI automation consulting service. Give 3 subject lines.',
    },
    {
      mode: 'content',
      text: 'Write an insightful LinkedIn article on how autonomous AI assistants are transforming small business operations with actionable tips.',
    },
  ];

  const handleSend = async (customPrompt?: string) => {
    const promptToSend = customPrompt || inputPrompt;
    if (!promptToSend.trim() || isGenerating) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: promptToSend,
      mode: mode,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputPrompt('');
    setIsGenerating(true);

    try {
      // Build conversation history for API
      const history = messages
        .filter((m) => m.id !== 'welcome')
        .slice(-6)
        .map((m) => ({
          role: m.role,
          content: m.content,
        }));

      const res = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptToSend,
          history,
          mode,
          useLiveSearch,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate response');
      }

      const agentMessage: ChatMessage = {
        id: `agent-${Date.now()}`,
        role: 'assistant',
        content: data.text,
        mode: data.mode,
        sources: data.sources || [],
        suggestedSave: data.suggestedSave,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, agentMessage]);
    } catch (err: any) {
      console.error('Agent generation failed:', err);
      const errorMessage: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `❌ **Error:** ${err.message || 'Unable to communicate with Gemini API. Check your internet connection.'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyMessage = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleTriggerSave = (msg: ChatMessage) => {
    const titleMatch = msg.content.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1].trim() : `${msg.mode || 'agent'}-document`;
    const cleanFilename =
      title
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .slice(0, 35) + '.md';

    onRequestSave({
      action: 'save_file',
      filename: cleanFilename,
      type: msg.mode || 'general',
      format: 'markdown',
      content: msg.content,
      sizeBytes: new Blob([msg.content]).size,
      preview: msg.content.slice(0, 200) + '...',
    });
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: 'assistant',
        mode: 'general',
        content: `Chat cleared. Ready for your next command! Current mode: **${mode.toUpperCase()}**.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Mode Selector Strip */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-2 shadow-lg">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {MODES.map((m) => {
            const isSelected = mode === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                className={`flex items-center gap-2.5 p-3 rounded-xl text-left transition-all ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 ring-1 ring-indigo-400'
                    : 'bg-slate-950/60 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800/80'
                }`}
              >
                <div
                  className={`p-2 rounded-lg ${
                    isSelected ? 'bg-indigo-700 text-white' : 'bg-slate-800 text-indigo-400'
                  }`}
                >
                  {m.icon}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold truncate">{m.label}</p>
                  <p className="text-[10px] text-slate-300/80 truncate opacity-90 hidden sm:block">
                    {m.id === 'research' ? 'Live Web Search' : m.id === 'youtube' ? 'Visual Cues' : m.id === 'email' ? 'Subject lines' : 'Fast'}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Suggested Inspiration Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <span className="text-slate-400 font-semibold flex items-center gap-1 flex-shrink-0">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          Presets:
        </span>
        {PROMPT_PRESETS.map((preset, idx) => (
          <button
            key={idx}
            onClick={() => {
              setMode(preset.mode);
              handleSend(preset.text);
            }}
            className="flex-shrink-0 px-3 py-1.5 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/40 text-slate-300 hover:text-white transition truncate max-w-xs text-[11px]"
          >
            {preset.text}
          </button>
        ))}
      </div>

      {/* Messages Feed */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 sm:p-6 min-h-[500px] max-h-[680px] overflow-y-auto space-y-6 shadow-inner">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex gap-3 sm:gap-4 ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              {!isUser && (
                <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 text-white flex items-center justify-center shadow-md">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`relative max-w-3xl rounded-2xl p-4 sm:p-5 shadow-lg ${
                  isUser
                    ? 'bg-indigo-600 text-white rounded-tr-none'
                    : 'bg-slate-900 border border-slate-800/90 text-slate-200 rounded-tl-none'
                }`}
              >
                {/* Meta top bar for Assistant messages */}
                {!isUser && (
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5 mb-3 text-xs text-slate-400">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-200">OmniAgent</span>
                      {msg.mode && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-slate-800 text-indigo-400 border border-slate-700">
                          {msg.mode}
                        </span>
                      )}
                      {msg.sources && msg.sources.length > 0 && (
                        <span className="flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                          <Globe className="w-3 h-3" />
                          {msg.sources.length} Live Sources
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400">{msg.timestamp}</span>
                  </div>
                )}

                {/* Message Body */}
                <div className="leading-relaxed">
                  {isUser ? (
                    <p className="text-sm sm:text-base font-normal whitespace-pre-wrap">{msg.content}</p>
                  ) : (
                    <MarkdownRenderer content={msg.content} />
                  )}
                </div>

                {/* Live Grounding Sources list */}
                {!isUser && msg.sources && msg.sources.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-slate-800/90">
                    <span className="text-xs font-bold text-slate-400 block mb-2 flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-emerald-400" />
                      Google Search Grounding Sources:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {msg.sources.map((src, idx) => (
                        <a
                          key={idx}
                          href={src.uri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs text-cyan-400 hover:text-cyan-300 transition"
                        >
                          <span className="truncate max-w-[200px]">{src.title}</span>
                          <ExternalLink className="w-3 h-3 flex-shrink-0" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Assistant Action Buttons: Save to File & Copy */}
                {!isUser && msg.id !== 'welcome' && (
                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {/* Critical Action: Save to File with confirmation */}
                      <button
                        onClick={() => handleTriggerSave(msg)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 transition"
                      >
                        <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                        <span>Save to File (Requires Yes/No)</span>
                      </button>

                      {/* YouTube Teleprompter mode */}
                      {msg.mode === 'youtube' && (
                        <button
                          onClick={() => setTeleprompterContent(msg.content)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                        >
                          <Tv className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Teleprompter View</span>
                        </button>
                      )}
                    </div>

                    <button
                      onClick={() => handleCopyMessage(msg.content, msg.id)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
                    >
                      {copiedId === msg.id ? (
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
                )}
              </div>

              {isUser && (
                <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-slate-800 text-slate-300 flex items-center justify-center">
                  <span className="text-xs font-bold">You</span>
                </div>
              )}
            </div>
          );
        })}

        {/* Loading Spinner Indicator */}
        {isGenerating && (
          <div className="flex gap-4 justify-start items-center text-slate-400 text-xs animate-pulse">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 text-white flex items-center justify-center">
              <Bot className="w-4 h-4" />
            </div>
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center gap-3">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
              <span>
                OmniAgent is {useLiveSearch ? 'searching live web & ' : ''}synthesizing with Gemini 3.8 Flash...
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 shadow-2xl relative">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-end gap-2"
        >
          <div className="flex-1 relative">
            <textarea
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              rows={2}
              placeholder={`Ask OmniAgent in ${mode.toUpperCase()} mode (e.g. "Research trending productivity apps in 2026", "Write YouTube script with visual cues")...`}
              className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleClearChat}
              title="Clear chat"
              className="p-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
            >
              <Trash2 className="w-5 h-5" />
            </button>

            <button
              type="submit"
              disabled={!inputPrompt.trim() || isGenerating}
              className="px-5 py-3 rounded-xl bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              <span className="hidden sm:inline">Send</span>
            </button>
          </div>
        </form>
      </div>

      {/* Teleprompter Modal for YouTube script reading */}
      {teleprompterContent && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col p-6 animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-4 border-b border-zinc-800 max-w-4xl mx-auto w-full">
            <div className="flex items-center gap-3">
              <Tv className="w-6 h-6 text-red-500 animate-pulse" />
              <div>
                <h2 className="text-xl font-black text-white">YouTube Script Teleprompter Mode</h2>
                <p className="text-xs text-zinc-400">High-contrast, distraction-free reading mode for recording</p>
              </div>
            </div>
            <button
              onClick={() => setTeleprompterContent(null)}
              className="p-2 rounded-xl bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 transition"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="flex-1 max-w-4xl mx-auto w-full overflow-y-auto py-10 px-4 space-y-6 text-zinc-100 text-xl md:text-2xl font-sans leading-loose">
            <MarkdownRenderer content={teleprompterContent} />
          </div>
        </div>
      )}
    </div>
  );
};

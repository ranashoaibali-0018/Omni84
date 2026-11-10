import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Send,
  Mic,
  MicOff,
  Bot,
  Play,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  Download,
  ExternalLink,
  ChevronRight,
  Terminal,
  FileSpreadsheet,
  FileText,
  FileCode,
  Archive,
  Layers,
  StopCircle,
  RefreshCw,
  Search,
  Globe,
  Code,
  ShieldCheck,
  Check,
  Copy,
} from 'lucide-react';
import { TaskExecutionRecord, AgentDefinition, TaskStep } from '../types/agent';
import { MarkdownRenderer } from '../utils/markdownRenderer';

interface WorkforceDashboardProps {
  agents: AgentDefinition[];
  onSelectProject?: (projectId: string) => void;
  selectedTaskIdFromHeader?: string | null;
  selectedAgentIdFromHeader?: string | null;
  onClearHeaderSelection?: () => void;
}

export const WorkforceDashboard: React.FC<WorkforceDashboardProps> = ({
  agents,
  selectedTaskIdFromHeader,
  selectedAgentIdFromHeader,
  onClearHeaderSelection,
}) => {
  const [prompt, setPrompt] = useState('');
  const [selectedAgentId, setSelectedAgentId] = useState('project-manager-agent');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTask, setActiveTask] = useState<TaskExecutionRecord | null>(null);
  const [recentTasks, setRecentTasks] = useState<TaskExecutionRecord[]>([]);
  const [selectedStep, setSelectedStep] = useState<TaskStep | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState(false);

  // If a task is selected from Header Global Search
  useEffect(() => {
    if (selectedTaskIdFromHeader) {
      fetch(`/api/workforce/tasks/${selectedTaskIdFromHeader}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.task) {
            setActiveTask(data.task);
          }
        })
        .catch((err) => console.error('Failed to load task from header search:', err));
      onClearHeaderSelection?.();
    }
  }, [selectedTaskIdFromHeader]);

  // If an agent is selected from Header Global Search
  useEffect(() => {
    if (selectedAgentIdFromHeader) {
      setSelectedAgentId(selectedAgentIdFromHeader);
      onClearHeaderSelection?.();
    }
  }, [selectedAgentIdFromHeader]);

  const logsEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Poll active task if in progress
  useEffect(() => {
    let interval: any = null;
    if (activeTask && (activeTask.status === 'planning' || activeTask.status === 'executing' || activeTask.status === 'verifying')) {
      interval = setInterval(async () => {
        try {
          const res = await fetch(`/api/workforce/tasks/${activeTask.id}`);
          const data = await res.json();
          if (data.task) {
            setActiveTask(data.task);
            if (data.task.status === 'completed' || data.task.status === 'failed' || data.task.status === 'cancelled') {
              loadRecentTasks();
            }
          }
        } catch (e) {
          console.error('Error polling task:', e);
        }
      }, 1500);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeTask?.id, activeTask?.status]);

  // Load recent tasks on mount
  const loadRecentTasks = async () => {
    try {
      const res = await fetch('/api/workforce/tasks');
      const data = await res.json();
      if (data.tasks) {
        setRecentTasks(data.tasks);
      }
    } catch (e) {
      console.error('Failed to load recent tasks:', e);
    }
  };

  useEffect(() => {
    loadRecentTasks();
  }, []);

  // Scroll logs to bottom
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeTask?.logs]);

  // Web Speech API Voice Recognition
  const toggleVoiceInput = () => {
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechError('Web Speech API is not supported in this browser. Please type your command.');
      setTimeout(() => setSpeechError(null), 4000);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        setSpeechError(null);
      };

      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0].transcript)
          .join('');
        setPrompt(transcript);
      };

      recognition.onerror = (event: any) => {
        setSpeechError(`Voice error: ${event.error}`);
        setIsListening(false);
        setTimeout(() => setSpeechError(null), 3500);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      setSpeechError('Microphone permission denied or unavailable');
      setIsListening(false);
      setTimeout(() => setSpeechError(null), 3500);
    }
  };

  // Launch Autonomous Task
  const handleLaunchTask = async (customPrompt?: string, customAgentId?: string) => {
    const p = customPrompt || prompt;
    if (!p.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setSelectedStep(null);

    try {
      const res = await fetch('/api/workforce/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: p,
          agentId: customAgentId || selectedAgentId,
        }),
      });

      const data = await res.json();
      if (res.ok && data.task) {
        setActiveTask(data.task);
        setPrompt('');
        loadRecentTasks();
      } else {
        alert(data.error || 'Failed to start task');
      }
    } catch (err: any) {
      alert(`Error starting workforce task: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Cancel Task
  const handleCancelTask = async () => {
    if (!activeTask) return;
    try {
      await fetch(`/api/workforce/tasks/${activeTask.id}/cancel`, { method: 'POST' });
      setActiveTask((prev) => (prev ? { ...prev, status: 'cancelled' } : null));
      loadRecentTasks();
    } catch (e) {
      console.error('Failed to cancel task:', e);
    }
  };

  const PROMPT_SUGGESTIONS = [
    {
      title: 'Full Market Research & Excel Model',
      prompt: 'Perform comprehensive competitor research on top 5 AI coding assistants in 2026. Extract pricing, features, market share, and compile an Excel spreadsheet.',
      agent: 'research-agent',
    },
    {
      title: 'Python Lead Scraper & ZIP Export',
      prompt: 'Write and execute a Python data analysis script that cleans customer leads, computes tier scores, and exports a deployable project ZIP.',
      agent: 'coding-agent',
    },
    {
      title: 'SEO Audit & High-CTR Meta Tags',
      prompt: 'Audit on-page SEO for an AI SaaS platform. Generate high-intent keyword clusters, title tags, meta descriptions, and JSON-LD schema.',
      agent: 'seo-agent',
    },
    {
      title: 'Meta Ads Campaign Architecture',
      prompt: 'Plan a $5,000/mo Meta Ads marketing campaign for an autonomous AI assistant with 3 ad sets, budget allocation, 5 headline hooks, and ROAS projection.',
      agent: 'digital-marketing-agent',
    },
    {
      title: 'YouTube Viral Retention Script & Word Doc',
      prompt: 'Plan a high-retention 10-minute YouTube script on "How AI Agents Are Replacing 80% of Office Work" with scene-by-scene visual cues and export as Word doc.',
      agent: 'video-production-agent',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-300">
      {/* Top Hero Banner */}
      <div className="relative rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950/80 to-slate-900 border border-indigo-500/30 p-8 shadow-2xl overflow-hidden">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 mb-3">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Real Execution Engine • 12 Specialized Agents • Verified Results</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              OmniAgent Autonomous AI Workforce
            </h1>
            <p className="text-slate-300 text-sm sm:text-base mt-2 leading-relaxed">
              Command an elite team of 12 autonomous AI agents equipped with live web browsing, real Python execution, genuine Excel and Word generators, technical SEO auditing, and deployable ZIP packagers.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-center">
              <span className="text-2xl font-black text-emerald-400">12</span>
              <span className="block text-[11px] text-slate-400 font-semibold uppercase">Specialized Agents</span>
            </div>
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-center">
              <span className="text-2xl font-black text-cyan-400">8</span>
              <span className="block text-[11px] text-slate-400 font-semibold uppercase">Real Tools</span>
            </div>
          </div>
        </div>
      </div>

      {/* UNIVERSAL AI COMMAND BOX */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Assigned Autonomous Agent:
            </span>
            <select
              value={selectedAgentId}
              onChange={(e) => setSelectedAgentId(e.target.value)}
              className="bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs font-bold text-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="project-manager-agent">⭐ Auto Coordinator (Project Manager Agent)</option>
              {agents
                .filter((a) => a.id !== 'project-manager-agent')
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.category})
                  </option>
                ))}
            </select>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Multi-Step Verification Active</span>
          </div>
        </div>

        {/* Command Input Area */}
        <div className="relative bg-slate-950 border border-slate-800 rounded-2xl p-3 focus-within:border-indigo-500/80 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleLaunchTask();
              }
            }}
            rows={3}
            placeholder={`Instruct your AI workforce (e.g. "Research market trends for AI SaaS, build Python lead scraper, and export Excel report")...`}
            className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-500 resize-none focus:outline-none"
          />

          <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
            <div className="flex items-center gap-2">
              {/* Voice Input Button */}
              <button
                type="button"
                onClick={toggleVoiceInput}
                title={isListening ? 'Stop listening' : 'Start voice input (Speak command)'}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                  isListening
                    ? 'bg-rose-500 text-white animate-pulse shadow-lg shadow-rose-500/30'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
                }`}
              >
                {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5 text-indigo-400" />}
                <span>{isListening ? 'Listening...' : 'Voice Input'}</span>
              </button>

              {speechError && (
                <span className="text-xs text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                  {speechError}
                </span>
              )}
            </div>

            <button
              type="button"
              disabled={!prompt.trim() || isSubmitting}
              onClick={() => handleLaunchTask()}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Planning Task...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Execute Task</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Quick Suggestion Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs scrollbar-none">
          <span className="text-slate-400 font-semibold flex items-center gap-1 flex-shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            Presets:
          </span>
          {PROMPT_SUGGESTIONS.map((item, idx) => (
            <button
              key={idx}
              onClick={() => {
                setSelectedAgentId(item.agent);
                handleLaunchTask(item.prompt, item.agent);
              }}
              className="flex-shrink-0 px-3 py-1.5 rounded-xl bg-slate-950/80 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition text-[11px] truncate max-w-xs"
            >
              {item.title}
            </button>
          ))}
        </div>
      </div>

      {/* ACTIVE TASK EXECUTION DASHBOARD */}
      {activeTask && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6">
          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Active Mission ID: {activeTask.id}
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1 ${
                    activeTask.status === 'completed'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : activeTask.status === 'failed'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      : activeTask.status === 'cancelled'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 animate-pulse'
                  }`}
                >
                  {activeTask.status === 'executing' && <Loader2 className="w-3 h-3 animate-spin" />}
                  {activeTask.status}
                </span>
              </div>
              <h2 className="text-lg font-bold text-white mt-1">"{activeTask.userPrompt}"</h2>
              <p className="text-xs text-indigo-300 mt-0.5">{activeTask.planOverview}</p>
            </div>

            <div className="flex items-center gap-2">
              {(activeTask.status === 'planning' || activeTask.status === 'executing' || activeTask.status === 'verifying') && (
                <button
                  onClick={handleCancelTask}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 transition"
                >
                  <StopCircle className="w-4 h-4" />
                  <span>Stop & Cancel</span>
                </button>
              )}
            </div>
          </div>

          {/* Sequential Execution Pipeline Stages */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Sequential Execution Pipeline:
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {activeTask.steps.map((step) => {
                const isSelected = selectedStep?.id === step.id;
                return (
                  <div
                    key={step.id}
                    onClick={() => setSelectedStep(step)}
                    className={`cursor-pointer p-4 rounded-2xl border transition-all ${
                      isSelected
                        ? 'bg-indigo-950/60 border-indigo-500 ring-2 ring-indigo-500/30 shadow-lg'
                        : step.status === 'completed'
                        ? 'bg-slate-950/80 border-emerald-500/30 hover:border-emerald-500/60'
                        : step.status === 'running'
                        ? 'bg-indigo-950/30 border-indigo-500/60 animate-pulse'
                        : step.status === 'failed'
                        ? 'bg-rose-950/30 border-rose-500/50'
                        : 'bg-slate-950/40 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                        Phase {step.stepNumber}
                      </span>
                      {step.status === 'completed' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                      {step.status === 'running' && <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />}
                      {step.status === 'failed' && <XCircle className="w-4 h-4 text-rose-400" />}
                      {step.status === 'pending' && <span className="w-2 h-2 rounded-full bg-slate-600" />}
                    </div>

                    <h4 className="text-xs font-bold text-white truncate">{step.title}</h4>
                    <p className="text-[11px] text-slate-400 mt-1 capitalize truncate">
                      Agent: {step.agentId.replace('-agent', '')}
                    </p>
                    {step.toolName && (
                      <span className="mt-2 inline-block px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                        tool: {step.toolName}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Step Inspector if clicked */}
          {selectedStep && (
            <div className="p-4 rounded-2xl bg-slate-950 border border-indigo-500/40 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-300">
                  Inspecting Phase {selectedStep.stepNumber}: {selectedStep.title}
                </span>
                <button
                  onClick={() => setSelectedStep(null)}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Close
                </button>
              </div>

              {selectedStep.verificationDetails && (
                <div className="text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-xl">
                  {selectedStep.verificationDetails}
                </div>
              )}

              {selectedStep.output && (
                <div className="bg-slate-900 p-3 rounded-xl max-h-56 overflow-y-auto font-mono text-xs text-slate-300 whitespace-pre-wrap">
                  {typeof selectedStep.output === 'object'
                    ? JSON.stringify(selectedStep.output, null, 2)
                    : selectedStep.output}
                </div>
              )}
            </div>
          )}

          {/* VERIFIED DELIVERABLES & DOWNLOADS */}
          {activeTask.verifiedDeliverables.length > 0 && (
            <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-slate-950 to-indigo-950/40 border border-emerald-500/40 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  Verified Production Deliverables ({activeTask.verifiedDeliverables.length})
                </h3>
                <span className="text-[11px] text-emerald-300 font-semibold uppercase tracking-wider">
                  Ready for Download
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {activeTask.verifiedDeliverables.map((deliv, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-emerald-500/40 transition flex items-center justify-between gap-3 shadow-md"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 flex-shrink-0">
                        {deliv.type === 'xlsx' ? (
                          <FileSpreadsheet className="w-4 h-4" />
                        ) : deliv.type === 'docx' ? (
                          <FileText className="w-4 h-4" />
                        ) : deliv.type === 'zip' ? (
                          <Archive className="w-4 h-4" />
                        ) : deliv.type === 'python' ? (
                          <FileCode className="w-4 h-4" />
                        ) : (
                          <FileText className="w-4 h-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-200 truncate">{deliv.title}</p>
                        <p className="text-[10px] text-slate-400 truncate">{deliv.filename}</p>
                      </div>
                    </div>

                    {deliv.downloadUrl ? (
                      <a
                        href={deliv.downloadUrl}
                        download
                        className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow transition"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Get</span>
                      </a>
                    ) : (
                      <button
                        onClick={() => {
                          const blob = new Blob([deliv.preview || ''], { type: 'text/markdown' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = deliv.filename;
                          a.click();
                        }}
                        className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Save</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Real Sources section */}
          {activeTask.sources.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-indigo-400" />
                Verified Research Sources ({activeTask.sources.length}):
              </span>
              <div className="flex flex-wrap gap-2">
                {activeTask.sources.map((src, i) => (
                  <a
                    key={i}
                    href={src.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs text-cyan-400 hover:text-cyan-300 transition"
                  >
                    <span className="truncate max-w-[220px]">{src.title}</span>
                    <ExternalLink className="w-3 h-3 flex-shrink-0" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Real Execution Console Logs */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                Live Execution Logs:
              </span>
              <span className="text-[11px] text-slate-500 font-mono">
                {activeTask.logs.length} logged events
              </span>
            </div>

            <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-4 font-mono text-xs max-h-56 overflow-y-auto space-y-1.5 leading-relaxed">
              {activeTask.logs.map((lg, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <span className="text-slate-500 select-none text-[10px]">
                    {new Date(lg.timestamp).toLocaleTimeString()}
                  </span>
                  <span
                    className={`px-1 rounded text-[10px] font-bold ${
                      lg.level === 'success'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : lg.level === 'warn'
                        ? 'bg-amber-500/20 text-amber-400'
                        : lg.level === 'error'
                        ? 'bg-rose-500/20 text-rose-400'
                        : 'bg-indigo-500/20 text-indigo-300'
                    }`}
                  >
                    {lg.agentId ? lg.agentId.replace('-agent', '') : lg.level}
                  </span>
                  <span className="text-slate-300">{lg.message}</span>
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>
          </div>
        </div>
      )}

      {/* RECENT COMPLETED WORKFORCE MISSIONS */}
      {recentTasks.length > 0 && !activeTask && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">
            Recent Workforce Missions:
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {recentTasks.slice(0, 4).map((t) => (
              <div
                key={t.id}
                onClick={() => setActiveTask(t)}
                className="cursor-pointer p-4 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-indigo-500/50 transition flex items-center justify-between gap-3 shadow-md"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-bold text-white truncate max-w-xs">{t.userPrompt}</span>
                    <span
                      className={`px-2 py-0.2 rounded-full text-[10px] font-bold ${
                        t.status === 'completed'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {t.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 truncate">
                    {t.verifiedDeliverables.length} deliverables • {t.steps.length} execution stages
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500 flex-shrink-0" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

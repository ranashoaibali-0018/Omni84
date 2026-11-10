import React, { useState, useEffect } from 'react';
import {
  Wrench,
  Search,
  Globe,
  Terminal,
  FileSpreadsheet,
  FileText,
  Archive,
  TrendingUp,
  Target,
  Play,
  Download,
  Loader2,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
} from 'lucide-react';
import { ToolDefinitionMeta } from '../types/agent';

export const ToolRegistryView: React.FC = () => {
  const [tools, setTools] = useState<ToolDefinitionMeta[]>([]);
  const [selectedTool, setSelectedTool] = useState<ToolDefinitionMeta | null>(null);
  const [toolArgsInput, setToolArgsInput] = useState<string>('{}');
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch('/api/workforce/tools')
      .then((res) => res.json())
      .then((data) => {
        if (data.tools) {
          setTools(data.tools);
          if (data.tools.length > 0) {
            handleSelectTool(data.tools[0]);
          }
        }
      })
      .catch((e) => console.error('Failed to load tools:', e));
  }, []);

  const handleSelectTool = (tool: ToolDefinitionMeta) => {
    setSelectedTool(tool);
    setExecutionResult(null);

    // Provide helpful sample arguments based on the tool
    let sampleArgs: any = {};
    if (tool.name === 'web_search') {
      sampleArgs = { query: 'Top autonomous AI workforce agents 2026' };
    } else if (tool.name === 'web_browse') {
      sampleArgs = { url: 'https://news.ycombinator.com', extractType: 'all' };
    } else if (tool.name === 'python_execute') {
      sampleArgs = {
        code: `import math\nnumbers = [12, 45, 78, 23, 56]\nmean = sum(numbers) / len(numbers)\nprint(f"Dataset: {numbers}")\nprint(f"Computed Mean: {mean:.2f}")\n`,
        timeoutSeconds: 10,
      };
    } else if (tool.name === 'generate_excel') {
      sampleArgs = {
        filename: 'Quarterly_Metrics.xlsx',
        sheets: [
          {
            name: 'Q1 Performance',
            headers: ['Department', 'Budget', 'Spent', 'ROI (%)'],
            rows: [
              ['Engineering', 120000, 105000, 310],
              ['Marketing', 50000, 48000, 420],
              ['Customer Success', 30000, 27500, 280],
            ],
          },
        ],
      };
    } else if (tool.name === 'generate_word') {
      sampleArgs = {
        filename: 'Project_Charter.docx',
        title: 'Autonomous AI Workforce Architecture',
        sections: [
          {
            heading: 'System Objective',
            paragraphs: ['Implement a multi-agent autonomous workforce capable of verified execution.'],
            bullets: ['Real Python execution', 'Live Web Grounding', 'Office document generation'],
          },
        ],
      };
    } else if (tool.name === 'create_project_zip') {
      sampleArgs = {
        zipName: 'my-microservice.zip',
        files: [
          { path: 'app.py', content: 'print("Running microservice...")\n' },
          { path: 'requirements.txt', content: 'requests>=2.31.0\n' },
          { path: 'README.md', content: '# Microservice\nBuilt with OmniAgent.\n' },
        ],
      };
    } else if (tool.name === 'seo_audit') {
      sampleArgs = {
        title: 'Top AI Agents for Developers in 2026',
        content: 'Autonomous AI agents are transforming software engineering by automating test generation and debugging.',
        targetKeyword: 'AI agents',
      };
    } else if (tool.name === 'ad_campaign_planner') {
      sampleArgs = {
        productName: 'OmniAgent Pro',
        monthlyBudget: 2500,
        targetAudience: 'Software Engineers and Digital Freelancers',
      };
    }

    setToolArgsInput(JSON.stringify(sampleArgs, null, 2));
  };

  const handleExecuteTool = async () => {
    if (!selectedTool || isExecuting) return;
    setIsExecuting(true);
    setExecutionResult(null);

    try {
      const parsedArgs = JSON.parse(toolArgsInput);
      const res = await fetch('/api/tools/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: selectedTool.name,
          args: parsedArgs,
        }),
      });

      const data = await res.json();
      setExecutionResult(data);
    } catch (err: any) {
      setExecutionResult({ error: `Execution Error: ${err.message}` });
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-300">
      {/* Top Banner */}
      <div className="relative rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950/80 to-slate-900 border border-indigo-500/30 p-8 shadow-2xl overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 mb-3">
              <Wrench className="w-3.5 h-3.5 text-indigo-400" />
              <span>Real Execution Tool Registry & Direct Sandbox</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Workforce Tool Registry & Live Tester
            </h1>
            <p className="text-slate-300 text-sm sm:text-base mt-2 leading-relaxed">
              Every specialized agent leverages this modular tool registry. Test real Python sandboxed execution, real web page extraction, Excel and Word file generation, and technical SEO auditing directly.
            </p>
          </div>

          <span className="px-4 py-2 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs font-bold text-cyan-400">
            {tools.length} Tools Registered
          </span>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Tool Cards List (Left Column) */}
        <div className="lg:col-span-5 space-y-2.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
            Available Execution Tools ({tools.length})
          </h3>

          <div className="space-y-2 max-h-[650px] overflow-y-auto pr-1">
            {tools.map((t) => {
              const isSelected = selectedTool?.name === t.name;
              return (
                <div
                  key={t.name}
                  onClick={() => handleSelectTool(t)}
                  className={`cursor-pointer p-4 rounded-2xl border transition-all ${
                    isSelected
                      ? 'bg-indigo-950/60 border-indigo-500 ring-2 ring-indigo-500/30 shadow-lg'
                      : 'bg-slate-900/70 border-slate-800 hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-xs font-bold text-white truncate">{t.displayName}</h4>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-indigo-300">
                      {t.category}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{t.description}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Live Interactive Tester (Right Column) */}
        <div className="lg:col-span-7">
          {selectedTool ? (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 flex flex-col h-[650px]">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <h3 className="text-base font-bold text-white">{selectedTool.displayName}</h3>
                  <p className="text-xs font-mono text-indigo-400">Tool Identifier: {selectedTool.name}</p>
                </div>

                <button
                  onClick={handleExecuteTool}
                  disabled={isExecuting}
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition active:scale-95 disabled:opacity-50"
                >
                  {isExecuting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                  <span>{isExecuting ? 'Executing Tool...' : 'Execute Tool'}</span>
                </button>
              </div>

              {/* JSON Arguments Editor */}
              <div className="space-y-1.5 flex-1 flex flex-col min-h-0">
                <span className="text-xs font-semibold text-slate-400">Tool Parameters (JSON format):</span>
                <textarea
                  value={toolArgsInput}
                  onChange={(e) => setToolArgsInput(e.target.value)}
                  className="w-full flex-1 bg-slate-950 font-mono text-xs text-slate-200 p-3 rounded-2xl border border-slate-800 resize-none focus:outline-none focus:border-indigo-500 leading-relaxed"
                />
              </div>

              {/* Tool Execution Result View */}
              {executionResult && (
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 max-h-56 overflow-y-auto space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold flex items-center gap-1.5 text-emerald-400">
                      <CheckCircle2 className="w-4 h-4" />
                      Execution Output (Real Backend Verification):
                    </span>
                    {executionResult.result?.downloadUrl && (
                      <a
                        href={executionResult.result.downloadUrl}
                        download
                        className="flex items-center gap-1 text-xs font-bold text-indigo-300 hover:text-white bg-indigo-600/30 px-2.5 py-1 rounded-lg border border-indigo-500/30"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download Result</span>
                      </a>
                    )}
                  </div>

                  <pre className="font-mono text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
                    {JSON.stringify(executionResult, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          ) : (
            <div className="h-[650px] flex items-center justify-center border border-dashed border-slate-800 rounded-3xl text-slate-500">
              Select a tool to test
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

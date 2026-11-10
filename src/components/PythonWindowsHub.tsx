import React, { useState, useEffect } from 'react';
import {
  Terminal,
  Download,
  Copy,
  Check,
  Code2,
  HelpCircle,
  Laptop,
  Key,
  FolderPlus,
  Play,
  CheckCircle2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export const PythonWindowsHub: React.FC = () => {
  const [activeCodeTab, setActiveCodeTab] = useState<'streamlit' | 'cli' | 'reqs' | 'batch' | 'readme'>('streamlit');
  const [codeData, setCodeData] = useState<{
    streamlit: string;
    cli: string;
    requirements: string;
    batch: string;
    readme: string;
  }>({
    streamlit: '',
    cli: '',
    requirements: '',
    batch: '',
    readme: '',
  });
  const [copiedTab, setCopiedTab] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/python-suite/code')
      .then((res) => res.json())
      .then((data) => {
        setCodeData(data);
      })
      .catch((err) => console.error('Failed to load Python code:', err));
  }, []);

  const handleCopy = (text: string, tabName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTab(tabName);
    setTimeout(() => setCopiedTab(null), 2000);
  };

  const handleDownloadFile = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadAll = () => {
    handleDownloadFile('app.py', codeData.streamlit);
    setTimeout(() => handleDownloadFile('agent_cli.py', codeData.cli), 300);
    setTimeout(() => handleDownloadFile('requirements.txt', codeData.requirements), 600);
    setTimeout(() => handleDownloadFile('run_agent.bat', codeData.batch), 900);
    setTimeout(() => handleDownloadFile('README.md', codeData.readme), 1200);
  };

  const getCurrentCode = () => {
    switch (activeCodeTab) {
      case 'streamlit':
        return codeData.streamlit;
      case 'cli':
        return codeData.cli;
      case 'reqs':
        return codeData.requirements;
      case 'batch':
        return codeData.batch;
      case 'readme':
        return codeData.readme;
      default:
        return '';
    }
  };

  const getCurrentFilename = () => {
    switch (activeCodeTab) {
      case 'streamlit':
        return 'app.py';
      case 'cli':
        return 'agent_cli.py';
      case 'reqs':
        return 'requirements.txt';
      case 'batch':
        return 'run_agent.bat';
      case 'readme':
        return 'README.md';
      default:
        return 'file.txt';
    }
  };

  const faqs = [
    {
      q: "What if it says `'python' is not recognized as an internal or external command`?",
      a: "This happens when the 'Add python.exe to PATH' checkbox was not selected during Python installation. To fix: simply run the Python installer again from python.org, select 'Modify' or 'Install', and make sure to check the box 'Add python.exe to PATH' on the first screen.",
    },
    {
      q: "How much does the Google Gemini API cost?",
      a: "Google AI Studio provides a free tier with high rate limits for Gemini 3.8 Flash and Google Search Grounding! You can create and use your API key without entering a credit card.",
    },
    {
      q: "How does the 'Do you want to proceed? Yes/No' protection work in Python?",
      a: "In both the Streamlit web app (`app.py`) and the CLI script (`agent_cli.py`), every file save operation halts until you click 'Yes, Proceed' or type 'yes'. If you decline, no disk write occurs.",
    },
    {
      q: "Can I run the CLI instead of the Streamlit browser app?",
      a: "Yes! Open your command prompt in the folder and type: `python agent_cli.py`. It runs entirely in your terminal with colored prompts and the same Google Search grounding and Yes/No safety checks.",
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10 animate-in fade-in duration-300">
      {/* Hero Banner */}
      <div className="relative rounded-3xl bg-gradient-to-r from-indigo-950 via-slate-900 to-cyan-950 border border-indigo-500/30 p-8 shadow-2xl overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 mb-3">
              <Laptop className="w-3.5 h-3.5" />
              Beginner-Friendly Windows Setup (No Coding Required)
            </span>
            <h1 className="text-3xl font-extrabold text-white tracking-tight sm:text-4xl">
              Run Your Personal AI Agent Locally on Windows
            </h1>
            <p className="text-slate-300 text-sm sm:text-base mt-2 leading-relaxed">
              Take complete ownership of your AI assistant. Run it on your laptop using either a local Streamlit web application or a clean command-line interface with real-time Google Search and critical action safety checks.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleDownloadAll}
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-extrabold shadow-lg shadow-emerald-500/20 transition transform active:scale-95"
            >
              <Download className="w-5 h-5" />
              <span>Download All 4 Files</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4-Step Visual Roadmap for Non-Coders */}
      <div>
        <div className="text-center max-w-xl mx-auto mb-8">
          <h2 className="text-2xl font-bold text-white">4 Simple Steps to Run on Your Laptop</h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Follow this visual guide step-by-step. Even if you've never touched a line of code, you will have it running in under 3 minutes.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Step 1 */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 hover:border-indigo-500/50 transition shadow-lg relative flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 font-bold flex items-center justify-center text-sm">
                1
              </div>
              <Laptop className="w-5 h-5 text-indigo-400" />
            </div>
            <h3 className="text-base font-bold text-white">Install Python</h3>
            <p className="text-xs text-slate-400 mt-1 flex-1">
              Download Python from python.org. Run the installer.
            </p>
            <div className="mt-3 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-300">
              <span className="font-bold block">⚠️ MUST CHECK THIS BOX:</span>
              <span>"Add python.exe to PATH" at the bottom of the first screen!</span>
            </div>
            <a
              href="https://www.python.org/downloads/"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-indigo-400 hover:text-indigo-300 py-1"
            >
              <span>Download Python</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* Step 2 */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 hover:border-indigo-500/50 transition shadow-lg relative flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 font-bold flex items-center justify-center text-sm">
                2
              </div>
              <Key className="w-5 h-5 text-indigo-400" />
            </div>
            <h3 className="text-base font-bold text-white">Get Gemini API Key</h3>
            <p className="text-xs text-slate-400 mt-1 flex-1">
              Visit Google AI Studio. Click "Create API Key" and copy the key (it starts with <code className="text-indigo-300">AIza...</code>).
            </p>
            <div className="mt-3 p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-300">
              <span className="text-emerald-400 font-semibold">100% Free:</span> Google gives generous daily free quotas for personal use.
            </div>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-indigo-400 hover:text-indigo-300 py-1"
            >
              <span>Google AI Studio Key</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* Step 3 */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 hover:border-indigo-500/50 transition shadow-lg relative flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 font-bold flex items-center justify-center text-sm">
                3
              </div>
              <FolderPlus className="w-5 h-5 text-indigo-400" />
            </div>
            <h3 className="text-base font-bold text-white">Create Folder</h3>
            <p className="text-xs text-slate-400 mt-1 flex-1">
              Create a new folder on your Desktop (e.g. <code className="text-indigo-300">OmniAgent</code>) and place the downloaded files inside it.
            </p>
            <div className="mt-3 p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-300 font-mono">
              Desktop/OmniAgent/<br />
              ├── app.py<br />
              ├── requirements.txt<br />
              └── run_agent.bat
            </div>
          </div>

          {/* Step 4 */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 hover:border-indigo-500/50 transition shadow-lg relative flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-sm">
                4
              </div>
              <Play className="w-5 h-5 text-emerald-400" />
            </div>
            <h3 className="text-base font-bold text-white">Double-Click & Run!</h3>
            <p className="text-xs text-slate-400 mt-1 flex-1">
              Simply double-click <code className="text-emerald-400">run_agent.bat</code>!
            </p>
            <div className="mt-3 p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-[11px] text-emerald-300">
              <span className="font-bold">Automated Magic:</span> The batch file installs packages and opens the agent in your browser!
            </div>
          </div>
        </div>
      </div>

      {/* Code Inspector & Download Section */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
        {/* Code Tabs Header */}
        <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <button
              onClick={() => setActiveCodeTab('streamlit')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeCodeTab === 'streamlit'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>app.py (Streamlit Web App)</span>
            </button>

            <button
              onClick={() => setActiveCodeTab('cli')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeCodeTab === 'cli'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>agent_cli.py (Terminal App)</span>
            </button>

            <button
              onClick={() => setActiveCodeTab('reqs')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeCodeTab === 'reqs'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <span>requirements.txt</span>
            </button>

            <button
              onClick={() => setActiveCodeTab('batch')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeCodeTab === 'batch'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <span>run_agent.bat</span>
            </button>

            <button
              onClick={() => setActiveCodeTab('readme')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeCodeTab === 'readme'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <span>README.md</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleCopy(getCurrentCode(), activeCodeTab)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            >
              {copiedTab === activeCodeTab ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Code</span>
                </>
              )}
            </button>

            <button
              onClick={() => handleDownloadFile(getCurrentFilename(), getCurrentCode())}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download {getCurrentFilename()}</span>
            </button>
          </div>
        </div>

        {/* Code View Area */}
        <div className="p-4 bg-slate-950 font-mono text-xs text-slate-300 max-h-[500px] overflow-y-auto overflow-x-auto leading-relaxed">
          <pre>
            <code>{getCurrentCode() || 'Loading Python source code...'}</code>
          </pre>
        </div>
      </div>

      {/* Non-Coder FAQ & Troubleshooting */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
        <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
          <HelpCircle className="w-5 h-5 text-indigo-400" />
          Common Non-Coder Questions & Troubleshooting
        </h3>

        <div className="space-y-3">
          {faqs.map((faq, index) => {
            const isOpen = openFaq === index;
            return (
              <div
                key={index}
                className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/80 transition"
              >
                <button
                  onClick={() => setOpenFaq(isOpen ? null : index)}
                  className="w-full text-left px-4 py-3 text-sm font-semibold text-slate-200 flex items-center justify-between gap-3 hover:text-white"
                >
                  <span>{faq.q}</span>
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  )}
                </button>
                {isOpen && (
                  <div className="px-4 pb-3.5 text-xs text-slate-400 leading-relaxed border-t border-slate-800/80 pt-2.5">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

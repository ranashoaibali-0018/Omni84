import React, { useState } from 'react';
import {
  Briefcase,
  Search,
  Sparkles,
  ExternalLink,
  Code2,
  Copy,
  Check,
  Download,
  Filter,
  DollarSign,
  TrendingUp,
  X,
  FileSpreadsheet,
  BrainCircuit,
  ClipboardCheck,
  CheckSquare,
  Globe,
  Smartphone,
  PlaySquare,
  PenTool,
  Languages,
  Mic2,
  Palette,
  Film,
  Share2,
  UserCheck,
  GraduationCap,
  Code,
  TerminalSquare,
  Mic,
  Headphones,
  Box,
  Video,
  Headset,
  ShoppingBag,
  Store,
  Tag,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { FREELANCE_TASKS, FreelanceTask } from '../data/freelanceTasks';
import { ProposedAction } from '../types/agent';

interface FreelanceHubProps {
  onExecutePromptInStudio: (prompt: string, mode: 'general' | 'research' | 'youtube' | 'content' | 'email') => void;
  onRequestSave: (action: ProposedAction) => void;
}

export const FreelanceHub: React.FC<FreelanceHubProps> = ({
  onExecutePromptInStudio,
  onRequestSave,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTaskForScript, setSelectedTaskForScript] = useState<FreelanceTask | null>(null);
  const [copiedScript, setCopiedScript] = useState(false);

  // Proposal modal state
  const [proposalModalTask, setProposalModalTask] = useState<FreelanceTask | null>(null);
  const [clientName, setClientName] = useState('');
  const [clientJobDescription, setClientJobDescription] = useState('');
  const [generatedProposal, setGeneratedProposal] = useState<string | null>(null);
  const [isGeneratingProposal, setIsGeneratingProposal] = useState(false);
  const [copiedProposal, setCopiedProposal] = useState(false);

  // Filter tasks
  const filteredTasks = FREELANCE_TASKS.filter((task) => {
    const matchesCategory =
      selectedCategory === 'all' || task.category === selectedCategory;
    const matchesSearch =
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.romanUrduDesc.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.aiSuperpower.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.platforms.some((p) => p.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesCategory && matchesSearch;
  });

  const categories = [
    { id: 'all', label: 'All 30 Tasks' },
    { id: 'data_entry', label: 'Data & Admin (4)' },
    { id: 'ai_annotation', label: 'AI & Data Training (4)' },
    { id: 'testing_micro', label: 'Testing & Micro Tasks (5)' },
    { id: 'content_writing', label: 'Content & Writing (4)' },
    { id: 'media_creative', label: 'Creative & Media (5)' },
    { id: 'marketing_sales', label: 'Marketing & E-commerce (5)' },
    { id: 'tech_dev', label: 'Tech & Development (3)' },
  ];

  // Helper for rendering icons
  const renderIcon = (name: string) => {
    const props = { className: 'w-5 h-5 text-indigo-400' };
    switch (name) {
      case 'FileSpreadsheet': return <FileSpreadsheet {...props} />;
      case 'Copy': return <Copy {...props} />;
      case 'ClipboardCheck': return <ClipboardCheck {...props} />;
      case 'CheckSquare': return <CheckSquare {...props} />;
      case 'Tag': return <Tag {...props} />;
      case 'BrainCircuit': return <BrainCircuit {...props} />;
      case 'Globe': return <Globe {...props} />;
      case 'Smartphone': return <Smartphone {...props} />;
      case 'PlaySquare': return <PlaySquare {...props} />;
      case 'PenTool': return <PenTool {...props} />;
      case 'Languages': return <Languages {...props} />;
      case 'Mic2': return <Mic2 {...props} />;
      case 'Palette': return <Palette {...props} />;
      case 'Film': return <Film {...props} />;
      case 'Share2': return <Share2 {...props} />;
      case 'UserCheck': return <UserCheck {...props} />;
      case 'Briefcase': return <Briefcase {...props} />;
      case 'GraduationCap': return <GraduationCap {...props} />;
      case 'Code': return <Code {...props} />;
      case 'TerminalSquare': return <TerminalSquare {...props} />;
      case 'TrendingUp': return <TrendingUp {...props} />;
      case 'Search': return <Search {...props} />;
      case 'Mic': return <Mic {...props} />;
      case 'Headphones': return <Headphones {...props} />;
      case 'Box': return <Box {...props} />;
      case 'Sparkles': return <Sparkles {...props} />;
      case 'Video': return <Video {...props} />;
      case 'Headset': return <Headset {...props} />;
      case 'ShoppingBag': return <ShoppingBag {...props} />;
      case 'Store': return <Store {...props} />;
      default: return <Briefcase {...props} />;
    }
  };

  const handleCopyScript = (script: string) => {
    navigator.clipboard.writeText(script);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2000);
  };

  const handleDownloadScript = (task: FreelanceTask) => {
    const filename = `automate_${task.id.replace(/-/g, '_')}.py`;
    const blob = new Blob([task.pythonSnippet], { type: 'text/x-python;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleGenerateProposal = async () => {
    if (!proposalModalTask || isGeneratingProposal) return;
    setIsGeneratingProposal(true);
    setGeneratedProposal(null);

    try {
      const promptText = `Generate a high-converting, professional Upwork / Fiverr client proposal for the following freelance gig:
GIG SERVICE: ${proposalModalTask.title} (${proposalModalTask.romanUrduDesc})
CLIENT NAME: ${clientName || 'Hiring Manager'}
JOB DETAILS: ${clientJobDescription || 'Standard professional deliverables for ' + proposalModalTask.title}

REQUIREMENTS:
- Catchy hook in the first 2 sentences proving understanding of their specific pain point.
- 3 clear steps on how I will execute this with 100% accuracy and speed.
- Relevant previous experience highlight.
- Clear, confident Call to Action (CTA) asking for a quick 5-minute chat.
- Polite, human, non-generic tone.`;

      const res = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptText,
          mode: 'email',
          useLiveSearch: false,
        }),
      });

      const data = await res.json();
      if (res.ok && data.text) {
        setGeneratedProposal(data.text);
      } else {
        setGeneratedProposal('Failed to generate proposal: ' + (data.error || 'Server error'));
      }
    } catch (e: any) {
      setGeneratedProposal('Error: ' + e.message);
    } finally {
      setIsGeneratingProposal(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="relative rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950/80 to-slate-900 border border-indigo-500/30 p-8 shadow-2xl overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 mb-3">
              <Briefcase className="w-3.5 h-3.5" />
              Complete 30 Online Work & Freelancing Master Directory
            </span>
            <h1 className="text-3xl font-extrabold text-white tracking-tight sm:text-4xl">
              Micro-Tasks & Freelancing AI Accelerator
            </h1>
            <p className="text-slate-300 text-sm sm:text-base mt-2 leading-relaxed">
              Every single one of your 30 online tasks—from <strong>Data Entry</strong> and <strong>Excel Work</strong> to <strong>AI Data Training</strong>, <strong>SEO</strong>, and <strong>Video Editing</strong>—can be accelerated 10x using OmniAgent. Select any task to run live AI execution, generate client proposals, or grab ready-to-use Python automation scripts.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 text-center">
              <span className="text-2xl font-black text-indigo-400">30 / 30</span>
              <span className="block text-xs text-slate-400 font-medium">Tasks Automated</span>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Category Filter Controls */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tasks (e.g., 'Excel', 'Data Entry', 'Survey', 'AI Training')..."
              className="w-full bg-slate-900/90 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 text-xs"
              >
                Clear
              </button>
            )}
          </div>

          <div className="text-xs text-slate-400 flex items-center gap-2 self-start sm:self-auto">
            <Filter className="w-3.5 h-3.5 text-indigo-400" />
            <span>Showing {filteredTasks.length} of 30 freelance skills</span>
          </div>
        </div>

        {/* Categories Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none text-xs">
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex-shrink-0 px-3.5 py-1.5 rounded-xl font-medium transition ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tasks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredTasks.map((task) => (
          <div
            key={task.id}
            className="group bg-slate-900/80 border border-slate-800 hover:border-indigo-500/50 rounded-2xl p-5 shadow-lg transition-all flex flex-col justify-between hover:shadow-indigo-500/5"
          >
            <div>
              {/* Card Top: Number, Category, Earning */}
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-400 text-xs font-bold flex items-center justify-center">
                  #{task.number}
                </span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                  {task.categoryLabel}
                </span>
                <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-0.5">
                  <DollarSign className="w-3 h-3" />
                  {task.earningPotential}
                </span>
              </div>

              {/* Title & Roman Urdu Description */}
              <div className="flex items-start gap-3 mb-3">
                <div className="p-2.5 rounded-xl bg-slate-800/80 group-hover:bg-indigo-600 group-hover:text-white transition mt-0.5">
                  {renderIcon(task.iconName)}
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-white group-hover:text-indigo-300 transition">
                    {task.title}
                  </h3>
                  <p className="text-xs font-semibold text-amber-400/90 mt-0.5">
                    {task.romanUrduDesc}
                  </p>
                </div>
              </div>

              {/* AI Superpower info */}
              <div className="my-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs text-slate-300 space-y-1">
                <span className="text-[10px] uppercase font-bold text-indigo-400 block tracking-wider">
                  How OmniAgent Accelerates It:
                </span>
                <p className="leading-relaxed text-[11px] text-slate-300">
                  {task.aiSuperpower}
                </p>
              </div>

              {/* Earning Platforms */}
              <div className="mb-4">
                <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                  Top Earning Platforms:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {task.platforms.map((p, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-800/80 text-slate-300 border border-slate-700/50"
                    >
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center gap-2">
              {/* Run in Agent Studio button */}
              <button
                onClick={() => {
                  const targetMode =
                    task.category === 'content_writing'
                      ? 'content'
                      : task.id === 'lead-generation' || task.id === 'customer-support'
                      ? 'email'
                      : task.category === 'marketing_sales'
                      ? 'research'
                      : 'general';
                  onExecutePromptInStudio(task.samplePrompt, targetMode);
                }}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 transition active:scale-95"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Run with AI</span>
              </button>

              {/* Client Proposal Generator button */}
              <button
                title="Generate Client Proposal / Pitch"
                onClick={() => {
                  setProposalModalTask(task);
                  setClientName('');
                  setClientJobDescription('');
                  setGeneratedProposal(null);
                }}
                className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
              >
                Proposal
              </button>

              {/* Python Snippet Button */}
              <button
                title="View Python Automation Script"
                onClick={() => setSelectedTaskForScript(task)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 hover:text-amber-300 transition"
              >
                <Code2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal 1: Python Automation Snippet */}
      {selectedTaskForScript && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400">
                  <Code2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Python Automation for {selectedTaskForScript.title}
                  </h3>
                  <p className="text-xs text-amber-300 font-medium">
                    {selectedTaskForScript.romanUrduDesc}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedTaskForScript(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-xs text-slate-300 leading-relaxed">
                You can copy or download this script and run it inside your local Python environment to automate or batch-process this task on Windows:
              </p>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs text-slate-200 overflow-x-auto max-h-72 whitespace-pre-wrap leading-relaxed">
                {selectedTaskForScript.pythonSnippet}
              </div>
            </div>

            <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-end gap-2">
              <button
                onClick={() => handleCopyScript(selectedTaskForScript.pythonSnippet)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              >
                {copiedScript ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedScript ? 'Copied' : 'Copy Code'}</span>
              </button>

              <button
                onClick={() => handleDownloadScript(selectedTaskForScript)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-500 text-slate-950 transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download .py Script</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Client Proposal / Upwork & Fiverr Pitch Generator */}
      {proposalModalTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Client Proposal Generator: {proposalModalTask.title}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Draft a winning Upwork/Fiverr bid proposal powered by Gemini
                  </p>
                </div>
              </div>
              <button
                onClick={() => setProposalModalTask(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Client Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="e.g. John, Alex, Marketing Lead"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Target Platform
                  </label>
                  <div className="text-xs text-slate-300 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span>Upwork / Fiverr / Direct Outreach</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Client's Job Description / Requirements (Optional)
                </label>
                <textarea
                  rows={2}
                  value={clientJobDescription}
                  onChange={(e) => setClientJobDescription(e.target.value)}
                  placeholder={`Paste any details from the client's job post for ${proposalModalTask.title}...`}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                />
              </div>

              <button
                onClick={handleGenerateProposal}
                disabled={isGeneratingProposal}
                className="w-full py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isGeneratingProposal ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                <span>{isGeneratingProposal ? 'Generating Winning Proposal...' : 'Generate Proposal with Gemini'}</span>
              </button>

              {generatedProposal && (
                <div className="mt-4 pt-3 border-t border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="font-semibold text-indigo-300">Generated Proposal:</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(generatedProposal);
                        setCopiedProposal(true);
                        setTimeout(() => setCopiedProposal(false), 2000);
                      }}
                      className="flex items-center gap-1 hover:text-white transition"
                    >
                      {copiedProposal ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedProposal ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs text-slate-200 whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
                    {generatedProposal}
                  </div>

                  {/* Save to File (triggers Critical Action Confirmation!) */}
                  <button
                    onClick={() => {
                      onRequestSave({
                        action: 'save_file',
                        filename: `proposal_${proposalModalTask.id}.md`,
                        type: 'email',
                        format: 'markdown',
                        content: generatedProposal,
                        sizeBytes: new Blob([generatedProposal]).size,
                        preview: generatedProposal.slice(0, 200) + '...',
                      });
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 transition"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                    <span>Save Proposal to File (Requires Yes/No)</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect, useRef } from 'react';
import {
  Bot,
  ShieldCheck,
  Globe,
  Terminal,
  FolderArchive,
  Sparkles,
  Briefcase,
  Layers,
  Users,
  Wrench,
  Zap,
  Search,
  X,
  FileSpreadsheet,
  FileText,
  FileCode,
  Archive,
  CheckCircle2,
  Loader2,
  ChevronRight,
  Command,
  ArrowRight,
  Clock,
  History,
  Trash2,
  RotateCcw,
  Wand2,
} from 'lucide-react';
import { AgentDefinition, SavedFileItem, TaskExecutionRecord } from '../types/agent';

export type AppTab = 'workforce' | 'my-ai-work' | 'image-studio' | 'agents' | 'tools' | 'studio' | 'tasks' | 'files' | 'python-hub';

interface HeaderProps {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  savedFilesCount: number;
  useLiveSearch: boolean;
  toggleLiveSearch: () => void;
  agents: AgentDefinition[];
  savedFiles: SavedFileItem[];
  recentTasks: TaskExecutionRecord[];
  onSelectAgentFromSearch: (agentId: string) => void;
  onSelectFileFromSearch: (fileId: string) => void;
  onSelectTaskFromSearch: (taskId: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  savedFilesCount,
  useLiveSearch,
  toggleLiveSearch,
  agents = [],
  savedFiles = [],
  recentTasks = [],
  onSelectAgentFromSearch,
  onSelectFileFromSearch,
  onSelectTaskFromSearch,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchFilter, setSearchFilter] = useState<'all' | 'agents' | 'files' | 'tasks'>('all');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Recent Searches state with localStorage persistence
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('omniagent_recent_searches');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.filter((item) => typeof item === 'string' && item.trim().length > 0);
        }
      }
    } catch {
      // Fallback
    }
    return [
      'Nano Banana Image Studio',
      'Autonomous Web Developer',
      'Meta Ads Campaign',
      'SEO Audit & Keywords',
      'Excel Data Entry',
      'YouTube Video Script',
    ];
  });

  const saveRecentSearch = (term: string) => {
    const clean = term.trim();
    if (!clean) return;
    setRecentSearches((prev) => {
      const next = [clean, ...prev.filter((item) => item.toLowerCase() !== clean.toLowerCase())].slice(0, 8);
      try {
        localStorage.setItem('omniagent_recent_searches', JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const removeRecentSearch = (termToRemove: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRecentSearches((prev) => {
      const next = prev.filter((item) => item !== termToRemove);
      try {
        localStorage.setItem('omniagent_recent_searches', JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const clearRecentSearches = (e: React.MouseEvent) => {
    e.stopPropagation();
    setRecentSearches([]);
    try {
      localStorage.removeItem('omniagent_recent_searches');
    } catch {
      // ignore
    }
  };

  const handleSelectRecentSearch = (term: string) => {
    setSearchQuery(term);
    saveRecentSearch(term);
    setIsSearchOpen(true);
    searchInputRef.current?.focus();
  };

  // Global Keyboard Shortcut: Ctrl+K or Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
        setTimeout(() => searchInputRef.current?.focus(), 50);
      } else if (e.key === 'Escape') {
        setIsSearchOpen(false);
        searchInputRef.current?.blur();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Click outside listener to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter calculations
  const query = searchQuery.trim().toLowerCase();

  const matchedAgents = agents.filter((a) => {
    if (!query) return true;
    return (
      a.name.toLowerCase().includes(query) ||
      a.role.toLowerCase().includes(query) ||
      a.category.toLowerCase().includes(query) ||
      a.description.toLowerCase().includes(query) ||
      a.tools.some((t) => t.toLowerCase().includes(query))
    );
  });

  const matchedFiles = savedFiles.filter((f) => {
    if (!query) return true;
    return (
      f.name.toLowerCase().includes(query) ||
      f.format.toLowerCase().includes(query) ||
      f.type.toLowerCase().includes(query)
    );
  });

  const matchedTasks = recentTasks.filter((t) => {
    if (!query) return true;
    return (
      t.userPrompt.toLowerCase().includes(query) ||
      t.planOverview.toLowerCase().includes(query) ||
      t.id.toLowerCase().includes(query) ||
      t.assignedAgentId.toLowerCase().includes(query) ||
      t.verifiedDeliverables.some((d) => d.title.toLowerCase().includes(query) || d.filename.toLowerCase().includes(query))
    );
  });

  const matchingRecentSearches = recentSearches.filter((item) =>
    item.toLowerCase().includes(query) && item.toLowerCase() !== query
  );

  const totalMatches =
    (searchFilter === 'all' || searchFilter === 'agents' ? (query ? matchedAgents.length : Math.min(matchedAgents.length, 3)) : 0) +
    (searchFilter === 'all' || searchFilter === 'files' ? (query ? matchedFiles.length : Math.min(matchedFiles.length, 3)) : 0) +
    (searchFilter === 'all' || searchFilter === 'tasks' ? (query ? matchedTasks.length : Math.min(matchedTasks.length, 3)) : 0);

  const handleSelectAgent = (agentId: string) => {
    if (searchQuery.trim()) {
      saveRecentSearch(searchQuery.trim());
    }
    onSelectAgentFromSearch(agentId);
    setIsSearchOpen(false);
    setSearchQuery('');
  };

  const handleSelectFile = (fileId: string) => {
    if (searchQuery.trim()) {
      saveRecentSearch(searchQuery.trim());
    }
    onSelectFileFromSearch(fileId);
    setIsSearchOpen(false);
    setSearchQuery('');
  };

  const handleSelectTask = (taskId: string) => {
    if (searchQuery.trim()) {
      saveRecentSearch(searchQuery.trim());
    }
    onSelectTaskFromSearch(taskId);
    setIsSearchOpen(false);
    setSearchQuery('');
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur-md border-b border-slate-800/80 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Row: Logo, Global Search Bar, and Live Controls */}
        <div className="flex items-center justify-between h-16 gap-3 sm:gap-4">
          {/* Logo & Identity */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="relative p-2.5 rounded-2xl bg-gradient-to-tr from-indigo-600 via-blue-600 to-cyan-500 shadow-lg shadow-indigo-500/20 text-white">
              <Bot className="w-5 h-5" />
              <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-slate-950 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg sm:text-xl tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                  OmniAgent
                </span>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  AI Workforce Pro
                </span>
              </div>
            </div>
          </div>

          {/* GLOBAL SEARCH BAR */}
          <div ref={searchContainerRef} className="relative flex-1 max-w-xl mx-2">
            <div
              className={`relative flex items-center bg-slate-900 border rounded-2xl transition-all shadow-inner ${
                isSearchOpen
                  ? 'border-indigo-500/80 ring-2 ring-indigo-500/20 bg-slate-900'
                  : 'border-slate-800 hover:border-slate-700 bg-slate-900/90'
              }`}
            >
              <Search className="w-4 h-4 text-slate-400 ml-3.5 flex-shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onFocus={() => setIsSearchOpen(true)}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (!isSearchOpen) setIsSearchOpen(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && searchQuery.trim()) {
                    saveRecentSearch(searchQuery.trim());
                  }
                }}
                placeholder="Global search across 12 agents, files, recent tasks..."
                className="w-full bg-transparent px-3 py-2 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
              />

              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    searchInputRef.current?.focus();
                  }}
                  className="p-1 mr-1 text-slate-400 hover:text-white rounded-lg transition"
                  title="Clear input"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}

              <div className="hidden sm:flex items-center pr-3 pointer-events-none">
                <kbd className="inline-flex items-center gap-0.5 px-2 py-0.5 text-[10px] font-mono font-medium text-slate-400 bg-slate-950 rounded border border-slate-800">
                  <span className="text-xs">⌘</span>K
                </kbd>
              </div>
            </div>

            {/* GLOBAL SEARCH SPOTLIGHT DROPDOWN */}
            {isSearchOpen && (
              <div className="absolute left-0 right-0 top-full mt-2 bg-slate-900/98 backdrop-blur-xl border border-slate-800 rounded-3xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                {/* Search Category Filter Pills */}
                <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950/90 border-b border-slate-800/80 text-xs">
                  <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
                    <button
                      onClick={() => setSearchFilter('all')}
                      className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                        searchFilter === 'all'
                          ? 'bg-indigo-600 text-white'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      All
                    </button>
                    <button
                      onClick={() => setSearchFilter('agents')}
                      className={`px-2.5 py-1 rounded-lg font-semibold transition flex items-center gap-1 ${
                        searchFilter === 'agents'
                          ? 'bg-indigo-600 text-white'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Users className="w-3 h-3" />
                      <span>Agents ({matchedAgents.length})</span>
                    </button>
                    <button
                      onClick={() => setSearchFilter('files')}
                      className={`px-2.5 py-1 rounded-lg font-semibold transition flex items-center gap-1 ${
                        searchFilter === 'files'
                          ? 'bg-indigo-600 text-white'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <FolderArchive className="w-3 h-3" />
                      <span>Files ({matchedFiles.length})</span>
                    </button>
                    <button
                      onClick={() => setSearchFilter('tasks')}
                      className={`px-2.5 py-1 rounded-lg font-semibold transition flex items-center gap-1 ${
                        searchFilter === 'tasks'
                          ? 'bg-indigo-600 text-white'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Zap className="w-3 h-3" />
                      <span>Tasks ({matchedTasks.length})</span>
                    </button>
                  </div>

                  <span className="text-[11px] text-slate-500 font-mono hidden sm:inline">
                    ESC to close
                  </span>
                </div>

                {/* Results List */}
                <div className="max-h-96 overflow-y-auto p-3 space-y-3.5">
                  {/* RECENT SEARCHES PANEL (Prominently displayed when input is focused or when past searches exist) */}
                  {!query && recentSearches.length > 0 && (
                    <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80 shadow-sm">
                      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800/60">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
                          <History className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Recent Searches</span>
                          <span className="text-[10px] text-slate-500 font-mono">({recentSearches.length})</span>
                        </div>
                        <button
                          type="button"
                          onClick={clearRecentSearches}
                          className="text-[11px] text-slate-400 hover:text-rose-400 transition flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-slate-900"
                          title="Clear all recent searches"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Clear All</span>
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {recentSearches.map((item) => (
                          <div
                            key={item}
                            onClick={() => handleSelectRecentSearch(item)}
                            className="group flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-xl bg-slate-900/90 hover:bg-indigo-600/20 border border-slate-800 hover:border-indigo-500/40 text-xs text-slate-300 hover:text-white cursor-pointer transition shadow-sm"
                            title={`Click to re-run: "${item}"`}
                          >
                            <Clock className="w-3 h-3 text-slate-500 group-hover:text-indigo-400 flex-shrink-0" />
                            <span className="font-medium truncate max-w-[150px] sm:max-w-[210px]">{item}</span>
                            <button
                              type="button"
                              onClick={(e) => removeRecentSearch(item, e)}
                              className="p-0.5 text-slate-500 hover:text-rose-400 rounded hover:bg-slate-800 transition"
                              title="Remove search"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Matching Recent Searches quick-strip when user is actively typing */}
                  {query && matchingRecentSearches.length > 0 && (
                    <div className="flex items-center gap-1.5 pb-2 border-b border-slate-800/60 overflow-x-auto scrollbar-none text-xs">
                      <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1 flex-shrink-0 uppercase tracking-wider">
                        <History className="w-3 h-3 text-indigo-400" />
                        <span>Past Searches:</span>
                      </span>
                      {matchingRecentSearches.map((item) => (
                        <button
                          key={item}
                          type="button"
                          onClick={() => handleSelectRecentSearch(item)}
                          className="px-2 py-0.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 text-[11px] font-medium flex items-center gap-1 flex-shrink-0 transition"
                          title={`Re-run: "${item}"`}
                        >
                          <RotateCcw className="w-2.5 h-2.5" />
                          <span>{item}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {totalMatches === 0 ? (
                    <div className="p-6 text-center text-slate-400 text-xs space-y-3">
                      <Search className="w-8 h-8 text-slate-600 mx-auto" />
                      <div>
                        <p className="font-semibold text-slate-300">
                          No results found for "{searchQuery}"
                        </p>
                        <p className="text-slate-500 text-[11px] mt-1">
                          Try searching for an agent role, document format (.xlsx, .py), or task keyword.
                        </p>
                      </div>
                      {recentSearches.length > 0 && (
                        <div className="pt-3 border-t border-slate-800/80 text-left">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                              <History className="w-3 h-3 text-indigo-400" />
                              <span>Or re-run a recent query:</span>
                            </span>
                            <button
                              type="button"
                              onClick={clearRecentSearches}
                              className="text-[10px] text-slate-500 hover:text-rose-400 transition flex items-center gap-1"
                            >
                              <Trash2 className="w-2.5 h-2.5" />
                              <span>Clear</span>
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {recentSearches.map((item) => (
                              <button
                                key={item}
                                type="button"
                                onClick={() => handleSelectRecentSearch(item)}
                                className="px-2.5 py-1 rounded-xl bg-slate-950 hover:bg-indigo-600/20 border border-slate-800 hover:border-indigo-500/40 text-xs text-slate-300 hover:text-white transition flex items-center gap-1.5"
                              >
                                <Clock className="w-3 h-3 text-slate-500" />
                                <span>{item}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      {/* Section: AGENTS */}
                      {(searchFilter === 'all' || searchFilter === 'agents') && matchedAgents.length > 0 && (
                        <div className="space-y-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 flex items-center justify-between">
                            <span>Specialized Autonomous Agents</span>
                            <span>{matchedAgents.length}</span>
                          </span>
                          <div className="space-y-1">
                            {(query ? matchedAgents : matchedAgents.slice(0, 3)).map((agent) => (
                              <div
                                key={agent.id}
                                onClick={() => handleSelectAgent(agent.id)}
                                className="group cursor-pointer p-2.5 rounded-xl bg-slate-950/60 hover:bg-indigo-600/20 border border-slate-800/80 hover:border-indigo-500/40 transition flex items-center justify-between gap-3"
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition">
                                    <Bot className="w-4 h-4" />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-xs font-bold text-white group-hover:text-indigo-300 truncate">
                                      {agent.name}
                                    </p>
                                    <p className="text-[10px] text-slate-400 truncate">
                                      {agent.role} • <span className="text-indigo-400">{agent.category}</span>
                                    </p>
                                  </div>
                                </div>
                                <span className="text-[10px] font-semibold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20 flex items-center gap-1">
                                  <span>Deploy</span>
                                  <ArrowRight className="w-3 h-3" />
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Section: FILES & ARTIFACTS */}
                      {(searchFilter === 'all' || searchFilter === 'files') && matchedFiles.length > 0 && (
                        <div className="space-y-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 flex items-center justify-between">
                            <span>Saved Files & Artifacts</span>
                            <span>{matchedFiles.length}</span>
                          </span>
                          <div className="space-y-1">
                            {(query ? matchedFiles : matchedFiles.slice(0, 3)).map((file) => (
                              <div
                                key={file.id}
                                onClick={() => handleSelectFile(file.id)}
                                className="group cursor-pointer p-2.5 rounded-xl bg-slate-950/60 hover:bg-emerald-600/20 border border-slate-800/80 hover:border-emerald-500/40 transition flex items-center justify-between gap-3"
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white transition">
                                    {file.name.endsWith('.xlsx') ? (
                                      <FileSpreadsheet className="w-4 h-4" />
                                    ) : file.name.endsWith('.docx') ? (
                                      <FileText className="w-4 h-4" />
                                    ) : file.name.endsWith('.zip') ? (
                                      <Archive className="w-4 h-4" />
                                    ) : file.name.endsWith('.py') ? (
                                      <FileCode className="w-4 h-4" />
                                    ) : (
                                      <FileText className="w-4 h-4" />
                                    )}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-xs font-bold text-white group-hover:text-emerald-300 truncate">
                                      {file.name}
                                    </p>
                                    <p className="text-[10px] text-slate-400">
                                      {(file.sizeBytes / 1024).toFixed(1)} KB • Format: .{file.format}
                                    </p>
                                  </div>
                                </div>
                                <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1">
                                  <span>View</span>
                                  <ArrowRight className="w-3 h-3" />
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Section: RECENT WORKFORCE TASKS */}
                      {(searchFilter === 'all' || searchFilter === 'tasks') && matchedTasks.length > 0 && (
                        <div className="space-y-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 flex items-center justify-between">
                            <span>Recent Workforce Tasks & Missions</span>
                            <span>{matchedTasks.length}</span>
                          </span>
                          <div className="space-y-1">
                            {(query ? matchedTasks : matchedTasks.slice(0, 3)).map((task) => (
                              <div
                                key={task.id}
                                onClick={() => handleSelectTask(task.id)}
                                className="group cursor-pointer p-2.5 rounded-xl bg-slate-950/60 hover:bg-cyan-600/20 border border-slate-800/80 hover:border-cyan-500/40 transition flex items-center justify-between gap-3"
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 group-hover:bg-cyan-600 group-hover:text-white transition">
                                    <Zap className="w-4 h-4" />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-xs font-bold text-white group-hover:text-cyan-300 truncate">
                                      "{task.userPrompt}"
                                    </p>
                                    <p className="text-[10px] text-slate-400 truncate">
                                      Agent: {task.assignedAgentId.replace('-agent', '')} • {task.steps.length} stages • {task.verifiedDeliverables.length} deliverables
                                    </p>
                                  </div>
                                </div>
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider flex items-center gap-1 ${
                                    task.status === 'completed'
                                      ? 'bg-emerald-500/20 text-emerald-300'
                                      : 'bg-indigo-500/20 text-indigo-300'
                                  }`}
                                >
                                  {task.status}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Status Controls */}
          <div className="hidden lg:flex items-center gap-2 flex-shrink-0">
            <button
              onClick={toggleLiveSearch}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                useLiveSearch
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Live Search</span>
              <span className={`w-2 h-2 rounded-full ${useLiveSearch ? 'bg-emerald-400' : 'bg-slate-600'}`} />
            </button>

            <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-amber-500/10 border border-amber-500/20 text-amber-300">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              <span>Shield Active</span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="pb-3 pt-1 border-t border-slate-800/60 overflow-x-auto scrollbar-none">
          <nav className="flex items-center gap-1.5 min-w-max">
            {/* Workforce Tab */}
            <button
              onClick={() => setActiveTab('workforce')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex-shrink-0 ${
                activeTab === 'workforce'
                  ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              <span>Workforce Hub</span>
            </button>

            {/* MY AI WORK Workspace */}
            <button
              onClick={() => setActiveTab('my-ai-work')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex-shrink-0 ${
                activeTab === 'my-ai-work'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-600/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>MY AI WORK</span>
            </button>

            {/* Create & Edit Images Studio */}
            <button
              onClick={() => setActiveTab('image-studio')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex-shrink-0 ${
                activeTab === 'image-studio'
                  ? 'bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 text-white shadow-md shadow-purple-600/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Wand2 className="w-3.5 h-3.5 text-purple-400" />
              <span>Image Studio (Nano Banana 2.1)</span>
            </button>

            {/* 12 Agents Directory */}
            <button
              onClick={() => setActiveTab('agents')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition flex-shrink-0 ${
                activeTab === 'agents'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>12 Agents</span>
            </button>

            {/* Tool Registry */}
            <button
              onClick={() => setActiveTab('tools')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition flex-shrink-0 ${
                activeTab === 'tools'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>Tools (10)</span>
            </button>

            {/* Studio */}
            <button
              onClick={() => setActiveTab('studio')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition flex-shrink-0 ${
                activeTab === 'studio'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Assistant Studio</span>
            </button>

            {/* 30 Tasks */}
            <button
              onClick={() => setActiveTab('tasks')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition flex-shrink-0 ${
                activeTab === 'tasks'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>30 Freelance Tasks</span>
            </button>

            {/* Files */}
            <button
              onClick={() => setActiveTab('files')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition flex-shrink-0 ${
                activeTab === 'files'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <FolderArchive className="w-3.5 h-3.5" />
              <span>Saved Files</span>
              {savedFilesCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 bg-slate-800 text-slate-300 text-[10px] font-bold rounded-full">
                  {savedFilesCount}
                </span>
              )}
            </button>

            {/* Python Windows Hub */}
            <button
              onClick={() => setActiveTab('python-hub')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition flex-shrink-0 ${
                activeTab === 'python-hub'
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Terminal className="w-3.5 h-3.5 text-amber-400" />
              <span>Windows Python</span>
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
};

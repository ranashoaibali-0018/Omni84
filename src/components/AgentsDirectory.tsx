import React, { useState } from 'react';
import {
  Users,
  Search,
  Wrench,
  Package,
  Layers,
  ArrowRight,
  Filter,
  CheckCircle2,
  Code,
  Globe,
  Palette,
  Video,
  TrendingUp,
  Target,
  Briefcase,
  BarChart2,
  FileText,
  Mail,
} from 'lucide-react';
import { AgentDefinition } from '../types/agent';

interface AgentsDirectoryProps {
  agents: AgentDefinition[];
  onDeployAgent: (agentId: string) => void;
}

export const AgentsDirectory: React.FC<AgentsDirectoryProps> = ({ agents, onDeployAgent }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = ['all', 'Coordination', 'Research', 'Engineering', 'Creative', 'Marketing', 'Strategy', 'Data', 'Office', 'Communications'];

  const filteredAgents = agents.filter((agent) => {
    const matchesCat = selectedCategory === 'all' || agent.category.toLowerCase() === selectedCategory.toLowerCase();
    const matchesSearch =
      agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.tools.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesCat && matchesSearch;
  });

  const renderIcon = (iconName: string) => {
    const props = { className: 'w-6 h-6 text-indigo-400' };
    switch (iconName) {
      case 'Layers': return <Layers {...props} />;
      case 'Search': return <Search {...props} />;
      case 'Globe': return <Globe {...props} />;
      case 'Code': return <Code {...props} />;
      case 'Palette': return <Palette {...props} />;
      case 'Video': return <Video {...props} />;
      case 'TrendingUp': return <TrendingUp {...props} />;
      case 'Target': return <Target {...props} />;
      case 'Briefcase': return <Briefcase {...props} />;
      case 'BarChart2': return <BarChart2 {...props} />;
      case 'FileText': return <FileText {...props} />;
      case 'Mail': return <Mail {...props} />;
      default: return <Users {...props} />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-300">
      {/* Top Banner */}
      <div className="relative rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950/80 to-slate-900 border border-indigo-500/30 p-8 shadow-2xl overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 mb-3">
              <Users className="w-3.5 h-3.5 text-indigo-400" />
              <span>12 Specialized Autonomous Agents</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Autonomous AI Workforce Directory
            </h1>
            <p className="text-slate-300 text-sm sm:text-base mt-2 leading-relaxed">
              Explore your autonomous workforce. Each agent possesses dedicated system directives, domain expertise, access to registered tools, and verifiable deliverable outputs.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-4 py-2 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs font-bold text-emerald-400">
              12 Online & Ready
            </span>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search agents by role, skill, or tool..."
              className="w-full bg-slate-900/90 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <span className="text-xs text-slate-400">
            Showing {filteredAgents.length} of {agents.length} specialized agents
          </span>
        </div>

        {/* Categories */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-xl font-semibold capitalize transition ${
                selectedCategory === cat
                  ? 'bg-indigo-600 text-white shadow'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {cat === 'all' ? 'All Agents' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Agents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAgents.map((agent) => (
          <div
            key={agent.id}
            className="group bg-slate-900/80 border border-slate-800 hover:border-indigo-500/50 rounded-3xl p-6 shadow-xl transition-all flex flex-col justify-between hover:shadow-indigo-500/5"
          >
            <div>
              {/* Header */}
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="p-3 rounded-2xl bg-slate-800/80 group-hover:bg-indigo-600 group-hover:text-white transition">
                  {renderIcon(agent.icon)}
                </div>
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 uppercase tracking-wider">
                  {agent.category}
                </span>
              </div>

              <h3 className="text-lg font-bold text-white group-hover:text-indigo-300 transition">
                {agent.name}
              </h3>
              <p className="text-xs font-semibold text-indigo-400 mt-0.5">{agent.role}</p>

              <p className="text-xs text-slate-300 mt-3 leading-relaxed">{agent.description}</p>

              {/* Tools List */}
              <div className="mt-4 pt-3 border-t border-slate-800/80">
                <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1.5">
                  Available Registered Tools:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {agent.tools.map((t, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-950 text-indigo-300 border border-slate-800"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              {/* Deliverables */}
              <div className="mt-3">
                <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                  Primary Deliverables:
                </span>
                <div className="space-y-0.5">
                  {agent.deliverables.map((d, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 text-[11px] text-slate-400">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                      <span className="truncate">{d}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Action */}
            <div className="pt-4 mt-4 border-t border-slate-800">
              <button
                onClick={() => onDeployAgent(agent.id)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 transition active:scale-95"
              >
                <span>Deploy {agent.name}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

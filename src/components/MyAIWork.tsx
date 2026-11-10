import React, { useState, useEffect } from 'react';
import {
  FolderPlus,
  Play,
  Download,
  Plus,
  FileCode,
  FileText,
  Save,
  Trash2,
  Terminal,
  CheckCircle2,
  XCircle,
  Loader2,
  Sparkles,
  Layers,
  Archive,
  RefreshCw,
  Code,
  Tag,
  Check,
  Copy,
} from 'lucide-react';
import { AIProject, AIProjectFile, ProposedAction } from '../types/agent';

interface MyAIWorkProps {
  onRequestSaveAction: (action: ProposedAction) => void;
}

export const MyAIWork: React.FC<MyAIWorkProps> = ({ onRequestSaveAction }) => {
  const [projects, setProjects] = useState<AIProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<AIProject | null>(null);
  const [activeFile, setActiveFile] = useState<AIProjectFile | null>(null);
  const [fileContent, setFileContent] = useState('');
  const [isSavingFile, setIsSavingFile] = useState(false);
  const [isRunningCode, setIsRunningCode] = useState(false);
  const [runResult, setRunResult] = useState<any>(null);
  const [isExportingZip, setIsExportingZip] = useState(false);
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [isNewFileModalOpen, setIsNewFileModalOpen] = useState(false);

  // New Project Form
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [newProjectCategory, setNewProjectCategory] = useState<'ai_app' | 'agent' | 'automation' | 'saas' | 'research'>('ai_app');

  // New File Form
  const [newFileName, setNewFileName] = useState('');

  const loadProjects = async () => {
    try {
      const res = await fetch('/api/projects');
      const data = await res.json();
      if (data.projects) {
        setProjects(data.projects);
        if (!selectedProject && data.projects.length > 0) {
          setSelectedProject(data.projects[0]);
          if (data.projects[0].files.length > 0) {
            setActiveFile(data.projects[0].files[0]);
            setFileContent(data.projects[0].files[0].content);
          }
        }
      }
    } catch (e) {
      console.error('Failed to load projects:', e);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  // When active file changes
  useEffect(() => {
    if (activeFile) {
      setFileContent(activeFile.content);
      setRunResult(null);
    }
  }, [activeFile?.id]);

  // Create Project
  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newProjectName,
          description: newProjectDesc,
          category: newProjectCategory,
        }),
      });

      const data = await res.json();
      if (res.ok && data.project) {
        setProjects((prev) => [data.project, ...prev]);
        setSelectedProject(data.project);
        setActiveFile(data.project.files[0] || null);
        setFileContent(data.project.files[0]?.content || '');
        setIsNewProjectModalOpen(false);
        setNewProjectName('');
        setNewProjectDesc('');
      }
    } catch (err: any) {
      alert(`Error creating project: ${err.message}`);
    }
  };

  // Save active file content
  const handleSaveFile = async () => {
    if (!selectedProject || !activeFile) return;
    setIsSavingFile(true);

    try {
      const res = await fetch(`/api/projects/${selectedProject.id}/files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: activeFile.path,
          content: fileContent,
          language: activeFile.language,
        }),
      });

      const data = await res.json();
      if (res.ok && data.project) {
        setSelectedProject(data.project);
        const updatedFile = data.project.files.find((f: any) => f.path === activeFile.path);
        if (updatedFile) setActiveFile(updatedFile);
      }
    } catch (err: any) {
      alert(`Error saving file: ${err.message}`);
    } finally {
      setIsSavingFile(false);
    }
  };

  // Add new file to current project
  const handleAddNewFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || !newFileName.trim()) return;

    const pathName = newFileName.trim();
    const lang = pathName.endsWith('.py') ? 'python' : pathName.endsWith('.json') ? 'json' : 'markdown';
    const initialContent = lang === 'python' ? '# Python Module\n\n' : lang === 'json' ? '{\n  \n}' : '# Documentation\n\n';

    try {
      const res = await fetch(`/api/projects/${selectedProject.id}/files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: pathName,
          content: initialContent,
          language: lang,
        }),
      });

      const data = await res.json();
      if (res.ok && data.project) {
        setSelectedProject(data.project);
        const added = data.project.files.find((f: any) => f.path === pathName);
        if (added) {
          setActiveFile(added);
          setFileContent(added.content);
        }
        setIsNewFileModalOpen(false);
        setNewFileName('');
      }
    } catch (err: any) {
      alert(`Failed to add file: ${err.message}`);
    }
  };

  // Run code in real Python sandbox
  const handleRunCode = async () => {
    if (!selectedProject) return;
    setIsRunningCode(true);
    setRunResult(null);

    // Save first to ensure latest content is tested
    await handleSaveFile();

    try {
      const res = await fetch(`/api/projects/${selectedProject.id}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await res.json();
      setRunResult(data);
    } catch (err: any) {
      setRunResult({ error: err.message });
    } finally {
      setIsRunningCode(false);
    }
  };

  // Export as real deployable ZIP
  const handleExportZip = async () => {
    if (!selectedProject || isExportingZip) return;
    setIsExportingZip(true);

    try {
      const res = await fetch(`/api/projects/${selectedProject.id}/export-zip`);
      const data = await res.json();
      if (res.ok && data.downloadUrl) {
        const link = document.createElement('a');
        link.href = data.downloadUrl;
        link.download = data.zipName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        alert(data.error || 'Failed to generate ZIP');
      }
    } catch (err: any) {
      alert(`Export error: ${err.message}`);
    } finally {
      setIsExportingZip(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-300">
      {/* Top Banner */}
      <div className="relative rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950/80 to-slate-900 border border-indigo-500/30 p-8 shadow-2xl overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 mb-3">
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              <span>Personal AI Development Studio & Sandbox</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              MY AI WORK Project Workspace
            </h1>
            <p className="text-slate-300 text-sm sm:text-base mt-2 leading-relaxed">
              Build your own autonomous AI applications, develop custom agents, test automation pipelines in the Python sandbox, manage project file versions, and export production-ready ZIP packages.
            </p>
          </div>

          <button
            onClick={() => setIsNewProjectModalOpen(true)}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 transition transform active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Create New AI Project</span>
          </button>
        </div>
      </div>

      {/* Main Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Project Selector & File Navigator (Left column) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Your AI Projects ({projects.length})
            </h3>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {projects.map((proj) => {
                const isSelected = selectedProject?.id === proj.id;
                return (
                  <div
                    key={proj.id}
                    onClick={() => {
                      setSelectedProject(proj);
                      if (proj.files.length > 0) {
                        setActiveFile(proj.files[0]);
                        setFileContent(proj.files[0].content);
                      } else {
                        setActiveFile(null);
                        setFileContent('');
                      }
                    }}
                    className={`cursor-pointer p-3 rounded-xl border transition-all ${
                      isSelected
                        ? 'bg-indigo-950/60 border-indigo-500 ring-1 ring-indigo-500/30 shadow-md'
                        : 'bg-slate-950/60 border-slate-800 hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-xs font-bold text-white truncate">{proj.name}</h4>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300 capitalize">
                        {proj.category.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">{proj.description}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Project File Tree */}
          {selectedProject && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Project Files ({selectedProject.files.length})
                </h3>
                <button
                  onClick={() => setIsNewFileModalOpen(true)}
                  className="flex items-center gap-1 text-[11px] font-semibold text-indigo-400 hover:text-indigo-300"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add File</span>
                </button>
              </div>

              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {selectedProject.files.map((file) => {
                  const isSelected = activeFile?.id === file.id;
                  return (
                    <div
                      key={file.id}
                      onClick={() => {
                        setActiveFile(file);
                        setFileContent(file.content);
                      }}
                      className={`cursor-pointer flex items-center justify-between p-2.5 rounded-lg text-xs font-medium transition ${
                        isSelected
                          ? 'bg-indigo-600 text-white font-bold'
                          : 'bg-slate-950/60 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        {file.path.endsWith('.py') ? (
                          <FileCode className="w-3.5 h-3.5 text-amber-400" />
                        ) : (
                          <FileText className="w-3.5 h-3.5 text-cyan-400" />
                        )}
                        <span className="truncate">{file.path}</span>
                      </div>
                      <span className="text-[10px] opacity-70 uppercase">{file.language}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Code Editor & Execution Sandbox Panel (Right column) */}
        <div className="lg:col-span-8 space-y-4">
          {selectedProject ? (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[700px]">
              {/* Top Action Bar */}
              <div className="bg-slate-950 p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-bold text-slate-400">File:</span>
                  <span className="font-mono text-xs font-bold text-white bg-slate-800 px-2.5 py-1 rounded-md">
                    {activeFile?.path || 'No file selected'}
                  </span>
                  <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    v{selectedProject.version}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSaveFile}
                    disabled={isSavingFile || !activeFile}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{isSavingFile ? 'Saving...' : 'Save File'}</span>
                  </button>

                  <button
                    onClick={handleRunCode}
                    disabled={isRunningCode || !activeFile}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 transition"
                  >
                    {isRunningCode ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Play className="w-3.5 h-3.5 fill-current" />
                    )}
                    <span>Run in Sandbox</span>
                  </button>

                  <button
                    onClick={handleExportZip}
                    disabled={isExportingZip}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 transition"
                  >
                    {isExportingZip ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Download className="w-3.5 h-3.5" />
                    )}
                    <span>Export ZIP</span>
                  </button>
                </div>
              </div>

              {/* Editor Workspace */}
              <div className="flex-1 p-4 bg-slate-950/70 overflow-hidden flex flex-col">
                <textarea
                  value={fileContent}
                  onChange={(e) => setFileContent(e.target.value)}
                  placeholder="Write your code, script, or configuration..."
                  className="flex-1 w-full bg-slate-950 font-mono text-xs text-slate-200 p-4 rounded-2xl border border-slate-800 resize-none focus:outline-none focus:border-indigo-500 leading-relaxed"
                />
              </div>

              {/* Sandbox Run Console Output */}
              {runResult && (
                <div className="bg-slate-950 border-t border-slate-800 p-4 max-h-52 overflow-y-auto space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold flex items-center gap-2">
                      <Terminal className="w-4 h-4 text-emerald-400" />
                      Sandbox Execution Output:
                    </span>
                    <span
                      className={`font-semibold ${
                        runResult.result?.success ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      Exit Code: {runResult.result?.exitCode ?? 1} • {runResult.result?.durationMs ?? 0}ms
                    </span>
                  </div>

                  {runResult.result?.stdout && (
                    <pre className="font-mono text-xs text-slate-200 whitespace-pre-wrap bg-slate-900/90 p-3 rounded-xl border border-slate-800">
                      {runResult.result.stdout}
                    </pre>
                  )}

                  {runResult.result?.stderr && (
                    <pre className="font-mono text-xs text-rose-300 whitespace-pre-wrap bg-rose-950/30 p-3 rounded-xl border border-rose-500/30">
                      {runResult.result.stderr}
                    </pre>
                  )}

                  {runResult.error && (
                    <p className="text-xs text-rose-400 font-mono">{runResult.error}</p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="h-[600px] flex items-center justify-center border border-dashed border-slate-800 rounded-3xl text-slate-500">
              Select or create an AI project to begin development
            </div>
          )}
        </div>
      </div>

      {/* Modal: New Project */}
      {isNewProjectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <FolderPlus className="w-5 h-5 text-indigo-400" />
              Initialize New AI Project
            </h3>

            <form onSubmit={handleCreateProject} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Project Name</label>
                <input
                  type="text"
                  required
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="e.g. AI Content Repurposer, Autonomous CRM Bot"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Category</label>
                <select
                  value={newProjectCategory}
                  onChange={(e: any) => setNewProjectCategory(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="ai_app">AI Application</option>
                  <option value="agent">Autonomous Agent</option>
                  <option value="automation">Automation Script</option>
                  <option value="saas">AI SaaS Product</option>
                  <option value="research">AI Research Project</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Description</label>
                <textarea
                  rows={2}
                  value={newProjectDesc}
                  onChange={(e) => setNewProjectDesc(e.target.value)}
                  placeholder="What problem does this AI project solve?"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewProjectModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow"
                >
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add File */}
      {isNewFileModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Plus className="w-4 h-4 text-indigo-400" />
              Add File to Project
            </h3>

            <form onSubmit={handleAddNewFile} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">File Name & Extension</label>
                <input
                  type="text"
                  required
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  placeholder="e.g. agent_worker.py, pipeline.py, config.json"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewFileModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow"
                >
                  Add File
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

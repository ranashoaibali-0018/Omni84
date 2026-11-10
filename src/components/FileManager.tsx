import React, { useState, useEffect } from 'react';
import {
  FolderArchive,
  FileText,
  Download,
  Trash2,
  Copy,
  Check,
  Eye,
  Calendar,
  HardDrive,
  FileCode,
  Sparkles,
} from 'lucide-react';
import { SavedFileItem, ProposedAction } from '../types/agent';
import { MarkdownRenderer } from '../utils/markdownRenderer';

interface FileManagerProps {
  files: SavedFileItem[];
  onDeleteRequest: (action: ProposedAction) => void;
  onRefresh: () => void;
  selectedFileIdFromHeader?: string | null;
  onClearHeaderSelection?: () => void;
}

export const FileManager: React.FC<FileManagerProps> = ({
  files,
  onDeleteRequest,
  onRefresh,
  selectedFileIdFromHeader,
  onClearHeaderSelection,
}) => {
  const [selectedFile, setSelectedFile] = useState<SavedFileItem | null>(
    files.length > 0 ? files[0] : null
  );
  const [fileContent, setFileContent] = useState<string>('');
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [viewMode, setViewMode] = useState<'preview' | 'raw'>('preview');
  const [copied, setCopied] = useState(false);

  // If a file is selected from Header Global Search
  useEffect(() => {
    if (selectedFileIdFromHeader && files.length > 0) {
      const target = files.find((f) => f.id === selectedFileIdFromHeader);
      if (target) {
        setSelectedFile(target);
      }
      onClearHeaderSelection?.();
    }
  }, [selectedFileIdFromHeader, files]);

  // Fetch full content when a file is selected
  React.useEffect(() => {
    if (selectedFile) {
      if (selectedFile.content) {
        setFileContent(selectedFile.content);
      } else {
        setIsLoadingContent(true);
        fetch(`/api/files/${selectedFile.id}`)
          .then((res) => res.json())
          .then((data) => {
            if (data.file) {
              setFileContent(data.file.content);
            }
          })
          .catch((err) => console.error('Failed to load file content:', err))
          .finally(() => setIsLoadingContent(false));
      }
    } else {
      setFileContent('');
    }
  }, [selectedFile]);

  // Handle Download file to user computer
  const handleDownload = (file: SavedFileItem, content: string) => {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(fileContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-300">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-800 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <FolderArchive className="w-6 h-6 text-indigo-400" />
              Saved Documents & Artifacts
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
              {files.length} {files.length === 1 ? 'file' : 'files'}
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Documents created by OmniAgent and confirmed for local retention through the Critical Action Shield.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-900 px-3.5 py-2 rounded-xl border border-slate-800">
          <HardDrive className="w-4 h-4 text-emerald-400" />
          <span>Storage: Verified with Human-in-the-Loop</span>
        </div>
      </div>

      {files.length === 0 ? (
        <div className="my-16 text-center max-w-md mx-auto p-8 rounded-2xl bg-slate-900/50 border border-slate-800">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 mx-auto flex items-center justify-center mb-4">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-semibold text-slate-200">No Saved Files Yet</h3>
          <p className="text-sm text-slate-400 mt-2 mb-6">
            Ask OmniAgent to research a topic, plan a YouTube script, or draft content. When completed, click "Save File" and approve the critical action prompt.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
          {/* File List (Left column) */}
          <div className="lg:col-span-4 space-y-2.5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 px-1 mb-2">
              File Catalog
            </h3>
            <div className="space-y-2 max-h-[650px] overflow-y-auto pr-1">
              {files.map((file) => {
                const isSelected = selectedFile?.id === file.id;
                return (
                  <div
                    key={file.id}
                    onClick={() => setSelectedFile(file)}
                    className={`group cursor-pointer p-3.5 rounded-xl border transition-all ${
                      isSelected
                        ? 'bg-indigo-950/40 border-indigo-500/60 shadow-lg shadow-indigo-950/30 ring-1 ring-indigo-500/20'
                        : 'bg-slate-900/70 border-slate-800/80 hover:bg-slate-800/60 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <div
                          className={`p-2 rounded-lg mt-0.5 ${
                            isSelected
                              ? 'bg-indigo-600 text-white'
                              : 'bg-slate-800 text-slate-400 group-hover:text-slate-200'
                          }`}
                        >
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-200 truncate">
                            {file.name}
                          </p>
                          <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                            <span className="capitalize px-1.5 py-0.2 rounded bg-slate-800 text-[11px]">
                              {file.type}
                            </span>
                            <span>•</span>
                            <span>{(file.sizeBytes / 1024).toFixed(1)} KB</span>
                          </div>
                        </div>
                      </div>

                      {/* Delete Button (Triggers Critical Action Confirmation) */}
                      <button
                        title="Delete File (Requires Confirmation)"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteRequest({
                            action: 'delete_file',
                            filename: file.name,
                            fileId: file.id,
                            type: file.type,
                            format: file.format,
                            sizeBytes: file.sizeBytes,
                          });
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* File Viewer (Right column) */}
          <div className="lg:col-span-8">
            {selectedFile ? (
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden flex flex-col h-[700px] shadow-xl">
                {/* File Header Bar */}
                <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400">
                      <FileCode className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-base font-bold text-white truncate">
                        {selectedFile.name}
                      </h2>
                      <div className="flex items-center gap-3 text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(selectedFile.createdAt).toLocaleDateString()} at{' '}
                          {new Date(selectedFile.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        <span>•</span>
                        <span>{(selectedFile.sizeBytes / 1024).toFixed(2)} KB</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions & View Toggles */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center bg-slate-800/80 p-0.5 rounded-lg border border-slate-700">
                      <button
                        onClick={() => setViewMode('preview')}
                        className={`px-2.5 py-1 text-xs font-semibold rounded-md transition ${
                          viewMode === 'preview'
                            ? 'bg-indigo-600 text-white'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Formatted
                      </button>
                      <button
                        onClick={() => setViewMode('raw')}
                        className={`px-2.5 py-1 text-xs font-semibold rounded-md transition ${
                          viewMode === 'raw'
                            ? 'bg-indigo-600 text-white'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Raw Code
                      </button>
                    </div>

                    <button
                      onClick={handleCopy}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Copied' : 'Copy'}</span>
                    </button>

                    <button
                      onClick={() => handleDownload(selectedFile, fileContent)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download</span>
                    </button>
                  </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 p-6 overflow-y-auto bg-slate-900/50">
                  {isLoadingContent ? (
                    <div className="flex items-center justify-center h-full">
                      <span className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : viewMode === 'preview' ? (
                    <div className="max-w-none text-slate-200">
                      <MarkdownRenderer content={fileContent} />
                    </div>
                  ) : (
                    <pre className="font-mono text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
                      {fileContent}
                    </pre>
                  )}
                </div>
              </div>
            ) : (
              <div className="h-[600px] flex items-center justify-center border border-dashed border-slate-800 rounded-2xl text-slate-500">
                Select a document from the catalog to view
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

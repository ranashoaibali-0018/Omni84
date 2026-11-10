import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Header, AppTab } from './components/Header';
import { WorkforceDashboard } from './components/WorkforceDashboard';
import { MyAIWork } from './components/MyAIWork';
import { AgentsDirectory } from './components/AgentsDirectory';
import { ToolRegistryView } from './components/ToolRegistryView';
import { AssistantStudio } from './components/AssistantStudio';
import { FreelanceHub } from './components/FreelanceHub';
import { FileManager } from './components/FileManager';
import { PythonWindowsHub } from './components/PythonWindowsHub';
import { ImageStudio } from './components/ImageStudio';
import { ConfirmationModal } from './components/ConfirmationModal';
import { ProposedAction, SavedFileItem, AssistantMode, AgentDefinition, TaskExecutionRecord } from './types/agent';
import { CheckCircle, XCircle } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTab>('workforce');
  const [agents, setAgents] = useState<AgentDefinition[]>([]);
  const [savedFiles, setSavedFiles] = useState<SavedFileItem[]>([]);
  const [recentTasks, setRecentTasks] = useState<TaskExecutionRecord[]>([]);
  const [useLiveSearch, setUseLiveSearch] = useState<boolean>(true);
  const [prefilledPrompt, setPrefilledPrompt] = useState<{ text: string; mode: AssistantMode } | null>(null);

  // Search selections passed from Header
  const [selectedTaskIdFromHeader, setSelectedTaskIdFromHeader] = useState<string | null>(null);
  const [selectedAgentIdFromHeader, setSelectedAgentIdFromHeader] = useState<string | null>(null);
  const [selectedFileIdFromHeader, setSelectedFileIdFromHeader] = useState<string | null>(null);

  // Critical Action Confirmation State
  const [pendingAction, setPendingAction] = useState<ProposedAction | null>(null);
  const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Load agents, files & recent tasks on mount
  const loadInitialData = async () => {
    try {
      const [agentsRes, filesRes, tasksRes] = await Promise.all([
        fetch('/api/workforce/agents'),
        fetch('/api/files'),
        fetch('/api/workforce/tasks'),
      ]);

      const agentsData = await agentsRes.json();
      if (agentsData.agents) {
        setAgents(agentsData.agents);
      }

      const filesData = await filesRes.json();
      if (filesData.files) {
        setSavedFiles(filesData.files);
      }

      const tasksData = await tasksRes.json();
      if (tasksData.tasks) {
        setRecentTasks(tasksData.tasks);
      }
    } catch (err) {
      console.error('Failed to load initial data:', err);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const refreshFiles = async () => {
    try {
      const [filesRes, tasksRes] = await Promise.all([
        fetch('/api/files'),
        fetch('/api/workforce/tasks'),
      ]);
      const data = await filesRes.json();
      if (data.files) {
        setSavedFiles(data.files);
      }
      const tasksData = await tasksRes.json();
      if (tasksData.tasks) {
        setRecentTasks(tasksData.tasks);
      }
    } catch (err) {
      console.error('Failed to fetch files:', err);
    }
  };

  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'info') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Called whenever an action requires Human confirmation (Yes/No)
  const handleRequestAction = (action: ProposedAction) => {
    setPendingAction(action);
    setIsConfirmationModalOpen(true);
  };

  // User clicked "Yes, Proceed & Authorize" in the modal
  const handleConfirmAction = async () => {
    if (!pendingAction) return;
    setIsProcessingAction(true);

    try {
      if (pendingAction.action === 'save_file') {
        const res = await fetch('/api/files/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: pendingAction.filename,
            content: pendingAction.content,
            type: pendingAction.type,
            format: pendingAction.format,
            userConfirmed: true, // explicit confirmation token
          }),
        });

        const data = await res.json();

        if (res.ok && data.success) {
          try {
            confetti({
              particleCount: 50,
              spread: 60,
              origin: { y: 0.8 },
            });
          } catch (_) {}

          showToast(`✅ Confirmed: File '${data.file.name}' saved to storage.`, 'success');
          await refreshFiles();
        } else {
          showToast(`❌ Error saving file: ${data.error || data.message}`, 'error');
        }
      } else if (pendingAction.action === 'delete_file') {
        const res = await fetch(`/api/files/${pendingAction.fileId}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userConfirmed: true,
          }),
        });

        const data = await res.json();

        if (res.ok && data.success) {
          showToast(`🗑️ Confirmed: File '${pendingAction.filename}' permanently removed.`, 'info');
          await refreshFiles();
        } else {
          showToast(`❌ Error deleting file: ${data.error || data.message}`, 'error');
        }
      }
    } catch (err: any) {
      console.error('Action confirmation failed:', err);
      showToast(`❌ Action failed: ${err.message}`, 'error');
    } finally {
      setIsProcessingAction(false);
      setIsConfirmationModalOpen(false);
      setPendingAction(null);
    }
  };

  // User clicked "No, Cancel Action"
  const handleCancelAction = () => {
    const filename = pendingAction?.filename || 'action';
    setIsConfirmationModalOpen(false);
    setPendingAction(null);
    showToast(`🛑 Action cancelled by user: '${filename}' was not modified.`, 'info');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500/30">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed top-24 right-6 z-50 animate-in slide-in-from-top duration-300">
          <div
            className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border shadow-xl text-sm font-medium ${
              toastMessage.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200'
                : toastMessage.type === 'error'
                ? 'bg-rose-950/90 border-rose-500/50 text-rose-200'
                : 'bg-slate-900/90 border-slate-700 text-slate-200'
            }`}
          >
            {toastMessage.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-400" />
            ) : toastMessage.type === 'error' ? (
              <XCircle className="w-4 h-4 text-rose-400" />
            ) : (
              <span className="w-2 h-2 rounded-full bg-indigo-400" />
            )}
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* Navigation Header with Global Search */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        savedFilesCount={savedFiles.length}
        useLiveSearch={useLiveSearch}
        toggleLiveSearch={() => setUseLiveSearch(!useLiveSearch)}
        agents={agents}
        savedFiles={savedFiles}
        recentTasks={recentTasks}
        onSelectAgentFromSearch={(agentId) => {
          setSelectedAgentIdFromHeader(agentId);
          setActiveTab('workforce');
        }}
        onSelectFileFromSearch={(fileId) => {
          setSelectedFileIdFromHeader(fileId);
          setActiveTab('files');
        }}
        onSelectTaskFromSearch={(taskId) => {
          setSelectedTaskIdFromHeader(taskId);
          setActiveTab('workforce');
        }}
      />

      {/* Main Workspace */}
      <main className="flex-1 pb-16">
        {activeTab === 'workforce' && (
          <WorkforceDashboard
            agents={agents}
            selectedTaskIdFromHeader={selectedTaskIdFromHeader}
            selectedAgentIdFromHeader={selectedAgentIdFromHeader}
            onClearHeaderSelection={() => {
              setSelectedTaskIdFromHeader(null);
              setSelectedAgentIdFromHeader(null);
            }}
          />
        )}

        {activeTab === 'my-ai-work' && (
          <MyAIWork onRequestSaveAction={handleRequestAction} />
        )}

        {activeTab === 'image-studio' && (
          <ImageStudio onRequestSaveAction={handleRequestAction} />
        )}

        {activeTab === 'agents' && (
          <AgentsDirectory
            agents={agents}
            onDeployAgent={(agentId) => {
              setSelectedAgentIdFromHeader(agentId);
              setActiveTab('workforce');
            }}
          />
        )}

        {activeTab === 'tools' && <ToolRegistryView />}

        {activeTab === 'studio' && (
          <AssistantStudio
            useLiveSearch={useLiveSearch}
            onRequestSave={handleRequestAction}
            prefilledPrompt={prefilledPrompt}
            onClearPrefilledPrompt={() => setPrefilledPrompt(null)}
          />
        )}

        {activeTab === 'tasks' && (
          <FreelanceHub
            onRequestSave={handleRequestAction}
            onExecutePromptInStudio={(prompt, mode) => {
              setPrefilledPrompt({ text: prompt, mode });
              setActiveTab('studio');
            }}
          />
        )}

        {activeTab === 'files' && (
          <FileManager
            files={savedFiles}
            onDeleteRequest={handleRequestAction}
            onRefresh={refreshFiles}
            selectedFileIdFromHeader={selectedFileIdFromHeader}
            onClearHeaderSelection={() => setSelectedFileIdFromHeader(null)}
          />
        )}

        {activeTab === 'python-hub' && <PythonWindowsHub />}
      </main>

      {/* Critical Action Confirmation Dialog */}
      <ConfirmationModal
        isOpen={isConfirmationModalOpen}
        action={pendingAction}
        onConfirm={handleConfirmAction}
        onCancel={handleCancelAction}
        isProcessing={isProcessingAction}
      />
    </div>
  );
}

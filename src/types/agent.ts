export type AssistantMode = 'general' | 'research' | 'youtube' | 'content' | 'email';

export interface GroundingSource {
  title: string;
  uri?: string;
  url?: string;
}

export interface ProposedAction {
  action: 'save_file' | 'delete_file';
  filename: string;
  type: AssistantMode | 'office' | 'code' | 'workforce' | 'image' | 'general';
  format: 'markdown' | 'txt' | 'json' | 'docx' | 'xlsx' | 'zip' | 'png' | 'jpg';
  content?: string;
  fileId?: string;
  sizeBytes?: number;
  preview?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  mode?: AssistantMode;
  sources?: GroundingSource[];
  timestamp: string;
  suggestedSave?: {
    filename: string;
    title: string;
    format: 'markdown' | 'txt' | 'json';
    type: AssistantMode;
    sizeBytes: number;
    preview: string;
  } | null;
}

export interface SavedFileItem {
  id: string;
  name: string;
  type: AssistantMode | 'office' | 'code' | 'workforce';
  format: 'markdown' | 'txt' | 'json' | 'docx' | 'xlsx' | 'zip';
  createdAt: string;
  sizeBytes: number;
  content?: string;
}

export interface AgentStatus {
  status: string;
  hasApiKey: boolean;
  model: string;
  capabilities: string[];
}

export interface AgentDefinition {
  id: string;
  name: string;
  role: string;
  category: string;
  icon: string;
  description: string;
  tools: string[];
  systemPrompt: string;
  deliverables: string[];
}

export interface ToolDefinitionMeta {
  name: string;
  displayName: string;
  description: string;
  category: 'web' | 'code' | 'office' | 'marketing' | 'system';
  parameters: Record<string, { type: string; description: string; required?: boolean }>;
}

export interface TaskStep {
  id: string;
  stepNumber: number;
  title: string;
  agentId: string;
  toolName?: string;
  toolArgs?: any;
  status: 'pending' | 'running' | 'verifying' | 'completed' | 'failed';
  output?: any;
  verificationDetails?: string;
  error?: string;
  startedAt?: string;
  completedAt?: string;
}

export interface TaskExecutionRecord {
  id: string;
  userPrompt: string;
  assignedAgentId: string;
  status: 'planning' | 'executing' | 'verifying' | 'completed' | 'failed' | 'cancelled';
  planOverview: string;
  steps: TaskStep[];
  logs: Array<{ timestamp: string; level: 'info' | 'warn' | 'error' | 'success'; message: string; agentId?: string }>;
  verifiedDeliverables: Array<{
    type: 'docx' | 'xlsx' | 'zip' | 'python' | 'markdown' | 'json';
    title: string;
    filename: string;
    downloadUrl?: string;
    sizeBytes?: number;
    preview?: string;
  }>;
  sources: Array<{ title: string; url: string }>;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface AIProjectFile {
  id: string;
  name: string;
  path: string;
  content: string;
  language: string;
  updatedAt: string;
}

export interface AIProject {
  id: string;
  name: string;
  description: string;
  category: 'ai_app' | 'agent' | 'automation' | 'saas' | 'research';
  version: string;
  status: 'active' | 'in_development' | 'deployed';
  files: AIProjectFile[];
  createdAt: string;
  updatedAt: string;
}

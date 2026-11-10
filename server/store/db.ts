import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, '..', '..', 'data');
const STORE_FILE = path.join(DATA_DIR, 'omni_store.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
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

interface OmniStoreSchema {
  tasks: TaskExecutionRecord[];
  projects: AIProject[];
}

class OmniDatabase {
  private data: OmniStoreSchema = {
    tasks: [],
    projects: [],
  };

  constructor() {
    this.load();
    this.seedDefaultsIfEmpty();
  }

  private load() {
    try {
      if (fs.existsSync(STORE_FILE)) {
        const raw = fs.readFileSync(STORE_FILE, 'utf8');
        this.data = JSON.parse(raw);
      }
    } catch (err) {
      console.warn('Failed to load omni_store.json, initializing fresh store:', err);
      this.data = { tasks: [], projects: [] };
    }
  }

  private save() {
    try {
      fs.writeFileSync(STORE_FILE, JSON.stringify(this.data, null, 2), 'utf8');
    } catch (err) {
      console.error('Failed to write omni_store.json:', err);
    }
  }

  private seedDefaultsIfEmpty() {
    if (this.data.projects.length === 0) {
      this.data.projects = [
        {
          id: 'proj-1',
          name: 'Autonomous Lead Generation Bot',
          description: 'A Python scraper and Gemini-powered B2B lead qualifier that scores target prospect profiles.',
          category: 'automation',
          version: '1.0.0',
          status: 'active',
          files: [
            {
              id: 'file-1',
              name: 'lead_qualifier.py',
              path: 'lead_qualifier.py',
              language: 'python',
              content: `# Autonomous B2B Lead Qualifier
import json

def qualify_lead(company_name, industry, revenue_est, headcount):
    """Calculates lead fit score between 0 and 100"""
    score = 50
    if industry.lower() in ['saas', 'fintech', 'ai', 'healthtech']:
        score += 25
    if headcount > 50:
        score += 15
    if revenue_est > 1_000_000:
        score += 10
    
    tier = "Tier 1 (High Priority)" if score >= 80 else "Tier 2 (Standard)" if score >= 60 else "Tier 3"
    return {"company": company_name, "score": score, "tier": tier}

# Example execution
prospects = [
    qualify_lead("CloudScale AI", "AI", 5000000, 120),
    qualify_lead("Local Bakery", "Retail", 200000, 8),
    qualify_lead("FinEdge Systems", "FinTech", 12000000, 250)
]
print(json.dumps(prospects, indent=2))
`,
              updatedAt: new Date().toISOString(),
            },
            {
              id: 'file-2',
              name: 'README.md',
              path: 'README.md',
              language: 'markdown',
              content: `# Autonomous Lead Generation Bot

An automated lead scoring pipeline built with Python and Gemini API.

## Features
- Evaluates ICP (Ideal Customer Profile) metrics.
- Computes Tier 1 / Tier 2 qualification scores.
- Ready to hook into CRM webhooks or Apollo.io.
`,
              updatedAt: new Date().toISOString(),
            },
          ],
          createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'proj-2',
          name: 'AI Video Script & Thumbnail Studio',
          description: 'Multi-agent video content engine generating hook blueprints, visual cues, and Midjourney thumbnail prompts.',
          category: 'ai_app',
          version: '0.8.2',
          status: 'in_development',
          files: [
            {
              id: 'file-3',
              name: 'video_engine.py',
              path: 'video_engine.py',
              language: 'python',
              content: `# Video Engine: Retention Hook Optimizer
def generate_hook_structure(topic, target_audience):
    return {
        "topic": topic,
        "first_5_seconds": f"If you are {target_audience} and still doing this manually, you are wasting 10 hours a week.",
        "visual_cue": "[Fast motion graphic of red alarm or declining graph]",
        "audio_sfx": "Boom sound effect / Record scratch",
        "retention_bridge": "Here is the exact 3-step automation blueprint..."
    }

print(generate_hook_structure("AI Agent Automation", "freelancers and developers"))
`,
              updatedAt: new Date().toISOString(),
            },
          ],
          createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];
      this.save();
    }
  }

  // Tasks methods
  public getTasks(): TaskExecutionRecord[] {
    return this.data.tasks;
  }

  public getTaskById(id: string): TaskExecutionRecord | undefined {
    return this.data.tasks.find((t) => t.id === id);
  }

  public saveTask(task: TaskExecutionRecord) {
    const idx = this.data.tasks.findIndex((t) => t.id === task.id);
    if (idx >= 0) {
      this.data.tasks[idx] = task;
    } else {
      this.data.tasks.unshift(task);
    }
    // Keep max 50 recent tasks
    if (this.data.tasks.length > 50) {
      this.data.tasks = this.data.tasks.slice(0, 50);
    }
    this.save();
  }

  // Projects methods ("MY AI WORK")
  public getProjects(): AIProject[] {
    return this.data.projects;
  }

  public getProjectById(id: string): AIProject | undefined {
    return this.data.projects.find((p) => p.id === id);
  }

  public saveProject(project: AIProject) {
    const idx = this.data.projects.findIndex((p) => p.id === project.id);
    if (idx >= 0) {
      this.data.projects[idx] = project;
    } else {
      this.data.projects.unshift(project);
    }
    this.save();
  }

  public deleteProject(id: string): boolean {
    const initLen = this.data.projects.length;
    this.data.projects = this.data.projects.filter((p) => p.id !== id);
    if (this.data.projects.length !== initLen) {
      this.save();
      return true;
    }
    return false;
  }
}

export const omniDb = new OmniDatabase();

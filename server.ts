import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import { globalToolRegistry, OUTPUTS_DIR } from './server/toolRegistry.js';
import { SPECIALIZED_AGENTS, getAgentById } from './server/agents/agentCatalog.js';
import { globalOrchestrator } from './server/orchestrator.js';
import { omniDb, AIProject } from './server/store/db.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// In-memory or saved files store for saved artifacts
interface SavedFile {
  id: string;
  name: string;
  type: 'research' | 'youtube' | 'content' | 'email' | 'general';
  format: 'markdown' | 'txt' | 'json';
  content: string;
  createdAt: string;
  sizeBytes: number;
  metadata?: Record<string, any>;
}

const savedFilesStore: SavedFile[] = [
  {
    id: 'sample-1',
    name: 'Top-AI-Agents-2025-Research.md',
    type: 'research',
    format: 'markdown',
    content: `# Research Brief: Autonomous AI Agents in 2025 & Beyond\n\n## Executive Summary\nAutonomous AI agents have transitioned from experimental proofs-of-concept into multi-turn operational assistants capable of tool invocation, search grounding, and self-correction.\n\n## Key Trends\n- **Search Grounding**: Live retrieval-augmented generation allows agents to anchor on real-time web facts.\n- **Human-in-the-Loop**: Critical actions (file writes, database changes, external emails) enforce explicit user confirmation.\n- **Specialized Workflows**: Dedicated prompts for YouTube scripts, research dossiers, and executive outreach.`,
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    sizeBytes: 620,
    metadata: { source: 'Live Search', topic: 'AI Agents' },
  },
  {
    id: 'sample-2',
    name: 'YouTube-Script-Productivity-Hacks.md',
    type: 'youtube',
    format: 'markdown',
    content: `# YouTube Script: 5 AI Automation Secrets to 10x Your Day\n\n## [0:00 - 0:45] Hook & Problem\n**[Visual Cue]**: Fast-paced montage of cluttered desktop tabs, notifications dinging.\n**Host (Energetic)**: "If you feel like you are spending 80% of your day managing mundane emails and browser tabs instead of doing actual deep work, stop right here."\n\n## [0:45 - 2:30] Secret #1: The Autonomous Morning Dispatch\n**[Visual Cue]**: Screen recording showing an AI agent synthesizing research while you sleep.\n**Host**: "Here is the blueprint for having your research done before your first cup of coffee..."`,
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    sizeBytes: 740,
    metadata: { targetDuration: '8-10 mins', tone: 'Engaging' },
  },
];

// Initialize Gemini Client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// System prompt tailored for personal assistant
const ASSISTANT_SYSTEM_PROMPT = `You are "OmniAgent", an elite Personal AI Assistant and Executive Producer designed for high-performing creators, researchers, and professionals.
You specialize in four core competencies:
1. Deep Research & Fact Synthesis (using live internet search to uncover latest trends, products, facts, and citations).
2. Content Generation (insightful articles, social threads, newsletters, and briefs).
3. YouTube Script Studio (gripping hooks, structured beats, specific visual & audio cues, teleprompter-ready scripts, and viral CTAs).
4. Executive Email Drafting (crisp subject lines, tailored tones ranging from formal to warm persuasive, action-oriented closes).

Guidelines:
- When live information or recent facts are needed, use Google Search Grounding.
- Always provide clear, beautifully formatted Markdown with headers, bullet points, and actionable takeaways.
- If the user's request results in a complete document (like an email, article, research dossier, or YouTube script), include a clear title and format it cleanly so it can be saved.
- Be proactive, intelligent, and helpful.`;

// API: Check Health & Key Status
app.get('/api/agent/status', (req, res) => {
  res.json({
    status: 'online',
    hasApiKey: Boolean(process.env.GEMINI_API_KEY),
    model: 'gemini-3.8-flash',
    capabilities: [
      'Research & Live Web Search Grounding',
      'Content & Article Generation',
      'YouTube Scriptwriting with Visual Cues',
      'Professional Email Drafting',
      'Critical Action Confirmation Shield (Yes/No)',
      'AI Image Creation & Editing with gemini-nano-banana-2.1',
      'Local Python & Streamlit Windows Setup Kit',
    ],
    timestamp: new Date().toISOString(),
  });
});

// API: Agent Generate Content / Chat
app.post('/api/agent/chat', async (req, res) => {
  try {
    const {
      prompt,
      history = [],
      mode = 'general', // 'general' | 'research' | 'youtube' | 'content' | 'email'
      useLiveSearch = true,
      customInstructions = '',
    } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: 'GEMINI_API_KEY is not configured in server environment secrets.',
      });
    }

    // Determine task-specific system context
    let modeInstruction = '';
    if (mode === 'research') {
      modeInstruction = `MODE: RESEARCH ASSISTANT. Focus on exhaustive, structured facts, verified citations, market breakdown, and key takeaways. Search for recent data when applicable.`;
    } else if (mode === 'youtube') {
      modeInstruction = `MODE: YOUTUBE SCRIPT STUDIO. Produce a ready-to-record YouTube script formatted with:
- Suggested Video Title & Thumbnail Concept
- Hook (0:00 - 0:30) with Visual/B-Roll Cues
- Retention Bridge & Intro
- Key Chapters/Beats with [Host Voice] and [Visual/Audio Cues]
- Strong Call to Action (CTA) and Outro`;
    } else if (mode === 'content') {
      modeInstruction = `MODE: CONTENT CREATOR. Craft compelling, audience-tailored content (blog post, newsletter, LinkedIn post, or guide) with high readability, subheadings, and actionable insights.`;
    } else if (mode === 'email') {
      modeInstruction = `MODE: EMAIL DRAFTER. Provide:
- 3 high-open-rate Subject Line options
- Cleanly formatted Email Body with greeting, context, value/ask, and professional sign-off
- Suggested follow-up cadence`;
    }

    const fullSystemInstruction = [
      ASSISTANT_SYSTEM_PROMPT,
      modeInstruction,
      customInstructions,
    ]
      .filter(Boolean)
      .join('\n\n');

    // Build tools config
    const config: any = {
      systemInstruction: fullSystemInstruction,
    };

    if (useLiveSearch) {
      config.tools = [{ googleSearch: {} }];
    }

    // Format chat contents
    // Convert previous turn history if provided
    const contents: any[] = [];
    if (Array.isArray(history) && history.length > 0) {
      for (const msg of history) {
        contents.push({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.text || msg.content }],
        });
      }
    }
    contents.push({
      role: 'user',
      parts: [{ text: prompt }],
    });

    // Retry helper with exponential backoff for transient 503 / high demand spikes
    let response: any = null;
    let attempts = 0;
    const maxAttempts = 3;
    let lastError: any = null;

    while (attempts < maxAttempts) {
      try {
        attempts++;
        response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents,
          config,
        });
        if (response) break;
      } catch (callErr: any) {
        lastError = callErr;
        const errMsg = String(callErr?.message || callErr);
        if (errMsg.includes('503') || errMsg.includes('high demand') || errMsg.includes('UNAVAILABLE')) {
          console.warn(`Gemini 503 transient spike, retry attempt ${attempts} of ${maxAttempts}...`);
          await new Promise((resolve) => setTimeout(resolve, 1500 * attempts));
        } else {
          throw callErr;
        }
      }
    }

    if (!response && lastError) {
      throw lastError;
    }

    const outputText = response.text || '';

    // Extract search grounding sources if present
    const groundingChunks =
      response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const webSources = groundingChunks
      .filter((chunk: any) => chunk?.web?.uri)
      .map((chunk: any) => ({
        title: chunk.web.title || chunk.web.uri,
        uri: chunk.web.uri,
      }));

    // Detect if content is suitable for a critical save action
    let suggestedSave = null;
    const titleMatch = outputText.match(/^#\s+(.+)$/m);
    const docTitle = titleMatch ? titleMatch[1].trim() : `${mode}-draft-${Date.now()}`;
    const cleanFilename = docTitle
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 40) + '.md';

    if (outputText.length > 250) {
      suggestedSave = {
        filename: cleanFilename,
        title: docTitle,
        format: 'markdown',
        type: mode,
        sizeBytes: Buffer.byteLength(outputText, 'utf8'),
        preview: outputText.slice(0, 300) + '...',
      };
    }

    return res.json({
      text: outputText,
      sources: webSources,
      suggestedSave,
      mode,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Agent chat error:', error);
    return res.status(500).json({
      error: error.message || 'An error occurred while generating response',
    });
  }
});

// API: File Save (Enforces Critical Action Confirmation Verification)
app.post('/api/files/save', (req, res) => {
  const { name, content, type = 'general', format = 'markdown', userConfirmed } = req.body;

  // Enforce critical action confirmation!
  if (!userConfirmed) {
    return res.status(403).json({
      requiresConfirmation: true,
      message: 'Critical Action: User confirmation (Yes) is required before saving or writing any file to storage.',
      proposedAction: {
        action: 'save_file',
        name: name || 'untitled.md',
        sizeBytes: content ? Buffer.byteLength(content, 'utf8') : 0,
      },
    });
  }

  if (!content) {
    return res.status(400).json({ error: 'Content is required to save file' });
  }

  const newFile: SavedFile = {
    id: `file-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    name: name || `agent-output-${Date.now()}.${format === 'json' ? 'json' : format === 'txt' ? 'txt' : 'md'}`,
    type: type,
    format: format,
    content: content,
    createdAt: new Date().toISOString(),
    sizeBytes: Buffer.byteLength(content, 'utf8'),
  };

  savedFilesStore.unshift(newFile);

  return res.json({
    success: true,
    file: newFile,
    message: `File '${newFile.name}' was securely saved after user confirmation.`,
  });
});

// API: List Saved Files
app.get('/api/files', (req, res) => {
  res.json({
    files: savedFilesStore.map(({ id, name, type, format, createdAt, sizeBytes }) => ({
      id,
      name,
      type,
      format,
      createdAt,
      sizeBytes,
    })),
  });
});

// API: Get Single File Content
app.get('/api/files/:id', (req, res) => {
  const file = savedFilesStore.find((f) => f.id === req.params.id);
  if (!file) {
    return res.status(404).json({ error: 'File not found' });
  }
  res.json({ file });
});

// API: Delete File (Enforces Confirmation)
app.delete('/api/files/:id', (req, res) => {
  const { userConfirmed } = req.body;
  const index = savedFilesStore.findIndex((f) => f.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ error: 'File not found' });
  }

  if (!userConfirmed) {
    return res.status(403).json({
      requiresConfirmation: true,
      message: `Critical Action: Deleting '${savedFilesStore[index].name}' requires explicit user confirmation.`,
    });
  }

  const [deleted] = savedFilesStore.splice(index, 1);
  res.json({
    success: true,
    message: `File '${deleted.name}' has been permanently deleted.`,
  });
});

// ==========================================
// AUTONOMOUS AI WORKFORCE & AGENTS API
// ==========================================

// 1. List Specialized Agents
app.get('/api/workforce/agents', (req, res) => {
  res.json({ agents: SPECIALIZED_AGENTS });
});

// 2. List Registered Tools
app.get('/api/workforce/tools', (req, res) => {
  res.json({ tools: globalToolRegistry.listTools() });
});

// 3. Execute Autonomous Task (Multi-Agent Multi-Step Pipeline)
app.post('/api/workforce/execute', async (req, res) => {
  try {
    const { prompt, agentId } = req.body;
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const task = await globalOrchestrator.startTask(prompt, agentId);
    res.json({ success: true, task });
  } catch (err: any) {
    console.error('Workforce execution error:', err);
    res.status(500).json({ error: err.message || 'Failed to start autonomous task' });
  }
});

// 4. List Tasks
app.get('/api/workforce/tasks', (req, res) => {
  res.json({ tasks: omniDb.getTasks() });
});

// 5. Get Task Details & Live Progress
app.get('/api/workforce/tasks/:id', (req, res) => {
  const task = omniDb.getTaskById(req.params.id);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }
  res.json({ task });
});

// 6. Cancel Task
app.post('/api/workforce/tasks/:id/cancel', (req, res) => {
  const success = globalOrchestrator.cancelTask(req.params.id);
  res.json({ success, message: success ? 'Task cancelled' : 'Task not active or not found' });
});

// 7. Direct Tool Execution Endpoint
app.post('/api/tools/execute', async (req, res) => {
  try {
    const { name, args } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Tool name is required' });
    }
    const result = await globalToolRegistry.executeTool(name, args || {});
    res.json({ success: true, tool: name, result });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Tool execution failed' });
  }
});

// ==========================================
// MY AI WORK: PROJECT WORKSPACE API
// ==========================================

// 8. List Projects
app.get('/api/projects', (req, res) => {
  res.json({ projects: omniDb.getProjects() });
});

// 9. Create Project
app.post('/api/projects', (req, res) => {
  const { name, description, category } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Project name is required' });
  }

  const newProject: AIProject = {
    id: `proj_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    name,
    description: description || 'Custom AI project developed in OmniAgent',
    category: category || 'ai_app',
    version: '1.0.0',
    status: 'in_development',
    files: [
      {
        id: `file_${Date.now()}_main`,
        name: 'main.py',
        path: 'main.py',
        language: 'python',
        content: `# ${name}\n# Autonomous AI Project generated with OmniAgent\n\ndef run():\n    print("Starting ${name}...")\n    print("OmniAgent Autonomous execution verified.")\n\nif __name__ == "__main__":\n    run()\n`,
        updatedAt: new Date().toISOString(),
      },
      {
        id: `file_${Date.now()}_readme`,
        name: 'README.md',
        path: 'README.md',
        language: 'markdown',
        content: `# ${name}\n\n${description || 'Autonomous AI Project'}\n\n## Usage\nRun with:\n\`\`\`bash\npython main.py\n\`\`\`\n`,
        updatedAt: new Date().toISOString(),
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  omniDb.saveProject(newProject);
  res.json({ success: true, project: newProject });
});

// 10. Get Project
app.get('/api/projects/:id', (req, res) => {
  const project = omniDb.getProjectById(req.params.id);
  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }
  res.json({ project });
});

// 11. Save/Update File in Project
app.post('/api/projects/:id/files', (req, res) => {
  const project = omniDb.getProjectById(req.params.id);
  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }

  const { path: filePath, content, language } = req.body;
  if (!filePath || typeof content !== 'string') {
    return res.status(400).json({ error: 'File path and content are required' });
  }

  const existingFileIdx = project.files.findIndex((f) => f.path === filePath);
  if (existingFileIdx >= 0) {
    project.files[existingFileIdx].content = content;
    project.files[existingFileIdx].updatedAt = new Date().toISOString();
    if (language) project.files[existingFileIdx].language = language;
  } else {
    project.files.push({
      id: `file_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: path.basename(filePath),
      path: filePath,
      content,
      language: language || (filePath.endsWith('.py') ? 'python' : filePath.endsWith('.json') ? 'json' : 'markdown'),
      updatedAt: new Date().toISOString(),
    });
  }

  project.updatedAt = new Date().toISOString();
  omniDb.saveProject(project);
  res.json({ success: true, project });
});

// 12. Delete Project
app.delete('/api/projects/:id', (req, res) => {
  const { userConfirmed } = req.body;
  if (!userConfirmed) {
    return res.status(403).json({
      requiresConfirmation: true,
      message: 'Critical Action: Deleting an AI project requires explicit user authorization.',
    });
  }

  const success = omniDb.deleteProject(req.params.id);
  res.json({ success, message: success ? 'Project deleted' : 'Project not found' });
});

// 13. Run Project in Sandbox
app.post('/api/projects/:id/run', async (req, res) => {
  const project = omniDb.getProjectById(req.params.id);
  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }

  // Find python file to run (default main.py or first .py file)
  const pyFile = project.files.find((f) => f.path === 'main.py') || project.files.find((f) => f.path.endsWith('.py'));
  if (!pyFile) {
    return res.status(400).json({ error: 'No Python file found in project to execute' });
  }

  try {
    const result = await globalToolRegistry.executeTool('python_execute', {
      code: pyFile.content,
      timeoutSeconds: 15,
    });
    res.json({ success: true, fileExecuted: pyFile.path, result });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Execution failed' });
  }
});

// 14. Export Project as Real Downloadable ZIP
app.get('/api/projects/:id/export-zip', async (req, res) => {
  const project = omniDb.getProjectById(req.params.id);
  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }

  try {
    const zipName = `${project.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-v${project.version}.zip`;
    const zipResult = await globalToolRegistry.executeTool('create_project_zip', {
      zipName,
      files: project.files.map((f) => ({ path: f.path, content: f.content })),
    });

    res.json({ success: true, zipName, downloadUrl: zipResult.downloadUrl, sizeBytes: zipResult.sizeBytes });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'ZIP generation failed' });
  }
});

// ==========================================
// FILE DOWNLOAD SERVING ENDPOINT
// ==========================================
app.get('/api/downloads/:filename', (req, res) => {
  const safeFilename = path.basename(req.params.filename);
  const filePath = path.join(OUTPUTS_DIR, safeFilename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found or expired' });
  }

  const ext = path.extname(safeFilename).toLowerCase();
  let contentType = 'application/octet-stream';
  if (ext === '.xlsx') contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  else if (ext === '.docx') contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  else if (ext === '.zip') contentType = 'application/zip';
  else if (ext === '.py') contentType = 'text/x-python; charset=utf-8';
  else if (ext === '.json') contentType = 'application/json; charset=utf-8';
  else if (ext === '.md' || ext === '.txt') contentType = 'text/plain; charset=utf-8';
  else if (ext === '.png') contentType = 'image/png';
  else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
  else if (ext === '.webp') contentType = 'image/webp';
  else if (ext === '.mp4') contentType = 'video/mp4';
  else if (ext === '.mp3') contentType = 'audio/mpeg';
  else if (ext === '.wav') contentType = 'audio/wav';
  else if (ext === '.webm') contentType = 'video/webm';

  res.setHeader('Content-Type', contentType);
  const isMedia = ext === '.png' || ext === '.jpg' || ext === '.jpeg' || ext === '.webp' || ext === '.mp4' || ext === '.mp3' || ext === '.wav' || ext === '.webm';
  const disposition = isMedia ? 'inline' : 'attachment';
  res.setHeader('Content-Disposition', `${disposition}; filename="${safeFilename}"`);
  const stream = fs.createReadStream(filePath);
  stream.pipe(res);
});

// ==========================================
// GEMINI NANO BANANA 2.1 IMAGE CREATION & EDITING API
// ==========================================

// 1. Generate Image with gemini-nano-banana-2.1
app.post('/api/images/generate', async (req, res) => {
  try {
    const {
      prompt,
      aspectRatio = '1:1',
      imageSize = '1K',
      enableSearch = false,
    } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Text prompt is required for image generation' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is not configured in server environment' });
    }

    const config: any = {
      imageConfig: {
        aspectRatio,
        imageSize,
      },
    };

    if (enableSearch) {
      config.tools = [
        {
          googleSearch: {
            searchTypes: {
              webSearch: {},
              imageSearch: {},
            },
          },
        },
      ];
    }

    const response = await ai.models.generateContent({
      model: 'gemini-nano-banana-2.1',
      contents: {
        parts: [{ text: prompt }],
      },
      config,
    });

    let imageUrl = '';
    let base64Data = '';
    let mimeType = 'image/png';
    let textDescription = '';

    for (const part of response.candidates?.[0]?.content?.parts ?? []) {
      if (part.inlineData?.data) {
        base64Data = part.inlineData.data;
        mimeType = part.inlineData.mimeType || 'image/png';
        imageUrl = `data:${mimeType};base64,${base64Data}`;
      } else if (part.text) {
        textDescription += part.text;
      }
    }

    if (!imageUrl) {
      return res.status(500).json({
        error: 'Model did not return an image. ' + (textDescription ? `Response: ${textDescription}` : ''),
      });
    }

    // Save image to output storage
    const filename = `nano-banana-${Date.now()}-${Math.random().toString(36).substring(2, 7)}.png`;
    const filePath = path.join(OUTPUTS_DIR, filename);
    fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));

    return res.json({
      success: true,
      imageUrl,
      downloadUrl: `/api/downloads/${filename}`,
      filename,
      prompt,
      aspectRatio,
      imageSize,
      textDescription,
      model: 'gemini-nano-banana-2.1',
      createdAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('Image generation error:', err);
    return res.status(500).json({
      error: err.message || 'Image generation failed with gemini-nano-banana-2.1',
    });
  }
});

// 2. Edit Image with gemini-nano-banana-2.1
app.post('/api/images/edit', async (req, res) => {
  try {
    const {
      prompt,
      imageBase64,
      mimeType = 'image/png',
      aspectRatio = '1:1',
      imageSize = '1K',
    } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Editing prompt is required' });
    }

    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return res.status(400).json({ error: 'Original image data (base64) is required' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is not configured in server environment' });
    }

    let cleanBase64 = imageBase64;
    let finalMime = mimeType;
    if (imageBase64.includes(';base64,')) {
      const parts = imageBase64.split(';base64,');
      cleanBase64 = parts[1];
      const match = parts[0].match(/data:([^;]+)/);
      if (match) finalMime = match[1];
    }

    const response = await ai.models.generateContent({
      model: 'gemini-nano-banana-2.1',
      contents: {
        parts: [
          {
            inlineData: {
              data: cleanBase64,
              mimeType: finalMime,
            },
          },
          {
            text: prompt,
          },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio,
          imageSize,
        },
      },
    });

    let imageUrl = '';
    let base64Data = '';
    let resMime = 'image/png';
    let textDescription = '';

    for (const part of response.candidates?.[0]?.content?.parts ?? []) {
      if (part.inlineData?.data) {
        base64Data = part.inlineData.data;
        resMime = part.inlineData.mimeType || 'image/png';
        imageUrl = `data:${resMime};base64,${base64Data}`;
      } else if (part.text) {
        textDescription += part.text;
      }
    }

    if (!imageUrl) {
      return res.status(500).json({
        error: 'Model did not return an edited image. ' + (textDescription ? `Response: ${textDescription}` : ''),
      });
    }

    // Save edited image to disk
    const filename = `edited-banana-${Date.now()}-${Math.random().toString(36).substring(2, 7)}.png`;
    const filePath = path.join(OUTPUTS_DIR, filename);
    fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));

    return res.json({
      success: true,
      imageUrl,
      downloadUrl: `/api/downloads/${filename}`,
      filename,
      prompt,
      aspectRatio,
      imageSize,
      textDescription,
      model: 'gemini-nano-banana-2.1',
      createdAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('Image edit error:', err);
    return res.status(500).json({
      error: err.message || 'Image editing failed with gemini-nano-banana-2.1',
    });
  }
});

// 3. List Recently Generated/Edited Images
app.get('/api/images/recent', (req, res) => {
  try {
    if (!fs.existsSync(OUTPUTS_DIR)) {
      return res.json({ images: [] });
    }
    const files = fs.readdirSync(OUTPUTS_DIR);
    const imageFiles = files
      .filter((file) => file.startsWith('nano-banana-') || file.startsWith('edited-banana-') || file.endsWith('.png') || file.endsWith('.jpg'))
      .map((file) => {
        const stat = fs.statSync(path.join(OUTPUTS_DIR, file));
        return {
          filename: file,
          url: `/api/downloads/${file}`,
          createdAt: stat.mtime.toISOString(),
          sizeBytes: stat.size,
          isEdited: file.startsWith('edited-'),
        };
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 20);

    return res.json({ images: imageFiles });
  } catch {
    return res.json({ images: [] });
  }
});

// ==========================================
// VIDEO GENERATION (gemini-omni-1.2-flash Interactions API)
// ==========================================
app.post('/api/video/generate', async (req, res) => {
  try {
    const { prompt, imageBase64, aspectRatio = '16:9', duration = '10s' } = req.body;
    if (!prompt && !imageBase64) return res.status(400).json({ error: 'Prompt or image is required' });
    if (!process.env.GEMINI_API_KEY) return res.status(500).json({ error: 'GEMINI_API_KEY is not configured' });

    let input: any = prompt;
    if (imageBase64) {
      let cleanBase64 = imageBase64;
      let mime = 'image/png';
      if (imageBase64.includes(';base64,')) {
        const [p, d] = imageBase64.split(';base64,');
        cleanBase64 = d;
        const m = p.match(/data:([^;]+)/);
        if (m) mime = m[1];
      }
      input = [
        {
          type: 'image',
          mime_type: mime,
          data: cleanBase64,
        },
        {
          type: 'text',
          text: prompt || 'Animate this photo with subtle cinematic camera movement and fluid motion.',
        },
      ];
    }

    const interaction = await ai.interactions.create({
      model: 'gemini-omni-1.2-flash',
      input,
      background: false,
      store: false,
      stream: false,
      response_format: {
        type: 'video',
        aspect_ratio: aspectRatio,
        duration: duration,
      },
    }, { timeout: 300000 });

    const videoPart = interaction.output_video;
    if (!videoPart || !videoPart.data) {
      return res.status(500).json({ error: 'No video was returned by gemini-omni-1.2-flash' });
    }

    const videoBuffer = Buffer.from(videoPart.data, 'base64');
    const filename = `omni-video-${Date.now()}.mp4`;
    const filePath = path.join(OUTPUTS_DIR, filename);
    fs.writeFileSync(filePath, videoBuffer);

    return res.json({
      success: true,
      videoUrl: `data:video/mp4;base64,${videoPart.data}`,
      downloadUrl: `/api/downloads/${filename}`,
      filename,
      aspectRatio,
      model: 'gemini-omni-1.2-flash',
    });
  } catch (err: any) {
    console.error('Video generation error:', err);
    return res.status(500).json({ error: err.message || 'Video generation failed' });
  }
});

// ==========================================
// MUSIC GENERATION (Lyria Models)
// ==========================================
app.post('/api/music/generate', async (req, res) => {
  try {
    const { prompt, duration = 'clip', imageBase64 } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt is required' });
    if (!process.env.GEMINI_API_KEY) return res.status(500).json({ error: 'GEMINI_API_KEY is not configured' });

    const model = duration === 'track' ? 'lyria-3-pro-preview' : 'lyria-3-clip-preview';

    let contents: any = prompt;
    if (imageBase64) {
      let cleanBase64 = imageBase64;
      let mime = 'image/jpeg';
      if (imageBase64.includes(';base64,')) {
        const [p, d] = imageBase64.split(';base64,');
        cleanBase64 = d;
        const m = p.match(/data:([^;]+)/);
        if (m) mime = m[1];
      }
      contents = {
        parts: [
          { text: prompt },
          { inlineData: { data: cleanBase64, mimeType: mime } },
        ],
      };
    }

    const responseStream = await ai.models.generateContentStream({
      model,
      contents,
    });

    const audioChunks: Buffer[] = [];
    let lyrics = '';
    let mimeType = 'audio/mpeg';

    for await (const chunk of responseStream) {
      const parts = chunk.candidates?.[0]?.content?.parts;
      if (!parts) continue;
      for (const part of parts) {
        if (part.inlineData?.data) {
          if (audioChunks.length === 0 && part.inlineData.mimeType) {
            mimeType = part.inlineData.mimeType;
          }
          audioChunks.push(Buffer.from(part.inlineData.data, 'base64'));
        }
        if (part.text) {
          lyrics += part.text;
        }
      }
    }

    const audioBase64 = Buffer.concat(audioChunks).toString('base64');
    const filename = `lyria-${Date.now()}.mp3`;
    const filePath = path.join(OUTPUTS_DIR, filename);
    fs.writeFileSync(filePath, Buffer.from(audioBase64, 'base64'));

    return res.json({
      success: true,
      model,
      audioUrl: `data:${mimeType};base64,${audioBase64}`,
      downloadUrl: `/api/downloads/${filename}`,
      filename,
      lyrics,
      prompt,
    });
  } catch (err: any) {
    console.error('Music generation error:', err);
    return res.status(500).json({ error: err.message || 'Music generation failed' });
  }
});

// ==========================================
// AUDIO TRANSCRIPTION (gemini-3.5-transcribe)
// ==========================================
app.post('/api/audio/transcribe', async (req, res) => {
  try {
    const { audioBase64, mimeType = 'audio/webm' } = req.body;
    if (!audioBase64) return res.status(400).json({ error: 'Audio data is required' });
    if (!process.env.GEMINI_API_KEY) return res.status(500).json({ error: 'GEMINI_API_KEY is not configured' });

    let cleanBase64 = audioBase64;
    let finalMime = mimeType;
    if (audioBase64.includes(';base64,')) {
      const [p, d] = audioBase64.split(';base64,');
      cleanBase64 = d;
      const m = p.match(/data:([^;]+)/);
      if (m) finalMime = m[1];
    }

    const audioPart = {
      inlineData: {
        mimeType: finalMime,
        data: cleanBase64,
      },
    };

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-transcribe',
      contents: {
        parts: [audioPart, { text: 'Transcribe this audio precisely. Preserve formatting and punctuation.' }],
      },
    });

    return res.json({
      success: true,
      transcription: response.text || '',
      model: 'gemini-3.5-transcribe',
    });
  } catch (err: any) {
    console.error('Audio transcription error:', err);
    return res.status(500).json({ error: err.message || 'Transcription failed' });
  }
});

// ==========================================
// MAPS GROUNDING (gemini-3.8-flash googleMaps)
// ==========================================
app.post('/api/maps/grounding', async (req, res) => {
  try {
    const { prompt, latitude, longitude } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt is required' });
    if (!process.env.GEMINI_API_KEY) return res.status(500).json({ error: 'GEMINI_API_KEY is not configured' });

    const config: any = {
      tools: [{ googleMaps: {} }],
    };

    if (typeof latitude === 'number' && typeof longitude === 'number') {
      config.toolConfig = {
        retrievalConfig: {
          latLng: {
            latitude,
            longitude,
          },
        },
      };
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config,
    });

    const text = response.text || '';
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const places: any[] = [];

    for (const chunk of groundingChunks) {
      if ((chunk as any).maps?.uri) {
        places.push({
          title: (chunk as any).maps.title || 'Location',
          uri: (chunk as any).maps.uri,
          snippets: (chunk as any).maps.placeAnswerSources?.reviewSnippets || [],
        });
      }
    }

    return res.json({
      success: true,
      text,
      places,
      model: 'gemini-3.8-flash',
    });
  } catch (err: any) {
    console.error('Maps grounding error:', err);
    return res.status(500).json({ error: err.message || 'Maps query failed' });
  }
});

// API: Download Python Package Bundle metadata
app.get('/api/python-suite/code', (req, res) => {
  const streamlitCode = getStreamlitAppCode();
  const cliCode = getCliAppCode();
  const requirementsCode = getRequirementsCode();
  const batchScript = getWindowsBatchCode();
  const readmeCode = getReadmeCode();

  res.json({
    streamlit: streamlitCode,
    cli: cliCode,
    requirements: requirementsCode,
    batch: batchScript,
    readme: readmeCode,
  });
});

// Helper functions returning pristine Python code files
function getStreamlitAppCode(): string {
  return `"""
OmniAgent - Personal AI Assistant (Streamlit Web App)
Requirements:
    pip install streamlit google-genai python-dotenv
Run:
    streamlit run app.py
"""
import os
import streamlit as st
from google import genai
from google.genai import types
from dotenv import load_dotenv

# Load environment variables if available
load_dotenv()

# Page Configuration
st.set_page_config(
    page_title="OmniAgent - Personal AI Assistant",
    page_icon="🤖",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom Styling
st.markdown("""
<style>
    .main-header {
        font-size: 2.2rem;
        font-weight: 700;
        background: linear-gradient(90deg, #2563eb, #7c3aed);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        margin-bottom: 0.2rem;
    }
    .sub-header {
        color: #64748b;
        margin-bottom: 1.5rem;
    }
    .confirm-box {
        padding: 1rem;
        border-radius: 8px;
        background-color: #fef2f2;
        border: 1px solid #f87171;
        margin-top: 1rem;
        margin-bottom: 1rem;
    }
</style>
""", unsafe_allow_html=True)

# Initialize Session State
if "messages" not in st.session_state:
    st.session_state.messages = []
if "saved_files" not in st.session_state:
    st.session_state.saved_files = []
if "pending_save" not in st.session_state:
    st.session_state.pending_save = None

# Sidebar Configuration
with st.sidebar:
    st.title("⚙️ Agent Settings")
    
    # API Key Input
    env_api_key = os.getenv("GEMINI_API_KEY", "")
    api_key = st.text_input(
        "Gemini API Key",
        value=env_api_key,
        type="password",
        help="Get your free API key at https://aistudio.google.com/app/apikey"
    )
    
    st.divider()
    
    # Assistant Mode
    mode = st.selectbox(
        "Assistant Mode",
        [
            "General Assistant",
            "30 Freelance & Micro-Tasks Specialist",
            "Research & Market Trends",
            "YouTube Script Studio",
            "Content Creator (Blogs/Posts)",
            "Executive Email Drafter"
        ]
    )
    
    # Live Web Search Toggle
    use_search = st.toggle("🌐 Live Google Search Grounding", value=True, help="Fetch real-time information from the internet")
    
    st.divider()
    
    # Critical Action Shield Status
    st.markdown("### 🛡️ Human-in-the-Loop")
    st.caption("Active: Critical file saves require your explicit 'Yes/No' confirmation before writing to disk.")
    
    if st.button("🗑️ Clear Chat History"):
        st.session_state.messages = []
        st.session_state.pending_save = None
        st.rerun()

# Main Header
st.markdown('<div class="main-header">OmniAgent Personal Assistant</div>', unsafe_allow_html=True)
st.markdown('<div class="sub-header">Your autonomous partner for research, content, YouTube scripts, and emails.</div>', unsafe_allow_html=True)

# Guard: API Key check
if not api_key:
    st.warning("⚠️ Please enter your Gemini API Key in the left sidebar to start. You can get one for free at aistudio.google.com.")
    st.stop()

# Initialize Gemini Client
try:
    client = genai.Client(api_key=api_key)
except Exception as e:
    st.error(f"Failed to initialize Gemini Client: {e}")
    st.stop()

# System Instruction Mapping
SYSTEM_PROMPTS = {
    "General Assistant": "You are OmniAgent, a versatile personal assistant. Answer thoroughly and accurately.",
    "30 Freelance & Micro-Tasks Specialist": "You are a master Freelancing & Micro-Task specialist. You assist with all 30 online tasks (Data Entry, Excel formulas, Copy-Paste, Surveys, Image Annotation, AI Training, App Testing, SEO, Lead Gen, Translation, Transcriptions, Content, Video & 3D scripts). Provide immediate, professional, ready-to-deliver outputs.",
    "Research & Market Trends": "You are a Senior Research Analyst. Provide comprehensive research briefs, trending products, market signals, bullet points, and source citations.",
    "YouTube Script Studio": "You are a Viral YouTube Scriptwriter. Output complete scripts with suggested titles, hooks (0:00-0:30), visual/B-roll cues, host dialogue, and high-converting CTAs.",
    "Content Creator (Blogs/Posts)": "You are a master Content Strategist. Craft publication-ready articles, social posts, or newsletters with punchy hooks and structured subheadings.",
    "Executive Email Drafter": "You are an Executive Communications Specialist. Draft crisp, polite, high-converting emails with 3 subject line options and clear calls to action."
}

# Display Chat History
for msg in st.session_state.messages:
    with st.chat_message(msg["role"]):
        st.markdown(msg["content"])
        if "sources" in msg and msg["sources"]:
            with st.expander("🔗 Live Search Sources"):
                for src in msg["sources"]:
                    st.markdown(f"- [{src.get('title', 'Source')}]({src.get('uri', '#')})")

# Check for Pending Critical Action (Confirmation Dialog)
if st.session_state.pending_save:
    pending = st.session_state.pending_save
    st.markdown('<div class="confirm-box">', unsafe_allow_html=True)
    st.error("⚠️ **CRITICAL ACTION REQUIRED**")
    st.markdown(f"The agent is requesting to save the following document to your local machine as: \`{pending['filename']}\` ({len(pending['content'])} bytes).")
    st.markdown("**Do you want to proceed?**")
    
    col1, col2 = st.columns([1, 1])
    with col1:
        if st.button("✅ Yes, Proceed & Save", type="primary", use_container_width=True):
            try:
                # Write file safely
                os.makedirs("saved_agent_files", exist_ok=True)
                file_path = os.path.join("saved_agent_files", pending["filename"])
                with open(file_path, "w", encoding="utf-8") as f:
                    f.write(pending["content"])
                
                st.session_state.saved_files.append({
                    "filename": pending["filename"],
                    "path": file_path,
                    "preview": pending["content"][:200]
                })
                st.session_state.pending_save = None
                st.success(f"🎉 File successfully saved to: \`{file_path}\`")
                st.balloons()
                st.rerun()
            except Exception as err:
                st.error(f"Error writing file: {err}")
    with col2:
        if st.button("❌ No, Cancel Action", use_container_width=True):
            st.session_state.pending_save = None
            st.info("Action cancelled by user. No file was saved.")
            st.rerun()
    st.markdown('</div>', unsafe_allow_html=True)

# User Chat Input
user_input = st.chat_input("Ask your assistant (e.g., 'Research trending AI tools', 'Plan a YouTube script on productivity', 'Draft an email')...")

if user_input:
    # Append user message
    st.session_state.messages.append({"role": "user", "content": user_input})
    with st.chat_message("user"):
        st.markdown(user_input)
    
    # Generate Assistant Response
    with st.chat_message("assistant"):
        with st.spinner("🤖 Agent is thinking and researching..."):
            try:
                # Setup configuration
                tools = []
                if use_search:
                    tools.append(types.Tool(google_search=types.GoogleSearch()))
                
                config = types.GenerateContentConfig(
                    system_instruction=SYSTEM_PROMPTS.get(mode, "You are a helpful AI assistant."),
                    tools=tools if tools else None
                )
                
                response = client.models.generate_content(
                    model="gemini-3.8-flash",
                    contents=user_input,
                    config=config
                )
                
                response_text = response.text or ""
                st.markdown(response_text)
                
                # Extract grounding citations
                sources = []
                if response.candidates and response.candidates[0].grounding_metadata:
                    metadata = response.candidates[0].grounding_metadata
                    if metadata.grounding_chunks:
                        for chunk in metadata.grounding_chunks:
                            if chunk.web and chunk.web.uri:
                                sources.append({
                                    "title": chunk.web.title or chunk.web.uri,
                                    "uri": chunk.web.uri
                                })
                
                if sources:
                    with st.expander("🔗 Live Search Sources"):
                        for src in sources:
                            st.markdown(f"- [{src['title']}]({src['uri']})")
                
                # Save to session
                st.session_state.messages.append({
                    "role": "assistant",
                    "content": response_text,
                    "sources": sources
                })
                
                # Check if generated content should prompt a critical save action
                if len(response_text) > 300:
                    suggested_filename = f"{mode.lower().replace(' ', '_')}_{len(st.session_state.messages)}.md"
                    st.session_state.pending_save = {
                        "filename": suggested_filename,
                        "content": response_text
                    }
                    st.rerun()
                    
            except Exception as e:
                st.error(f"Error calling Gemini: {e}")

# Sidebar Saved Files List
with st.sidebar:
    if st.session_state.saved_files:
        st.divider()
        st.subheader("📁 Saved Local Files")
        for f in st.session_state.saved_files:
            st.caption(f"📄 **{f['filename']}**")
`;
}

function getCliAppCode(): string {
  return `"""
OmniAgent - Personal AI Assistant (Command Line Interface)
Requirements:
    pip install google-genai python-dotenv rich
Run:
    python agent_cli.py
"""
import os
import sys
from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()

# Setup terminal colors / rich formatting
try:
    from rich.console import Console
    from rich.panel import Panel
    from rich.markdown import Markdown
    from rich.prompt import Prompt, Confirm
    console = Console()
except ImportError:
    # Graceful fallback if rich is not yet installed
    class Console:
        def print(self, *args, **kwargs):
            print(*args)
    console = Console()
    Panel = lambda x, **kw: x
    Markdown = lambda x: x
    class Confirm:
        @staticmethod
        def ask(prompt):
            res = input(f"{prompt} (yes/no): ").strip().lower()
            return res in ["yes", "y"]
    class Prompt:
        @staticmethod
        def ask(prompt, default=None):
            val = input(f"{prompt} [{default}]: ") if default else input(f"{prompt}: ")
            return val or default

def main():
    console.print("\n" + "="*60, style="bold cyan")
    console.print("   🤖 OMNIAGENT: Personal AI Assistant (Windows CLI)", style="bold green")
    console.print("   Research | Content | YouTube Scripts | Emails", style="dim")
    console.print("="*60 + "\n", style="bold cyan")
    
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        api_key = Prompt.ask("🔑 Please enter your Gemini API Key")
        if not api_key:
            console.print("❌ Gemini API Key is required to run OmniAgent. Exiting.", style="bold red")
            sys.exit(1)
            
    client = genai.Client(api_key=api_key)
    
    MODES = {
        "1": ("General Assistant", "You are a versatile personal assistant."),
        "2": ("Research Assistant", "You are a Senior Research Analyst. Synthesize facts, market trends, and cite sources."),
        "3": ("YouTube Script Studio", "You are a Viral YouTube Scriptwriter. Output full scripts with hooks, visual cues, and CTAs."),
        "4": ("Executive Email Drafter", "You are an Executive Communications Specialist. Draft concise emails with 3 subject line options.")
    }
    
    console.print("Select Operating Mode:")
    for k, v in MODES.items():
        console.print(f"  [{k}] {v[0]}")
    mode_choice = Prompt.ask("Choose mode number", default="1")
    mode_name, system_prompt = MODES.get(mode_choice, MODES["1"])
    console.print(f"✅ Active Mode: [bold cyan]{mode_name}[/bold cyan]\n")
    
    os.makedirs("saved_agent_files", exist_ok=True)
    
    while True:
        console.print("\n[bold yellow]Enter your prompt[/bold yellow] (or type 'quit' / 'exit'):")
        user_input = input(">> ").strip()
        
        if user_input.lower() in ["quit", "exit", "q"]:
            console.print("👋 Goodbye!", style="bold green")
            break
            
        if not user_input:
            continue
            
        console.print("\n⏳ [cyan]Searching live web & generating response with Gemini...[/cyan]")
        
        try:
            # Enable Google Search Grounding for live internet retrieval
            tools = [types.Tool(google_search=types.GoogleSearch())]
            config = types.GenerateContentConfig(
                system_instruction=system_prompt,
                tools=tools
            )
            
            response = client.models.generate_content(
                model="gemini-3.8-flash",
                contents=user_input,
                config=config
            )
            
            output_text = response.text or ""
            
            # Print Markdown response
            console.print("\n" + "-"*50)
            console.print(Markdown(output_text))
            console.print("-"*50)
            
            # Print sources if available
            if response.candidates and response.candidates[0].grounding_metadata:
                metadata = response.candidates[0].grounding_metadata
                if metadata.grounding_chunks:
                    console.print("\n🌐 [bold]Live Search Grounding Sources:[/bold]")
                    for chunk in metadata.grounding_chunks:
                        if chunk.web and chunk.web.uri:
                            console.print(f" • [link={chunk.web.uri}]{chunk.web.title or chunk.web.uri}[/link]")
                            
            # CRITICAL ACTION CONFIRMATION FLOW
            # Whenever output is generated, offer to save to disk with strict human confirmation
            if len(output_text) > 200:
                default_name = f"{mode_name.lower().replace(' ', '_')}.md"
                console.print(f"\n⚠️  [bold yellow]CRITICAL ACTION PROMPT:[/bold yellow]")
                wants_save = Confirm.ask(f"Do you want to proceed and save this output to 'saved_agent_files/{default_name}'?")
                
                if wants_save:
                    target_filename = Prompt.ask("Confirm or modify filename", default=default_name)
                    file_path = os.path.join("saved_agent_files", target_filename)
                    with open(file_path, "w", encoding="utf-8") as f:
                        f.write(output_text)
                    console.print(f"✅ [bold green]Confirmed & Saved successfully to:[/bold green] {file_path}")
                else:
                    console.print("🛑 [dim]Action cancelled. No file was saved.[/dim]")
                    
        except Exception as err:
            console.print(f"❌ Error: {err}", style="bold red")

if __name__ == "__main__":
    main()
`;
}

function getRequirementsCode(): string {
  return `google-genai>=1.0.0
streamlit>=1.35.0
python-dotenv>=1.0.0
rich>=13.7.0
`;
}

function getWindowsBatchCode(): string {
  return `@echo off
title OmniAgent Launcher for Windows
echo ========================================================
echo        Starting OmniAgent Personal Assistant
echo ========================================================
echo.

:: Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python is not installed or not added to PATH!
    echo Please install Python from https://www.python.org/downloads/
    echo Remember to check the box "Add python.exe to PATH" during installation.
    pause
    exit /b
)

echo [1/3] Python detected.
echo [2/3] Checking and installing dependencies...
pip install -r requirements.txt
if errorlevel 1 (
    echo [ERROR] Failed to install dependencies.
    pause
    exit /b
)

echo [3/3] Launching OmniAgent Web App in your default browser...
echo.
streamlit run app.py
pause
`;
}

function getReadmeCode(): string {
  return `# OmniAgent - Personal AI Assistant

A complete personal AI agent powered by the **Google Gemini API** with:
- 🌐 **Live Internet Search Grounding** (fetches trending products, real-time facts, research)
- 🛡️ **Critical Action Confirmation** ("Do you want to proceed? Yes/No" before any file save or disk write)
- 🎬 **YouTube Script Studio** (hooks, visual/B-roll cues, host dialogue, CTAs)
- 🔬 **Research & Market Intelligence Briefs**
- ✉️ **Executive Email Drafter**

---

## 🚀 Easy Step-by-Step Instructions for Windows (No Coding Required)

### Step 1: Install Python
1. Go to [python.org/downloads](https://www.python.org/downloads/) and click the yellow **Download Python** button.
2. Run the downloaded installer.
3. ⚠️ **VERY IMPORTANT**: On the very first screen of the installer, check the box that says **"Add python.exe to PATH"**.
4. Click **Install Now** and wait for it to finish.

### Step 2: Get Your Free Gemini API Key
1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Sign in with your Google account.
3. Click **Create API Key** and copy your secret key.

### Step 3: Put All Files in a Folder
1. Create a new folder on your Desktop named \`OmniAgent\`.
2. Download and place these files inside the folder:
   - \`app.py\` (the web app)
   - \`agent_cli.py\` (the command line app)
   - \`requirements.txt\` (the dependencies list)
   - \`run_agent.bat\` (the one-click launcher)

### Step 4: Run the Application!
- **Easiest Way**: Just double-click \`run_agent.bat\`! It will automatically install the packages and open the assistant in your web browser.
- **Or via Terminal**:
  1. Hold \`Shift\` and Right-Click inside your \`OmniAgent\` folder, then click **"Open in Terminal"** or **"Open PowerShell window here"**.
  2. Type:
     \`\`\`bash
     pip install -r requirements.txt
     streamlit run app.py
     \`\`\`
  3. Enter your Gemini API key in the sidebar, and start commanding your agent!
`;
}

// In dev mode, mount Vite middlewares; in production serve static
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false, // Prevents failed WebSocket connection in AI Studio preview proxy
        host: '0.0.0.0',
        allowedHosts: true,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.resolve(distPath, 'index.html'));
      });
    }
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`OmniAgent server listening on 0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});

import React, { useState, useEffect, useRef } from 'react';
import {
  Image as ImageIcon,
  Sparkles,
  Wand2,
  Sliders,
  Download,
  RefreshCw,
  Upload,
  Eye,
  Check,
  Copy,
  Trash2,
  Layers,
  Search,
  Maximize2,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  FileDown,
  RotateCcw,
  Palette,
} from 'lucide-react';
import { ProposedAction } from '../types/agent';

interface ImageStudioProps {
  onRequestSaveAction?: (action: ProposedAction) => void;
}

interface ImageResult {
  id: string;
  imageUrl: string;
  downloadUrl?: string;
  filename: string;
  prompt: string;
  aspectRatio: string;
  imageSize: string;
  model: string;
  createdAt: string;
  textDescription?: string;
  originalImageUrl?: string;
  isEdit?: boolean;
}

const PRESET_CREATIVE_PROMPTS = [
  {
    title: 'Cyberpunk Tokyo Hologram',
    prompt: 'A cyberpunk street in futuristic Tokyo at midnight with glowing neon reflections on wet asphalt, floating holographic AI charts, ultra-detailed 8K photography, cinematic lighting',
    aspect: '16:9',
  },
  {
    title: 'Luxury Studio Product Shot',
    prompt: 'Minimalist luxury matte-black headphones resting on dark obsidian rock, soft directional rim lighting, mist effect, high-end commercial studio photography, Hasselblad medium format',
    aspect: '1:1',
  },
  {
    title: '3D Pixar Mascot Character',
    prompt: 'An adorable, friendly 3D robot companion with glowing turquoise eyes holding a holographic tablet, soft volumetric lighting, Pixar-render style, vibrant pastel gradients',
    aspect: '1:1',
  },
  {
    title: 'Cinematic Mountain Alpine',
    prompt: 'Breathtaking aerial view of snow-capped alpine peaks mirrored in a crystal clear turquoise glacial lake at sunrise, golden hour mist, national geographic photography, 8k resolution',
    aspect: '16:9',
  },
  {
    title: 'Mobile App Story Poster',
    prompt: 'Vertical editorial fashion portrait of a cybernetic model in iridescent chrome clothing, vibrant ambient purple and turquoise glow, magazine cover typography layout',
    aspect: '9:16',
  },
  {
    title: 'Minimalist Vector Logo',
    prompt: 'Clean geometric vector icon of an origami falcon taking flight, flat minimalist gradient colors, duotone deep sapphire and electric amber, Behance trending identity design',
    aspect: '1:1',
  },
];

const PRESET_EDIT_PROMPTS = [
  'Change the lighting to warm golden hour sunset with soft atmospheric haze',
  'Add glowing cyan and purple neon futuristic lines and holographic particle effects',
  'Transform the background into a sleek minimalist modern architecture luxury penthouse',
  'Turn this image into a textured classical oil painting with expressive brushstrokes',
  'Add high-tech cyberpunk glasses and a leather jacket to the character',
  'Remove the distracting elements in the background and replace with clean studio bokeh',
];

const ASPECT_RATIOS = [
  { label: '1:1', value: '1:1', desc: 'Square (Social)' },
  { label: '16:9', value: '16:9', desc: 'Cinematic / Landscape' },
  { label: '9:16', value: '9:16', desc: 'Story / Reel' },
  { label: '4:3', value: '4:3', desc: 'Classic Photo' },
  { label: '3:4', value: '3:4', desc: 'Portrait' },
  { label: '4:1', value: '4:1', desc: 'Panoramic Banner' },
  { label: '1:4', value: '1:4', desc: 'Skyscraper' },
  { label: '8:1', value: '8:1', desc: 'Ultra-wide' },
];

const RESOLUTIONS = [
  { label: '1K Standard', value: '1K', desc: 'Fast generation' },
  { label: '2K High-Res', value: '2K', desc: 'Crisp detail' },
  { label: '4K Ultra-HD', value: '4K', desc: 'Maximum fidelity' },
];

export const ImageStudio: React.FC<ImageStudioProps> = ({ onRequestSaveAction }) => {
  const [activeMode, setActiveMode] = useState<'create' | 'edit'>('create');
  
  // Generation Settings
  const [createPrompt, setCreatePrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [imageSize, setImageSize] = useState('1K');
  const [enableSearch, setEnableSearch] = useState(false);

  // Edit Settings
  const [editPrompt, setEditPrompt] = useState('');
  const [editSourceImage, setEditSourceImage] = useState<string | null>(null);
  const [editSourceMime, setEditSourceMime] = useState('image/png');
  const [editSourceFilename, setEditSourceFilename] = useState('uploaded-source.png');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Loading & State
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentResult, setCurrentResult] = useState<ImageResult | null>(null);
  const [history, setHistory] = useState<ImageResult[]>(() => {
    try {
      const saved = localStorage.getItem('omniagent_image_history');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Save history to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('omniagent_image_history', JSON.stringify(history.slice(0, 15)));
    } catch {}
  }, [history]);

  // Handle Text-to-Image Generation
  const handleGenerate = async () => {
    if (!createPrompt.trim()) {
      setError('Please enter a descriptive prompt for your image.');
      return;
    }
    setError(null);
    setIsProcessing(true);

    try {
      const res = await fetch('/api/images/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: createPrompt.trim(),
          aspectRatio,
          imageSize,
          enableSearch,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate image');
      }

      const newResult: ImageResult = {
        id: `img-${Date.now()}`,
        imageUrl: data.imageUrl,
        downloadUrl: data.downloadUrl,
        filename: data.filename,
        prompt: createPrompt.trim(),
        aspectRatio,
        imageSize,
        model: data.model || 'gemini-nano-banana-2.1',
        createdAt: data.createdAt || new Date().toISOString(),
        textDescription: data.textDescription,
        isEdit: false,
      };

      setCurrentResult(newResult);
      setHistory((prev) => [newResult, ...prev]);
    } catch (err: any) {
      console.error('Generation error:', err);
      setError(err.message || 'An error occurred during image generation.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Image Editing
  const handleEdit = async () => {
    if (!editSourceImage) {
      setError('Please upload or select an image to edit.');
      return;
    }
    if (!editPrompt.trim()) {
      setError('Please enter instructions for what changes to make to the image.');
      return;
    }
    setError(null);
    setIsProcessing(true);

    try {
      const res = await fetch('/api/images/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: editPrompt.trim(),
          imageBase64: editSourceImage,
          mimeType: editSourceMime,
          aspectRatio,
          imageSize,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to edit image');
      }

      const newResult: ImageResult = {
        id: `edit-${Date.now()}`,
        imageUrl: data.imageUrl,
        downloadUrl: data.downloadUrl,
        filename: data.filename,
        prompt: editPrompt.trim(),
        aspectRatio,
        imageSize,
        model: data.model || 'gemini-nano-banana-2.1',
        createdAt: data.createdAt || new Date().toISOString(),
        textDescription: data.textDescription,
        originalImageUrl: editSourceImage,
        isEdit: true,
      };

      setCurrentResult(newResult);
      setHistory((prev) => [newResult, ...prev]);
    } catch (err: any) {
      console.error('Edit error:', err);
      setError(err.message || 'An error occurred during image editing.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Upload handler for source image
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (PNG, JPG, WebP).');
      return;
    }

    setEditSourceFilename(file.name);
    setEditSourceMime(file.type);

    const reader = new FileReader();
    reader.onload = () => {
      setEditSourceImage(reader.result as string);
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  // Pipe generated image directly into Editor
  const handlePipeToEditor = (img: ImageResult) => {
    setEditSourceImage(img.imageUrl);
    setEditSourceMime('image/png');
    setEditSourceFilename(`source-${img.filename}`);
    setActiveMode('edit');
    setEditPrompt('Change lighting and enhance fine details with a futuristic atmosphere');
  };

  // Request Save to My Files via Human Confirmation Modal
  const handleSaveToFiles = (img: ImageResult) => {
    if (onRequestSaveAction) {
      onRequestSaveAction({
        action: 'save_file',
        filename: img.filename,
        content: `![${img.prompt}](${img.imageUrl})\n\n**Generated with**: ${img.model}\n**Prompt**: ${img.prompt}\n**Aspect Ratio**: ${img.aspectRatio} | **Resolution**: ${img.imageSize}\n**Date**: ${new Date(img.createdAt).toLocaleString()}`,
        format: 'markdown',
        type: 'general',
      });
    }
  };

  // Copy prompt or link
  const handleCopyPrompt = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Banner: Engine Identity & Capabilities */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950/80 to-purple-950/60 border border-indigo-500/30 p-6 sm:p-8 shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Next-Gen Image Intelligence</span>
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Create & Edit Images with{' '}
              <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400 bg-clip-text text-transparent">
                gemini-nano-banana-2.1
              </span>
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
              Generate photorealistic, high-fidelity images up to 4K resolution with Google Search grounding, or transform and restyle existing photos with natural language text prompts.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="px-3.5 py-2 rounded-2xl bg-slate-900/90 border border-slate-700/80 text-xs text-slate-300 flex items-center gap-2">
              <span className="font-semibold text-white">Engine:</span>
              <span className="font-mono text-indigo-400 font-bold">gemini-nano-banana-2.1</span>
            </div>
            <div className="px-3 py-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Paid Key Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* Mode Switcher Tabs */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2 p-1 bg-slate-900 rounded-2xl border border-slate-800">
          <button
            onClick={() => setActiveMode('create')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition ${
              activeMode === 'create'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Wand2 className="w-4 h-4" />
            <span>Create New Image</span>
          </button>
          <button
            onClick={() => setActiveMode('edit')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition ${
              activeMode === 'edit'
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md shadow-purple-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Palette className="w-4 h-4" />
            <span>Edit & Inpaint Image</span>
          </button>
        </div>

        <span className="text-xs text-slate-500 font-medium hidden sm:inline">
          {activeMode === 'create' ? 'Text-to-Image Generation' : 'Image-to-Image Text Editing'}
        </span>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-950/80 border border-rose-500/50 text-rose-200 text-xs sm:text-sm flex items-start gap-3 animate-in fade-in">
          <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-rose-300">Action could not be completed</p>
            <p className="mt-0.5 text-rose-200">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="text-rose-400 hover:text-rose-200 text-xs">
            Dismiss
          </button>
        </div>
      )}

      {/* Main Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Control Column (Inputs & Settings) */}
        <div className="lg:col-span-5 space-y-5">
          {/* CREATE MODE CONTROLS */}
          {activeMode === 'create' ? (
            <div className="bg-slate-900/90 rounded-3xl border border-slate-800 p-5 space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Wand2 className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Prompt Description</span>
                </label>
                <span className="text-[11px] text-indigo-400 font-medium">Text-to-Image</span>
              </div>

              <textarea
                value={createPrompt}
                onChange={(e) => setCreatePrompt(e.target.value)}
                placeholder="Describe your vision in rich detail (e.g. 'A sleek electric sports car speeding through a cybernetic rainforest at twilight, bioluminescent plants, rain reflections, 8K, unreal engine 5 render')..."
                rows={4}
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500/80 rounded-2xl p-3.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none transition"
              />

              {/* Quick Inspiration Pills */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Creative Presets:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_CREATIVE_PROMPTS.map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setCreatePrompt(p.prompt);
                        setAspectRatio(p.aspect);
                      }}
                      className="px-2.5 py-1 rounded-xl bg-slate-950 hover:bg-indigo-600/20 border border-slate-800 hover:border-indigo-500/40 text-[11px] text-slate-300 hover:text-white transition"
                    >
                      {p.title}
                    </button>
                  ))}
                </div>
              </div>

              {/* Aspect Ratio Selection */}
              <div className="space-y-2 pt-2 border-t border-slate-800/80">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-300">Aspect Ratio</span>
                  <span className="text-indigo-400 font-mono text-[11px] font-semibold">{aspectRatio}</span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {ASPECT_RATIOS.map((r) => (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => setAspectRatio(r.value)}
                      className={`px-2 py-1.5 rounded-xl border text-center transition flex flex-col items-center ${
                        aspectRatio === r.value
                          ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-white'
                      }`}
                    >
                      <span className="text-xs font-bold font-mono">{r.label}</span>
                      <span className="text-[9px] text-slate-300 truncate max-w-full opacity-80">{r.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Resolution Choice */}
              <div className="space-y-2 pt-2 border-t border-slate-800/80">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-300">Resolution (Nano Banana 2.1)</span>
                  <span className="text-indigo-400 font-mono text-[11px] font-semibold">{imageSize}</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {RESOLUTIONS.map((res) => (
                    <button
                      key={res.value}
                      type="button"
                      onClick={() => setImageSize(res.value)}
                      className={`p-2 rounded-xl border text-center transition ${
                        imageSize === res.value
                          ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-white'
                      }`}
                    >
                      <div className="text-xs font-bold font-mono">{res.label}</div>
                      <div className="text-[10px] text-slate-300 opacity-70">{res.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Google Search Grounding for Images */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950 border border-slate-800/80">
                <div className="flex items-center gap-2">
                  <Search className="w-4 h-4 text-cyan-400" />
                  <div>
                    <p className="text-xs font-semibold text-white">Google Image Search Context</p>
                    <p className="text-[10px] text-slate-400">Ground images on real-time web & visual search data</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEnableSearch(!enableSearch)}
                  className={`w-10 h-6 flex items-center rounded-full p-1 transition duration-300 ${
                    enableSearch ? 'bg-indigo-600 justify-end' : 'bg-slate-800 justify-start'
                  }`}
                >
                  <div className="bg-white w-4 h-4 rounded-full shadow-md" />
                </button>
              </div>

              {/* Generate Button */}
              <button
                type="button"
                onClick={handleGenerate}
                disabled={isProcessing}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-blue-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 text-white font-bold text-sm shadow-xl shadow-indigo-600/25 flex items-center justify-center gap-2 transition duration-200"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span>Generating Image with gemini-nano-banana-2.1...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-indigo-200" />
                    <span>Generate Image ({imageSize})</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            /* EDIT MODE CONTROLS */
            <div className="bg-slate-900/90 rounded-3xl border border-slate-800 p-5 space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-purple-400" />
                  <span>Image-to-Image & Inpainting</span>
                </label>
                <span className="text-[11px] text-purple-400 font-medium">Text-Guided Edit</span>
              </div>

              {/* Source Image Selector */}
              <div className="space-y-2">
                <span className="text-[11px] font-semibold text-slate-300">1. Original Image:</span>
                {editSourceImage ? (
                  <div className="relative group rounded-2xl overflow-hidden border border-slate-700 bg-slate-950 p-2">
                    <img
                      src={editSourceImage}
                      alt="Source for editing"
                      referrerPolicy="no-referrer"
                      className="w-full h-40 object-contain rounded-xl bg-slate-900"
                    />
                    <div className="absolute top-3 right-3 flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-2 py-1 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-[11px] text-white border border-slate-700 transition"
                      >
                        Change Image
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditSourceImage(null)}
                        className="p-1 rounded-lg bg-rose-950/90 text-rose-300 border border-rose-800 hover:bg-rose-900 transition"
                        title="Remove"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1 truncate px-1">
                      File: {editSourceFilename}
                    </p>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-800 hover:border-purple-500/60 rounded-2xl p-6 text-center cursor-pointer bg-slate-950/60 hover:bg-purple-950/10 transition group"
                  >
                    <Upload className="w-8 h-8 text-slate-500 group-hover:text-purple-400 mx-auto mb-2 transition" />
                    <p className="text-xs font-semibold text-slate-300 group-hover:text-white">
                      Click to upload an image or drag & drop
                    </p>
                    <p className="text-[10px] text-slate-500 mt-1">PNG, JPG, or WebP up to 10MB</p>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png, image/jpeg, image/webp"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>

              {/* Editing Instructions */}
              <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                <span className="text-[11px] font-semibold text-slate-300">2. Text Instructions for Edit:</span>
                <textarea
                  value={editPrompt}
                  onChange={(e) => setEditPrompt(e.target.value)}
                  placeholder="Tell gemini-nano-banana-2.1 what to modify (e.g. 'Add glowing sunglasses and leather jacket', 'Change background to Tokyo skyline', 'Make it an oil painting')..."
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-purple-500/80 rounded-2xl p-3.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 resize-none transition"
                />
              </div>

              {/* Quick Editing Presets */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Quick Modifiers:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_EDIT_PROMPTS.map((promptText, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setEditPrompt(promptText)}
                      className="px-2.5 py-1 rounded-xl bg-slate-950 hover:bg-purple-600/20 border border-slate-800 hover:border-purple-500/40 text-[11px] text-slate-300 hover:text-white transition"
                    >
                      {promptText.slice(0, 32)}...
                    </button>
                  ))}
                </div>
              </div>

              {/* Edit Resolution & Aspect */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800/80">
                <div>
                  <label className="text-[11px] font-bold text-slate-400">Aspect Ratio</label>
                  <select
                    value={aspectRatio}
                    onChange={(e) => setAspectRatio(e.target.value)}
                    className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
                  >
                    {ASPECT_RATIOS.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label} - {r.desc}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-400">Resolution</label>
                  <select
                    value={imageSize}
                    onChange={(e) => setImageSize(e.target.value)}
                    className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
                  >
                    {RESOLUTIONS.map((res) => (
                      <option key={res.value} value={res.value}>
                        {res.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Edit Execute Button */}
              <button
                type="button"
                onClick={handleEdit}
                disabled={isProcessing || !editSourceImage}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 hover:from-purple-500 hover:to-rose-500 disabled:opacity-50 text-white font-bold text-sm shadow-xl shadow-purple-600/25 flex items-center justify-center gap-2 transition duration-200"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span>Applying Edits with gemini-nano-banana-2.1...</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4 text-purple-200" />
                    <span>Apply Image Edit ({imageSize})</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Right Output & Canvas Column */}
        <div className="lg:col-span-7 space-y-6">
          {/* Active Result Canvas */}
          <div className="bg-slate-900/90 rounded-3xl border border-slate-800 overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-950/60">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-bold text-slate-200">
                  {currentResult ? (currentResult.isEdit ? 'Edited Image Output' : 'Generated Image Output') : 'Studio Preview Canvas'}
                </span>
                {currentResult && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    {currentResult.imageSize} • {currentResult.aspectRatio}
                  </span>
                )}
              </div>

              {currentResult && (
                <div className="flex items-center gap-1.5">
                  <a
                    href={currentResult.imageUrl}
                    download={currentResult.filename}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white transition flex items-center gap-1 text-xs"
                    title="Download Image"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Download</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => handlePipeToEditor(currentResult)}
                    className="p-1.5 rounded-lg bg-purple-600/20 text-purple-300 hover:bg-purple-600 hover:text-white border border-purple-500/30 transition flex items-center gap-1 text-xs"
                    title="Pipe image to editor"
                  >
                    <Wand2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Edit This</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveToFiles(currentResult)}
                    className="p-1.5 rounded-lg bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600 hover:text-white border border-emerald-500/30 transition flex items-center gap-1 text-xs"
                    title="Save to My Files with human confirmation"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Save File</span>
                  </button>
                </div>
              )}
            </div>

            {/* Canvas Area */}
            <div className="p-6 min-h-[380px] flex items-center justify-center bg-slate-950/40">
              {isProcessing ? (
                <div className="text-center py-16 space-y-4">
                  <div className="relative w-16 h-16 mx-auto">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 animate-spin blur-lg opacity-60" />
                    <div className="absolute inset-0 w-16 h-16 rounded-2xl bg-slate-900 border border-indigo-500 flex items-center justify-center">
                      <Sparkles className="w-8 h-8 text-indigo-400 animate-pulse" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base">Processing with gemini-nano-banana-2.1</h3>
                    <p className="text-slate-400 text-xs mt-1 max-w-sm mx-auto">
                      Synthesizing pixels, neural lighting, textures, and composition. This typically takes 5–15 seconds...
                    </p>
                  </div>
                </div>
              ) : currentResult ? (
                <div className="w-full space-y-4">
                  {/* Side-by-side if it was an edit with original image */}
                  {currentResult.originalImageUrl ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          Before (Original)
                        </span>
                        <div className="rounded-2xl overflow-hidden border border-slate-800 bg-slate-900 shadow-md">
                          <img
                            src={currentResult.originalImageUrl}
                            alt="Original"
                            referrerPolicy="no-referrer"
                            className="w-full h-64 object-contain"
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400">
                          After (Edited with Nano Banana 2.1)
                        </span>
                        <div className="rounded-2xl overflow-hidden border border-purple-500/50 bg-slate-900 shadow-xl ring-2 ring-purple-500/20">
                          <img
                            src={currentResult.imageUrl}
                            alt="Edited"
                            referrerPolicy="no-referrer"
                            className="w-full h-64 object-contain"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Single High-Res Display */
                    <div className="rounded-2xl overflow-hidden border border-slate-800 bg-slate-900/60 shadow-2xl max-h-[500px] flex items-center justify-center p-2">
                      <img
                        src={currentResult.imageUrl}
                        alt={currentResult.prompt}
                        referrerPolicy="no-referrer"
                        className="max-h-[480px] w-auto max-w-full object-contain rounded-xl"
                      />
                    </div>
                  )}

                  {/* Metadata & Prompt Breakdown */}
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-400">Prompt:</span>
                      <button
                        type="button"
                        onClick={() => handleCopyPrompt(currentResult.prompt, currentResult.id)}
                        className="text-[11px] text-indigo-400 hover:text-white flex items-center gap-1 transition"
                      >
                        {copiedId === currentResult.id ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span>Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy Prompt</span>
                          </>
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-slate-200 leading-relaxed font-mono bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                      "{currentResult.prompt}"
                    </p>
                    {currentResult.textDescription && (
                      <p className="text-[11px] text-slate-400 italic">
                        {currentResult.textDescription}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-16 space-y-3">
                  <div className="p-4 rounded-3xl bg-slate-900/80 border border-slate-800 inline-block text-slate-500">
                    <ImageIcon className="w-12 h-12 stroke-1" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-300 text-sm">Ready to create or edit</h3>
                    <p className="text-slate-500 text-xs mt-1 max-w-xs mx-auto">
                      Type your prompt on the left and click Generate, or switch to Edit mode to upload and modify photos.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Creation History Gallery */}
          {history.length > 0 && (
            <div className="bg-slate-900/80 rounded-3xl border border-slate-800 p-5 space-y-3 shadow-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-purple-400" />
                  <span className="text-xs font-bold text-slate-200">Recent Studio Generations</span>
                  <span className="text-[10px] text-slate-500 font-mono">({history.length})</span>
                </div>
                <button
                  type="button"
                  onClick={() => setHistory([])}
                  className="text-[11px] text-slate-500 hover:text-rose-400 flex items-center gap-1 transition"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Clear History</span>
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-72 overflow-y-auto pr-1">
                {history.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setCurrentResult(item)}
                    className="group relative cursor-pointer rounded-2xl overflow-hidden border border-slate-800 hover:border-indigo-500/50 bg-slate-950 transition aspect-square"
                  >
                    <img
                      src={item.imageUrl}
                      alt={item.prompt}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent opacity-0 group-hover:opacity-100 transition p-2 flex flex-col justify-end">
                      <p className="text-[10px] font-medium text-white line-clamp-2">
                        {item.prompt}
                      </p>
                      <span className="text-[9px] text-indigo-400 font-mono mt-1">
                        {item.aspectRatio} • {item.imageSize}
                      </span>
                    </div>
                    {item.isEdit && (
                      <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-600/90 text-white shadow">
                        Edit
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

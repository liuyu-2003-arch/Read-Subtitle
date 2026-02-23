import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Upload, 
  Search, 
  ArrowLeft, 
  Download, 
  FileText, 
  Clock, 
  ChevronRight,
  Plus,
  X,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  Languages
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { GoogleGenAI } from "@google/genai";

// --- Utility ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---
interface Subtitle {
  id: number;
  filename: string;
  original_name: string;
  created_at: string;
}

interface SubtitleDetail extends Subtitle {
  content: string;
  parsed_json: { start: string; end: string; text: string }[];
}

// --- Components ---

const Button = ({ 
  children, 
  onClick, 
  variant = 'primary', 
  className,
  disabled
}: { 
  children: React.ReactNode; 
  onClick?: () => void; 
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  className?: string;
  disabled?: boolean;
}) => {
  const variants = {
    primary: 'bg-[#1a1a1a] text-white hover:bg-[#333]',
    secondary: 'bg-[#f0ede9] text-[#1a1a1a] hover:bg-[#e5e2de]',
    outline: 'border border-[#1a1a1a]/20 text-[#1a1a1a] hover:bg-[#1a1a1a]/5',
    ghost: 'text-[#1a1a1a]/60 hover:text-[#1a1a1a] hover:bg-[#1a1a1a]/5'
  };

  return (
    <button 
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        className
      )}
    >
      {children}
    </button>
  );
};

const Card = ({ children, className, onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) => (
  <div 
    onClick={onClick}
    className={cn(
      'bg-white border border-[#1a1a1a]/5 rounded-2xl p-6 transition-all duration-300 hover:shadow-xl hover:shadow-[#1a1a1a]/5 hover:-translate-y-1 cursor-pointer group',
      className
    )}
  >
    {children}
  </div>
);

// --- Main App ---

export default function App() {
  const [view, setView] = useState<'archive' | 'reader'>('archive');
  const [selectedFilename, setSelectedFilename] = useState<string | null>(null);
  const [subtitles, setSubtitles] = useState<Subtitle[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchSubtitles();
  }, []);

  const fetchSubtitles = async () => {
    try {
      const res = await fetch('/api/subtitles');
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Failed to fetch subtitles: ${res.status} ${text.slice(0, 100)}`);
      }
      const data = await res.json();
      setSubtitles(data);
    } catch (err) {
      console.error('Failed to fetch subtitles', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/subtitles/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!res.ok) {
        const text = await res.text();
        console.error('Upload error response:', text);
        throw new Error(`Upload failed: ${res.status} ${text.slice(0, 100)}`);
      }

      const data = await res.json();
      if (data.filename) {
        await fetchSubtitles();
        handleOpenReader(data.filename);
      }
    } catch (err) {
      console.error('Upload failed', err);
      alert(`Upload failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleOpenReader = (filename: string) => {
    setSelectedFilename(filename);
    setView('reader');
    window.scrollTo(0, 0);
  };

  const filteredSubtitles = subtitles.filter(s => 
    s.original_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.filename.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen selection:bg-[#1a1a1a] selection:text-white">
      <AnimatePresence mode="wait">
        {view === 'archive' ? (
          <motion.div 
            key="archive"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="max-w-6xl mx-auto px-6 py-16 md:py-32"
          >
            {/* Header Section */}
            <header className="relative mb-24">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-12">
                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="h-[1px] w-12 bg-[#1a1a1a]/20 animate-line" />
                    <span className="text-[10px] uppercase tracking-[0.3em] font-bold text-[#1a1a1a]/40">Collection</span>
                  </div>
                  <h1 className="display text-3xl md:text-4xl font-medium tracking-tight leading-none">
                    字幕阅读
                  </h1>
                </div>

                <div className="flex flex-col gap-6">
                  <div className="flex items-center gap-3">
                    <div className="relative group flex-1 md:flex-none">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#1a1a1a]/20 group-focus-within:text-[#1a1a1a] transition-colors" size={16} />
                      <input 
                        type="text" 
                        placeholder="Search archive..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-11 pr-6 py-3 bg-white/50 border border-[#1a1a1a]/5 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-[#1a1a1a]/5 w-full md:w-72 transition-all placeholder:text-[#1a1a1a]/20"
                      />
                    </div>
                    <Button onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="h-[46px] px-6">
                      {isUploading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Plus size={18} />}
                      <span>Upload</span>
                    </Button>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleUpload} 
                      accept=".srt,.vtt,.ass" 
                      className="hidden" 
                    />
                  </div>
                  <div className="flex items-center gap-4 text-[10px] uppercase tracking-widest font-bold text-[#1a1a1a]/30 justify-end">
                    <span>{subtitles.length} Items</span>
                    <span className="w-1 h-1 bg-[#1a1a1a]/10 rounded-full" />
                    <span>Updated {new Date().toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </header>

            {/* Subtitle List */}
            {loading ? (
              <div className="flex items-center justify-center py-32">
                <div className="w-6 h-6 border-2 border-[#1a1a1a]/5 border-t-[#1a1a1a] rounded-full animate-spin" />
              </div>
            ) : filteredSubtitles.length > 0 ? (
              <div className="grid grid-cols-1 gap-px bg-[#1a1a1a]/5 border border-[#1a1a1a]/5 rounded-3xl overflow-hidden soft-shadow">
                {filteredSubtitles.map((sub) => (
                  <div key={sub.id} className="bg-white group">
                    <button 
                      onClick={() => handleOpenReader(sub.filename)}
                      className="w-full text-left px-8 py-10 flex items-center justify-between transition-all duration-500 hover:bg-[#fcfaf8]"
                    >
                      <div className="flex items-center gap-10">
                        <div className="serif text-4xl text-[#1a1a1a]/10 group-hover:text-[#1a1a1a] transition-colors duration-500 w-12 text-center">
                          {sub.original_name.charAt(0).toUpperCase()}
                        </div>
                        <div className="space-y-2">
                          <h3 className="serif text-2xl font-medium text-[#1a1a1a] group-hover:translate-x-1 transition-transform duration-500">{sub.original_name}</h3>
                          <div className="flex items-center gap-6 text-[10px] uppercase tracking-[0.15em] font-bold text-[#1a1a1a]/30">
                            <span className="flex items-center gap-2"><Clock size={12} className="opacity-50" /> {new Date(sub.created_at).toLocaleDateString()}</span>
                            <span className="px-2 py-0.5 bg-[#1a1a1a]/5 rounded text-[#1a1a1a]/60">{sub.filename.split('-').pop()}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 opacity-0 group-hover:opacity-100 -translate-x-4 group-hover:translate-x-0 transition-all duration-500">
                        <span className="text-[10px] uppercase tracking-widest font-bold text-[#1a1a1a]/40">Open Reader</span>
                        <ChevronRight size={18} className="text-[#1a1a1a]/20" />
                      </div>
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-40 bg-white/30 border border-dashed border-[#1a1a1a]/10 rounded-[40px]">
                <div className="w-20 h-20 bg-[#f0ede9] rounded-full flex items-center justify-center mx-auto mb-8 text-[#1a1a1a]/10">
                  <FileText size={40} strokeWidth={1} />
                </div>
                <h3 className="display text-3xl font-medium mb-3">Your archive is empty</h3>
                <p className="text-[#1a1a1a]/40 max-w-xs mx-auto text-sm leading-relaxed">
                  Start your collection by uploading your first subtitle file. Supports SRT, VTT, and ASS formats.
                </p>
              </div>
            )}
          </motion.div>
        ) : (
          <ReaderView 
            filename={selectedFilename!} 
            onBack={() => setView('archive')} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// --- Reader View Component ---

const ReaderView = ({ filename, onBack }: { filename: string; onBack: () => void }) => {
  const [data, setData] = useState<SubtitleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Playback State
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [activeLineIndex, setActiveLineIndex] = useState<number | null>(null);
  const [translations, setTranslations] = useState<Record<number, string>>({});
  const [isTranslating, setIsTranslating] = useState(false);
  const [selectedWord, setSelectedWord] = useState<{ text: string; lineIndex: number } | null>(null);
  const [wordTranslation, setWordTranslation] = useState<string | null>(null);
  const [isTranslatingWord, setIsTranslatingWord] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const lineRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/subtitles/${filename}`);
        if (!res.ok) throw new Error('Failed to fetch');
        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error('Failed to fetch subtitle details', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [filename]);

  // Helper to convert time string (00:00:00.000) to seconds
  const timeToSeconds = (timeStr: string) => {
    const [h, m, s] = timeStr.split(':');
    return parseFloat(h) * 3600 + parseFloat(m) * 60 + parseFloat(s);
  };

  const totalDuration = data?.parsed_json.length 
    ? timeToSeconds(data.parsed_json[data.parsed_json.length - 1].end) 
    : 0;

  useEffect(() => {
    if (isPlaying) {
      const startTime = Date.now() - currentTime * 1000;
      timerRef.current = setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000;
        if (elapsed >= totalDuration) {
          setIsPlaying(false);
          setCurrentTime(totalDuration);
          clearInterval(timerRef.current!);
        } else {
          setCurrentTime(elapsed);
        }
      }, 50);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, totalDuration]);

  useEffect(() => {
    if (!data) return;
    const index = data.parsed_json.findIndex(line => {
      const start = timeToSeconds(line.start);
      const end = timeToSeconds(line.end);
      return currentTime >= start && currentTime <= end;
    });
    
    if (index !== -1 && index !== activeLineIndex) {
      setActiveLineIndex(index);
      // Auto-scroll to active line
      lineRefs.current[index]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentTime, data, activeLineIndex]);

  const handleTranslate = async (index: number) => {
    if (!data || translations[index] || isTranslating) return;

    const text = data.parsed_json[index].text;
    if (!text.trim()) return;

    setIsTranslating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Translate the following subtitle line. If it is English, translate to Chinese. If it is Chinese, translate to English. Return ONLY the translated text, no explanations or quotes: "${text}"`,
      });
      
      const translatedText = response.text?.trim() || "";
      setTranslations(prev => ({ ...prev, [index]: translatedText }));
    } catch (err) {
      console.error("Translation failed", err);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleJumpToLine = (index: number) => {
    if (!data) return;
    const startTime = timeToSeconds(data.parsed_json[index].start);
    // Add a tiny offset to ensure we fall within the line's range 
    // and avoid boundary issues with the previous line's end time.
    setCurrentTime(startTime + 0.01);
    setActiveLineIndex(index);
    setSelectedWord(null); // Clear word focus when clicking a line
    handleTranslate(index); // Manually trigger translation on click
  };

  const handleWordClick = async (e: React.MouseEvent, word: string, lineIndex: number) => {
    e.stopPropagation(); // Prevent line jump when clicking a word
    const cleanWord = word.replace(/[.,!?;:()]/g, "").trim();
    if (!cleanWord) return;

    setSelectedWord({ text: cleanWord, lineIndex });
    setIsTranslatingWord(true);
    setWordTranslation(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Translate this specific word/phrase from the subtitle. If English, translate to Chinese. If Chinese, translate to English. Provide a very brief definition or equivalent: "${cleanWord}"`,
      });
      setWordTranslation(response.text?.trim() || "");
    } catch (err) {
      console.error("Word translation failed", err);
    } finally {
      setIsTranslatingWord(false);
    }
  };

  const handleDownload = () => {
    window.location.href = `/api/subtitles/${filename}/download`;
  };

  const togglePlay = () => setIsPlaying(!isPlaying);
  const resetPlayback = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    setActiveLineIndex(null);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8f5f2]">
      <div className="w-6 h-6 border-2 border-[#1a1a1a]/5 border-t-[#1a1a1a] rounded-full animate-spin" />
    </div>
  );

  if (!data) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-[#f8f5f2]">
      <p className="display text-3xl">Document not found</p>
      <Button variant="outline" onClick={onBack}>Return to Archive</Button>
    </div>
  );

  const filteredLines = data.parsed_json.filter(line => 
    line.text.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen flex flex-col bg-[#f8f5f2]"
    >
      {/* Reader Nav */}
      <nav className="sticky top-0 z-50 bg-[#f8f5f2]/80 backdrop-blur-xl border-b border-[#1a1a1a]/5 px-8 py-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button onClick={onBack} className="p-2 hover:bg-[#1a1a1a]/5 rounded-full transition-colors group">
              <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            </button>
            <div className="h-4 w-px bg-[#1a1a1a]/10" />
            <div className="flex flex-col">
              <span className="text-[9px] uppercase tracking-[0.2em] font-bold text-[#1a1a1a]/30 mb-0.5">Reading</span>
              <h2 className="serif text-lg font-medium truncate max-w-[180px] md:max-w-md">{data.original_name}</h2>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#1a1a1a]/20" size={14} />
              <input 
                type="text" 
                placeholder="Search transcript..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 bg-white/50 border border-[#1a1a1a]/5 rounded-full text-[11px] focus:outline-none focus:ring-2 focus:ring-[#1a1a1a]/5 w-56 transition-all placeholder:text-[#1a1a1a]/20"
              />
            </div>
            <Button variant="outline" onClick={handleDownload} className="h-9 px-4 text-xs">
              <Download size={14} />
              <span className="hidden sm:inline">Download Original</span>
            </Button>
          </div>
        </div>
      </nav>

      {/* Playback Control Bar (Floating) */}
      <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl px-6">
        <div className="glass-card rounded-full px-8 py-4 flex items-center gap-6 soft-shadow border-[#1a1a1a]/5">
          <button 
            onClick={togglePlay}
            className="w-12 h-12 rounded-full bg-[#1a1a1a] text-white flex items-center justify-center hover:scale-105 transition-transform shrink-0"
          >
            {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} className="translate-x-[1px]" fill="currentColor" />}
          </button>
          
          <div className="flex-1 space-y-2">
            <div className="flex justify-between text-[10px] font-mono font-bold text-[#1a1a1a]/40 uppercase tracking-widest">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(totalDuration)}</span>
            </div>
            <div className="relative h-1.5 bg-[#1a1a1a]/5 rounded-full overflow-hidden">
              <motion.div 
                className="absolute inset-y-0 left-0 bg-[#1a1a1a]"
                style={{ width: `${(currentTime / totalDuration) * 100}%` }}
              />
              <input 
                type="range" 
                min="0" 
                max={totalDuration} 
                step="0.1"
                value={currentTime}
                onChange={(e) => setCurrentTime(parseFloat(e.target.value))}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </div>
          </div>

          <button 
            onClick={resetPlayback}
            className="p-2 text-[#1a1a1a]/40 hover:text-[#1a1a1a] transition-colors"
            title="Reset"
          >
            <RotateCcw size={18} />
          </button>
        </div>
      </div>

      <main className="flex-1 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-20 px-8 py-20 pb-48">
        {/* Transcript Area */}
        <div className="space-y-20">
          <header className="space-y-8">
            <div className="flex items-center gap-4">
              <div className="h-[1px] w-12 bg-[#1a1a1a]/20" />
              <span className="text-[10px] uppercase tracking-[0.3em] font-bold text-[#1a1a1a]/40">Transcript</span>
            </div>
            <h1 className="display text-5xl md:text-7xl font-medium leading-[1.1] tracking-tight">{data.original_name}</h1>
            <div className="flex flex-wrap gap-8 text-[10px] uppercase tracking-widest font-bold text-[#1a1a1a]/30">
              <div className="flex flex-col gap-1">
                <span className="text-[#1a1a1a]/20">Sentences</span>
                <span className="text-[#1a1a1a]">{data.parsed_json.length}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[#1a1a1a]/20">Uploaded</span>
                <span className="text-[#1a1a1a]">{new Date(data.created_at).toLocaleDateString()}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[#1a1a1a]/20">Format</span>
                <span className="text-[#1a1a1a]">{data.original_name.split('.').pop()?.toUpperCase()}</span>
              </div>
            </div>
          </header>

          <div className="space-y-12">
            {data.parsed_json.map((line, idx) => {
              const isActive = activeLineIndex === idx;
              const isVisible = searchQuery === '' || line.text.toLowerCase().includes(searchQuery.toLowerCase());
              
              if (!isVisible) return null;

              return (
                <div 
                  key={idx} 
                  ref={el => lineRefs.current[idx] = el}
                  onClick={() => handleJumpToLine(idx)}
                  className={cn(
                    "group flex gap-10 md:gap-16 transition-all duration-700 p-6 -mx-6 rounded-3xl cursor-pointer",
                    isActive ? "bg-white soft-shadow scale-[1.02]" : "opacity-40 hover:opacity-100"
                  )}
                >
                  <div className={cn(
                    "w-20 pt-1.5 text-[11px] font-mono transition-colors shrink-0 tabular-nums",
                    isActive ? "text-[#1a1a1a] font-bold" : "text-[#1a1a1a]/20"
                  )}>
                    {line.start.split('.')[0]}
                  </div>
                  <div className={cn(
                    "flex-1 text-xl md:text-2xl leading-[1.6] transition-all duration-700 serif flex flex-wrap gap-x-2",
                    isActive ? "text-[#1a1a1a]" : "text-[#1a1a1a]/70"
                  )}>
                    {line.text.split(/\s+/).map((word, wIdx) => (
                      <span 
                        key={wIdx}
                        onClick={(e) => handleWordClick(e, word, idx)}
                        className={cn(
                          "hover:text-[#1a1a1a] hover:underline underline-offset-4 decoration-[#1a1a1a]/20 transition-all",
                          selectedWord?.text === word.replace(/[.,!?;:()]/g, "").trim() && selectedWord?.lineIndex === idx && "text-[#1a1a1a] underline decoration-[#1a1a1a]"
                        )}
                      >
                        {word}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
            {filteredLines.length === 0 && (
              <div className="py-32 text-center text-[#1a1a1a]/20 display text-2xl italic">
                No matching lines found in transcript.
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Info */}
        <aside className="hidden lg:block">
          <div className="sticky top-32 space-y-16">
            <section className="space-y-8">
              <h4 className="text-[10px] uppercase tracking-[0.3em] font-bold text-[#1a1a1a]/30">Now Reading</h4>
              <div className="aspect-[3/4] rounded-[40px] bg-[#1a1a1a] p-10 flex flex-col justify-between text-white overflow-hidden relative group soft-shadow shadow-[#1a1a1a]/20">
                <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_50%_0%,#ffffff_0%,transparent_70%)]" />
                <div className="relative z-10 flex-1 flex flex-col justify-center">
                  <AnimatePresence mode="wait">
                    {selectedWord ? (
                      <motion.div 
                        key={`word-${selectedWord.text}`}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="space-y-6"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-[9px] uppercase tracking-widest font-bold opacity-30">
                            <Search size={10} />
                            <span>Word Focus</span>
                          </div>
                          <button onClick={(e) => { e.stopPropagation(); setSelectedWord(null); }} className="opacity-30 hover:opacity-100">
                            <X size={14} />
                          </button>
                        </div>
                        <div className="space-y-2">
                          <div className="display text-5xl font-medium tracking-tight">{selectedWord.text}</div>
                          <div className="serif text-xl opacity-60 italic">
                            {isTranslatingWord ? "Searching..." : wordTranslation || "No definition found"}
                          </div>
                        </div>
                        <div className="h-px bg-white/10 w-12" />
                        <div className="space-y-2">
                          <div className="text-[9px] uppercase tracking-widest font-bold opacity-30">Context Translation</div>
                          <div className="serif text-lg leading-tight opacity-80">
                            {translations[selectedWord.lineIndex] || "..."}
                          </div>
                        </div>
                      </motion.div>
                    ) : activeLineIndex !== null && (translations[activeLineIndex] || isTranslating) ? (
                      <motion.div 
                        key={`trans-${activeLineIndex}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-4"
                      >
                        <div className="flex items-center gap-2 text-[9px] uppercase tracking-widest font-bold opacity-30">
                          <Languages size={10} />
                          <span>Translation</span>
                        </div>
                        <div className="serif text-3xl font-light leading-tight tracking-tight">
                          {translations[activeLineIndex] || (
                            <span className="opacity-30 animate-pulse">Translating...</span>
                          )}
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div 
                        key="default"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="display text-4xl font-light leading-tight tracking-tight"
                      >
                        Editorial <br />
                        <span className="italic opacity-50">Archive</span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <div className="relative z-10 flex items-end justify-between">
                  <div className="flex flex-col">
                    <span className="text-[9px] uppercase tracking-widest font-bold opacity-30 mb-1">Position</span>
                    <span className="text-xl font-mono tracking-tighter">
                      {(activeLineIndex !== null ? activeLineIndex + 1 : 0).toString().padStart(2, '0')} / {data.parsed_json.length}
                    </span>
                  </div>
                  <div className={cn(
                    "w-12 h-12 rounded-full border border-white/20 flex items-center justify-center transition-all duration-500",
                    isPlaying ? "scale-110 bg-white/10" : "scale-100"
                  )}>
                    <div className={cn(
                      "w-2 h-2 bg-white rounded-full",
                      isPlaying && "animate-pulse"
                    )} />
                  </div>
                </div>
              </div>
            </section>

            <section className="space-y-10 pt-10 border-t border-[#1a1a1a]/5">
              <div className="space-y-6">
                <h4 className="text-[10px] uppercase tracking-[0.3em] font-bold text-[#1a1a1a]/30">Details</h4>
                <div className="space-y-6">
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] uppercase tracking-widest font-bold text-[#1a1a1a]/20">Duration</span>
                    <span className="serif text-xl font-medium">{data.parsed_json[data.parsed_json.length-1]?.end.split('.')[0] || '--:--'}</span>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] uppercase tracking-widest font-bold text-[#1a1a1a]/20">Original Name</span>
                    <span className="serif text-xl font-medium break-all">{data.original_name}</span>
                  </div>
                </div>
              </div>
              
              <div className="pt-10">
                <Button variant="secondary" onClick={handleDownload} className="w-full h-12 justify-center">
                  <Download size={16} />
                  <span>Download Original</span>
                </Button>
              </div>
            </section>
          </div>
        </aside>
      </main>

      <footer className="mt-40 border-t border-[#1a1a1a]/5 py-20 px-8 bg-white/30">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-[1fr_auto] gap-12">
          <div className="space-y-8">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#1a1a1a] flex items-center justify-center text-white">
                <FileText size={16} />
              </div>
              <span className="text-[11px] font-bold tracking-[0.3em] uppercase">Subtitle Archive</span>
            </div>
            <p className="text-[#1a1a1a]/40 text-sm max-w-sm leading-relaxed serif italic text-lg">
              "A minimalist archive for the digital collector, preserving the rhythm of dialogue and the art of translation."
            </p>
          </div>
          <div className="flex flex-wrap gap-x-16 gap-y-8">
            <div className="space-y-4">
              <h5 className="text-[10px] uppercase tracking-widest font-bold text-[#1a1a1a]/40">Navigation</h5>
              <ul className="space-y-2 text-sm font-medium">
                <li><button onClick={onBack} className="hover:text-[#1a1a1a]/60 transition-colors">Archive</button></li>
                <li><a href="#" className="hover:text-[#1a1a1a]/60 transition-colors">About</a></li>
                <li><a href="#" className="hover:text-[#1a1a1a]/60 transition-colors">Github</a></li>
              </ul>
            </div>
            <div className="space-y-4">
              <h5 className="text-[10px] uppercase tracking-widest font-bold text-[#1a1a1a]/40">Legal</h5>
              <ul className="space-y-2 text-sm font-medium">
                <li><a href="#" className="hover:text-[#1a1a1a]/60 transition-colors">Privacy</a></li>
                <li><a href="#" className="hover:text-[#1a1a1a]/60 transition-colors">Terms</a></li>
              </ul>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-20 pt-8 border-t border-[#1a1a1a]/5 flex justify-between items-center text-[10px] uppercase tracking-widest font-bold text-[#1a1a1a]/20">
          <span>© 2024 Subtitle Archive</span>
          <span>Crafted for clarity</span>
        </div>
      </footer>
    </motion.div>
  );
};

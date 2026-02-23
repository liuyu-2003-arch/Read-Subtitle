import React, { useState, useEffect, useRef } from 'react';
import { 
  Upload, 
  Search, 
  ArrowLeft, 
  Download, 
  FileText, 
  Clock, 
  ChevronRight,
  Plus,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

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
    <div className="min-h-screen">
      <AnimatePresence mode="wait">
        {view === 'archive' ? (
          <motion.div 
            key="archive"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="max-w-5xl mx-auto px-6 py-12 md:py-24"
          >
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
              <div>
                <h1 className="serif text-5xl md:text-7xl font-medium tracking-tight">
                  字幕阅读 <span className="text-[#1a1a1a]/20">归档</span>
                </h1>
              </div>

              <div className="flex items-center gap-4">
                <div className="relative group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#1a1a1a]/30 group-focus-within:text-[#1a1a1a] transition-colors" size={18} />
                  <input 
                    type="text" 
                    placeholder="Search archive..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-12 pr-6 py-3 bg-white border border-[#1a1a1a]/5 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-[#1a1a1a]/10 w-full md:w-64 transition-all"
                  />
                </div>
                <Button onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                  {isUploading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Plus size={18} />}
                  Upload
                </Button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleUpload} 
                  accept=".srt,.vtt,.ass" 
                  className="hidden" 
                />
              </div>
            </header>

            {/* Subtitle List */}
            {loading ? (
              <div className="flex items-center justify-center py-24">
                <div className="w-8 h-8 border-2 border-[#1a1a1a]/10 border-t-[#1a1a1a] rounded-full animate-spin" />
              </div>
            ) : filteredSubtitles.length > 0 ? (
              <div className="grid grid-cols-1 gap-4">
                {filteredSubtitles.map((sub) => (
                  <div key={sub.id}>
                    <Card onClick={() => handleOpenReader(sub.filename)}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-6">
                          <div className="w-12 h-12 rounded-xl bg-[#f0ede9] flex items-center justify-center text-[#1a1a1a]/40 group-hover:bg-[#1a1a1a] group-hover:text-white transition-all duration-300">
                            <span className="serif text-xl font-medium uppercase">{sub.original_name.charAt(0)}</span>
                          </div>
                          <div>
                            <h3 className="text-lg font-medium text-[#1a1a1a] mb-1 group-hover:text-[#1a1a1a] transition-colors">{sub.original_name}</h3>
                            <div className="flex items-center gap-4 text-xs text-[#1a1a1a]/40">
                              <span className="flex items-center gap-1"><Clock size={12} /> {new Date(sub.created_at).toLocaleDateString()}</span>
                              <span className="px-2 py-0.5 bg-[#1a1a1a]/5 rounded-md uppercase tracking-wider font-semibold">{sub.filename.split('-').pop()}</span>
                            </div>
                          </div>
                        </div>
                        <ChevronRight className="text-[#1a1a1a]/10 group-hover:text-[#1a1a1a] group-hover:translate-x-1 transition-all" size={20} />
                      </div>
                    </Card>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-32 bg-white/50 border border-dashed border-[#1a1a1a]/10 rounded-3xl">
                <div className="w-16 h-16 bg-[#f0ede9] rounded-full flex items-center justify-center mx-auto mb-6 text-[#1a1a1a]/20">
                  <FileText size={32} />
                </div>
                <h3 className="serif text-2xl font-medium mb-2">No subtitles found</h3>
                <p className="text-[#1a1a1a]/40 max-w-xs mx-auto">Upload your first subtitle file to start your archive.</p>
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

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/subtitles/${filename}`);
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

  const handleDownload = () => {
    window.location.href = `/api/subtitles/${filename}/download`;
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-[#1a1a1a]/10 border-t-[#1a1a1a] rounded-full animate-spin" />
    </div>
  );

  if (!data) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <p className="serif text-2xl">Subtitle not found</p>
      <Button onClick={onBack}>Go Back</Button>
    </div>
  );

  const filteredLines = data.parsed_json.filter(line => 
    line.text.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen flex flex-col"
    >
      {/* Reader Nav */}
      <nav className="sticky top-0 z-50 bg-[#fdfcfb]/80 backdrop-blur-md border-bottom border-[#1a1a1a]/5 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2 hover:bg-[#1a1a1a]/5 rounded-full transition-colors">
              <ArrowLeft size={20} />
            </button>
            <div className="h-6 w-px bg-[#1a1a1a]/10" />
            <h2 className="serif text-xl font-medium truncate max-w-[200px] md:max-w-md">{data.original_name}</h2>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#1a1a1a]/30" size={14} />
              <input 
                type="text" 
                placeholder="Search transcript..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 bg-white border border-[#1a1a1a]/5 rounded-full text-xs focus:outline-none focus:ring-2 focus:ring-[#1a1a1a]/10 w-48 transition-all"
              />
            </div>
            <Button variant="outline" onClick={handleDownload} className="py-1.5 px-3">
              <Download size={14} />
              <span className="hidden sm:inline">Download</span>
            </Button>
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-12 px-6 py-12">
        {/* Transcript Area */}
        <div className="space-y-12">
          <header className="mb-16">
            <h1 className="serif text-4xl md:text-6xl font-medium mb-4 leading-tight">{data.original_name}</h1>
            <div className="flex flex-wrap gap-4 text-sm text-[#1a1a1a]/40">
              <span>{data.parsed_json.length} lines</span>
              <span>•</span>
              <span>Uploaded {new Date(data.created_at).toLocaleDateString()}</span>
            </div>
          </header>

          <div className="space-y-8">
            {filteredLines.map((line, idx) => (
              <div key={idx} className="group flex gap-8 md:gap-12">
                <div className="w-16 pt-1 text-[10px] font-mono text-[#1a1a1a]/20 group-hover:text-[#1a1a1a]/60 transition-colors shrink-0">
                  {line.start.split('.')[0]}
                </div>
                <div className="flex-1 text-lg md:text-xl leading-relaxed text-[#1a1a1a]/80 group-hover:text-[#1a1a1a] transition-colors">
                  {line.text}
                </div>
              </div>
            ))}
            {filteredLines.length === 0 && (
              <div className="py-24 text-center text-[#1a1a1a]/40 serif text-xl">
                No matching lines found.
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Info */}
        <aside className="hidden lg:block">
          <div className="sticky top-32 space-y-12">
            <section>
              <h4 className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#1a1a1a]/30 mb-6">Now Playing</h4>
              <div className="aspect-[3/4] rounded-3xl bg-[#1a1a1a] p-8 flex flex-col justify-between text-white overflow-hidden relative group">
                <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_50%_30%,#ffffff_0%,transparent_70%)]" />
                <div className="relative z-10">
                  <div className="w-12 h-1 w-full bg-white/10 rounded-full mb-8 overflow-hidden">
                    <div className="h-full w-1/3 bg-white rounded-full" />
                  </div>
                  <div className="serif text-3xl font-light leading-snug">
                    Reading <br />
                    <span className="italic opacity-60">Archive</span>
                  </div>
                </div>
                <div className="relative z-10 flex items-end justify-between">
                  <div className="text-[10px] uppercase tracking-widest font-bold opacity-40">01 / {data.parsed_json.length}</div>
                  <div className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                  </div>
                </div>
              </div>
            </section>

            <section className="pt-8 border-t border-[#1a1a1a]/5">
              <h4 className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#1a1a1a]/30 mb-6">Metadata</h4>
              <div className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-[#1a1a1a]/40">Total Duration</span>
                  <span className="font-medium">{data.parsed_json[data.parsed_json.length-1]?.end.split('.')[0] || '--:--'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#1a1a1a]/40">Total Sentences</span>
                  <span className="font-medium">{data.parsed_json.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#1a1a1a]/40">Format</span>
                  <span className="font-medium uppercase">{data.original_name.split('.').pop()}</span>
                </div>
              </div>
            </section>
          </div>
        </aside>
      </main>

      <footer className="mt-24 border-t border-[#1a1a1a]/5 py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6 text-[#1a1a1a]/30 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-[#1a1a1a]/5 flex items-center justify-center">
              <FileText size={12} />
            </div>
            <span className="font-medium tracking-wider uppercase">Subtitle Archive</span>
          </div>
          <div className="flex gap-8">
            <a href="#" className="hover:text-[#1a1a1a] transition-colors">Privacy</a>
            <a href="#" className="hover:text-[#1a1a1a] transition-colors">Terms</a>
            <a href="#" className="hover:text-[#1a1a1a] transition-colors">Github</a>
          </div>
        </div>
      </footer>
    </motion.div>
  );
};

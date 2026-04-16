/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Type, 
  Settings, 
  ChevronRight, 
  ChevronLeft,
  X,
  AlignCenter,
  AlignLeft,
  AlignRight,
  FlipHorizontal,
  Camera,
  CameraOff,
  Maximize2,
  FileText,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const THEMES = [
  { name: 'Standard', bg: 'bg-[#0f0f12]', text: 'text-white', preview: 'bg-white' },
  { name: 'Contrasto', bg: 'bg-black', text: 'text-yellow-400', preview: 'bg-yellow-400' },
  { name: 'Notte', bg: 'bg-[#0a0a0c]', text: 'text-red-600', preview: 'bg-red-600' },
];

export default function App() {
  // App Core State
  const [isInitialized, setIsInitialized] = useState(false);
  const [text, setText] = useState(() => {
    return localStorage.getItem('prompt_text') || 'Benvenuti nel vostro nuovo Teleprompter Pro professionale.\n\nIncollate qui il vostro testo per iniziare.\n\nPotete regolare la velocità, la dimensione del carattere e persino specchiare il testo per l\'uso con vetri riflettenti.\n\nBuona registrazione!';
  });

  // Controls State
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(25);
  const [fontSize, setFontSize] = useState(50);
  const [margin, setMargin] = useState(15);
  const [isMirrored, setIsMirrored] = useState(false);
  const [alignment, setAlignment] = useState<'left' | 'center' | 'right'>('center');
  const [theme, setTheme] = useState(0);
  
  // UI State
  const [isEditing, setIsEditing] = useState(false);
  const [showSettings, setShowSettings] = useState(true);
  const [scrollPos, setScrollPos] = useState(0);
  
  // Camera State
  const [showCamera, setShowCamera] = useState(false);
  const [cameraPermissionStatus, setCameraPermissionStatus] = useState<'idle' | 'pending' | 'granted' | 'denied'>('idle');
  const [showCameraModal, setShowCameraModal] = useState(false);

  // Refs
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastTimeRef = useRef<number | null>(null);
  const requestRef = useRef<number | null>(null);

  // Persistence
  useEffect(() => {
    localStorage.setItem('prompt_text', text);
  }, [text]);

  // Scrolling Motor
  const animate = useCallback((time: number) => {
    if (lastTimeRef.current !== null) {
      const deltaTime = time - lastTimeRef.current;
      const pixelsPerMs = (speed * 0.005);
      
      setScrollPos((prev) => {
        const next = prev + deltaTime * pixelsPerMs;
        if (scrollContainerRef.current) {
          const maxScroll = scrollContainerRef.current.scrollHeight - scrollContainerRef.current.clientHeight;
          if (next >= maxScroll) {
            setIsPlaying(false);
            return maxScroll;
          }
        }
        return next;
      });
    }
    lastTimeRef.current = time;
    requestRef.current = requestAnimationFrame(animate);
  }, [speed]);

  useEffect(() => {
    if (isPlaying && isInitialized) {
      requestRef.current = requestAnimationFrame(animate);
    } else {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      lastTimeRef.current = null;
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isPlaying, isInitialized, animate]);

  // Sync scroll DOM
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollPos;
    }
  }, [scrollPos]);

  // Camera Logic
  const requestCamera = async () => {
    if (cameraPermissionStatus === 'pending') return;
    
    setCameraPermissionStatus('pending');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          facingMode: "user"
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(e => console.error("Playback failed:", e));
        };
      }
      
      setCameraPermissionStatus('granted');
      setShowCamera(true);
      setShowCameraModal(false);
    } catch (err) {
      console.error("Camera access denied:", err);
      setCameraPermissionStatus('denied');
      setShowCameraModal(false);
    }
  };

  // Robust Auto-re-attach behavior
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (showCamera && isInitialized) {
      // If we joined and showCamera is on but no object, try to request
      if (cameraPermissionStatus !== 'granted') {
        requestCamera();
      }

      // Check if video is actually playing every few seconds
      interval = setInterval(() => {
        if (videoRef.current && !videoRef.current.srcObject && cameraPermissionStatus === 'granted') {
          requestCamera();
        }
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [showCamera, isInitialized, cameraPermissionStatus]);

  const handleToggleCamera = () => {
    if (cameraPermissionStatus !== 'granted') {
      setShowCameraModal(true);
    } else {
      setShowCamera(!showCamera);
    }
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isEditing || !isInitialized) return;
      if (e.code === 'Space') { e.preventDefault(); setIsPlaying(!isPlaying); }
      if (e.code === 'KeyR') { setIsPlaying(false); setScrollPos(0); }
      if (e.code === 'KeyC') handleToggleCamera();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEditing, isInitialized, isPlaying, cameraPermissionStatus, showCamera]);

  const currentTheme = THEMES[theme];

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#0f0f12] font-sans text-white">
      
      {/* Initial Intro Overlay */}
      <AnimatePresence>
        {!isInitialized && (
          <motion.div 
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            className="fixed inset-0 z-[100] bg-[#0f0f12]/80 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center"
          >
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-xl space-y-8"
            >
              <div className="flex justify-center">
                <div className="w-20 h-20 bg-[#007AFF] rounded-3xl flex items-center justify-center shadow-2xl shadow-blue-500/40 relative">
                  <Maximize2 className="w-10 h-10 text-white" />
                  {showCamera && (
                    <div className="absolute -top-2 -right-2 bg-green-500 w-6 h-6 rounded-full border-4 border-[#0f0f12] animate-pulse" />
                  )}
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex flex-col items-center">
                  <h1 className="text-6xl font-black tracking-tighter text-white">GOBBO<span className="text-[#007AFF]">.PRO</span></h1>
                  <span className="mt-2 text-[12px] font-bold text-[#007AFF] uppercase tracking-[0.3em] bg-[#007AFF]/10 px-3 py-1 rounded-full border border-[#007AFF]/20">by Gigicogo</span>
                </div>
                <p className="text-zinc-500 text-lg">La tua voce, la nostra precisione.</p>
              </div>
              
              <div className="flex flex-col gap-4">
                <button 
                  onClick={() => setIsInitialized(true)}
                  className="w-full bg-[#007AFF] hover:bg-blue-600 text-white font-bold py-5 px-10 rounded-2xl text-xl transition-all shadow-xl shadow-blue-600/20 active:scale-95 flex items-center justify-center gap-3"
                >
                  Configura e Inizia <ChevronRight className="w-6 h-6" />
                </button>
                
                <button 
                  onClick={handleToggleCamera}
                  className={`w-full py-4 rounded-xl flex items-center justify-center gap-3 font-medium transition-all
                    ${showCamera ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-white/5 hover:bg-white/10 text-zinc-400 border border-white/10'}
                  `}
                >
                  {showCamera ? <Camera className="w-5 h-5" /> : <CameraOff className="w-5 h-5" />}
                  {showCamera ? 'Webcam Attiva (Sotto)' : 'Test Webcam'}
                </button>
              </div>

              <div className="pt-8 flex justify-center gap-8 opacity-40">
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold">
                  <CheckCircle2 className="w-3 h-3 text-green-500" /> 100% Offline
                </div>
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold">
                  <CheckCircle2 className="w-3 h-3 text-green-500" /> No Data Sent
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main App Structure */}
      <div className="flex flex-col h-full w-full">
        {/* Header */}
        <header className="h-[70px] bg-[#1c1c1e] border-b border-white/5 flex items-center justify-between px-6 z-50">
          <div className="flex items-center gap-2">
            <div className="text-[#007AFF] font-black text-2xl tracking-tighter flex items-baseline gap-2">
              <span>GOBBO<span className="text-white">.PRO</span></span>
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest bg-zinc-800 px-2 py-0.5 rounded-md border border-white/5">by Gigicogo</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsPlaying(!isPlaying)}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all active:scale-95 shadow-lg
                ${isPlaying ? 'bg-zinc-800 text-white' : 'bg-[#007AFF] text-white hover:bg-blue-600 shadow-blue-500/20'}
              `}
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
              {isPlaying ? 'Pausa' : 'Riproduci'}
            </button>

            <button 
              onClick={() => setShowSettings(!showSettings)}
              className={`p-2.5 rounded-xl border transition-all ${showSettings ? 'border-[#007AFF] bg-blue-500/10' : 'border-[#444] hover:bg-white/5'}`}
            >
              <Settings className={`w-5 h-5 ${showSettings ? 'text-[#007AFF]' : 'text-zinc-400'}`} />
            </button>
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden relative">
          
          {/* Sidebar */}
          <AnimatePresence>
            {showSettings && (
              <motion.aside 
                initial={{ x: -320 }}
                animate={{ x: 0 }}
                exit={{ x: -320 }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="w-[320px] bg-[#161618] border-r border-white/5 overflow-y-auto no-scrollbar z-[60] flex-shrink-0 relative"
              >
                <div className="p-6 space-y-8">
                
                <div className="space-y-4">
                  <label className="text-[11px] uppercase tracking-widest text-[#8e8e93] font-bold">Velocità di Scorrimento</label>
                  <input 
                    type="range" min="0" max="100" value={speed} 
                    onChange={(e) => setSpeed(Number(e.target.value))}
                    className="w-full h-1 bg-[#333] appearance-none cursor-pointer accent-[#007AFF] rounded-full"
                  />
                </div>

                <div className="space-y-4">
                  <label className="text-[11px] uppercase tracking-widest text-[#8e8e93] font-bold">Dimensione Testo</label>
                  <input 
                    type="range" min="20" max="120" value={fontSize} 
                    onChange={(e) => setFontSize(Number(e.target.value))}
                    className="w-full h-1 bg-[#333] appearance-none cursor-pointer accent-[#007AFF] rounded-full"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-4">
                    <label className="text-[11px] uppercase tracking-widest text-[#8e8e93] font-bold">Margini (%)</label>
                    <input 
                      type="range" min="0" max="40" value={margin} 
                      onChange={(e) => setMargin(Number(e.target.value))}
                      className="w-full h-1 bg-[#333] appearance-none cursor-pointer accent-[#007AFF] rounded-full"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase text-[#8e8e93] opacity-60">Webcam</label>
                    <button 
                      onClick={handleToggleCamera}
                      className={`w-full py-2 bg-[#2c2c2e] border rounded-lg flex justify-center ${showCamera ? 'border-[#007AFF] text-[#007AFF]' : 'border-[#444] text-zinc-500'}`}
                    >
                      {showCamera ? <Camera className="w-5 h-5" /> : <CameraOff className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] uppercase text-[#8e8e93] opacity-60">Modalità Specchio</label>
                  <button 
                    onClick={() => setIsMirrored(!isMirrored)}
                    className={`w-full py-2 bg-[#2c2c2e] border rounded-lg flex items-center justify-center gap-2 ${isMirrored ? 'border-[#007AFF] text-[#007AFF]' : 'border-[#444] text-zinc-500'}`}
                  >
                    <FlipHorizontal className="w-5 h-5" />
                    <span className="text-[10px] font-bold uppercase">{isMirrored ? 'Attivo' : 'Disattivo'}</span>
                  </button>
                </div>

                <div className="space-y-4">
                  <label className="text-[11px] uppercase tracking-widest text-[#8e8e93] font-bold">Allineamento</label>
                  <div className="flex gap-2">
                    <button onClick={() => setAlignment('left')} className={`flex-1 py-2 bg-[#2c2c2e] border rounded-md flex justify-center ${alignment === 'left' ? 'border-[#007AFF] text-[#007AFF]' : 'border-[#444] text-zinc-500'}`}><AlignLeft className="w-4 h-4" /></button>
                    <button onClick={() => setAlignment('center')} className={`flex-1 py-2 bg-[#2c2c2e] border rounded-md flex justify-center ${alignment === 'center' ? 'border-[#007AFF] text-[#007AFF]' : 'border-[#444] text-zinc-500'}`}><AlignCenter className="w-4 h-4" /></button>
                    <button onClick={() => setAlignment('right')} className={`flex-1 py-2 bg-[#2c2c2e] border rounded-md flex justify-center ${alignment === 'right' ? 'border-[#007AFF] text-[#007AFF]' : 'border-[#444] text-zinc-500'}`}><AlignRight className="w-4 h-4" /></button>
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-white/5">
                  <label className="text-[11px] uppercase tracking-widest text-[#8e8e93] font-bold text-center block">Testo del Discorso</label>
                  <textarea 
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    className="w-full h-40 bg-[#2c2c2e] border border-[#444] rounded-lg p-3 text-sm focus:outline-none focus:border-[#007AFF] resize-none"
                    placeholder="Scrivi qui..."
                  />
                  <button 
                    onClick={() => setIsEditing(true)}
                    className="w-full py-2 border border-dashed border-[#444] rounded-lg text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    Editor Schermo Intero
                  </button>
                </div>

                <div className="flex justify-center gap-3">
                  {THEMES.map((t, idx) => (
                    <button 
                      key={idx}
                      onClick={() => setTheme(idx)}
                      className={`w-8 h-8 rounded-full border-2 ${t.preview} ${theme === idx ? 'border-[#007AFF] scale-110' : 'border-zinc-800'}`}
                    />
                  ))}
                </div>

              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Viewport content */}
        <main className="flex-1 bg-black relative overflow-hidden min-w-0">
          
          {/* Layer 0: Camera Feed (Deep Background) */}
          <div 
            className="absolute inset-0 z-0 overflow-hidden pointer-events-none"
            style={{ 
              opacity: showCamera ? 1 : 0,
              transform: isMirrored ? 'scaleX(-1)' : 'scaleX(1)',
              transition: 'opacity 0.6s ease'
            }}
          >
            <video 
              ref={videoRef}
              autoPlay 
              playsInline 
              muted
              className="w-full h-full object-cover"
            />
            {showCamera && (
              <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/60" />
            )}
          </div>

          {/* Layer 1: Prompting Text (Middle) */}
          <div 
            ref={scrollContainerRef}
            className="absolute inset-0 z-10 overflow-y-auto no-scrollbar bg-transparent"
            onWheel={() => isPlaying && setIsPlaying(false)}
            style={{ scrollBehavior: 'auto' }}
          >
            <div className="w-full flex flex-col bg-transparent" style={{ minHeight: '100.1%' }}>
              {/* Vertical Spacers for positioning */}
              <div className="w-full shrink-0 bg-transparent" style={{ height: '40vh' }} />
              
              <div 
                className={`w-full font-bold leading-[1.6] ${currentTheme.text} transition-all duration-300`}
                style={{ 
                  fontSize: `${fontSize}px`,
                  wordBreak: 'break-word',
                  textAlign: alignment,
                  paddingLeft: `${margin}%`,
                  paddingRight: `${margin}%`,
                  transform: isMirrored ? 'scaleX(-1)' : 'none',
                  textShadow: '0 4px 20px rgba(0,0,0,1)',
                  backgroundColor: 'transparent'
                }}
              >
                {text}
              </div>

              <div className="w-full shrink-0 bg-transparent" style={{ height: '80vh' }} />
            </div>
          </div>

          {/* Layer 2: Visual Guides (Foreground Overlay) */}
          <div className="absolute top-1/2 left-0 w-full -translate-y-1/2 pointer-events-none z-20 flex flex-col justify-center">
            <div className="h-[140px] bg-white/5 border-y border-white/10 w-full flex items-center justify-between px-6">
              <ChevronRight className="w-12 h-12 text-[#007AFF] drop-shadow-lg" />
              <ChevronLeft className="w-12 h-12 text-[#007AFF] drop-shadow-lg" />
            </div>
          </div>

          {/* Layer 3: Progress Bar */}
          <div className="absolute top-0 left-0 w-full h-[3px] bg-white/5 z-30">
            <div 
              className="h-full bg-[#007AFF] shadow-[0_0_10px_#007AFF]"
              style={{ width: `${(scrollPos / (scrollContainerRef.current?.scrollHeight || 1)) * 100}%` }}
            />
          </div>

          {/* Layer 4: Floating Controls */}
          {!isPlaying && isInitialized && (
            <button 
              onClick={() => { setIsPlaying(false); setScrollPos(0); }}
              className="absolute bottom-12 left-1/2 -translate-x-1/2 bg-[#007AFF] hover:bg-blue-600 p-5 rounded-full shadow-2xl z-40 transition-all hover:scale-110 active:scale-90"
            >
              <RotateCcw className="w-8 h-8 text-white" />
            </button>
          )}

          <div className="absolute bottom-6 right-6 z-40">
            <div className="bg-black/60 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10 text-[9px] text-zinc-500 font-mono tracking-widest uppercase">
              Pro Engine • Active
            </div>
          </div>

        </main>
      </div>
    </div>

      {/* Editor Modal */}
      <AnimatePresence>
        {isEditing && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-[#0f0f12] p-8 flex flex-col"
          >
            <div className="max-w-4xl mx-auto w-full flex flex-col h-full gap-6">
              <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold tracking-tight text-white">Modifica Script</h2>
                <button onClick={() => setIsEditing(false)} className="bg-zinc-800 p-3 rounded-xl"><X className="w-6 h-6" /></button>
              </div>
              <textarea 
                value={text}
                onChange={(e) => setText(e.target.value)}
                autoFocus
                className="flex-1 bg-[#1c1c1e] border border-[#333] rounded-2xl p-8 text-2xl font-medium focus:border-[#007AFF] outline-none"
              />
              <div className="flex justify-end">
                <button onClick={() => setIsEditing(false)} className="bg-[#007AFF] text-white px-12 py-4 rounded-xl font-bold text-lg">Applica</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Camera Permission Modal */}
      <AnimatePresence>
        {showCameraModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-md flex items-center justify-center p-6"
          >
            <div className="bg-[#1c1c1e] max-w-md w-full p-8 rounded-3xl border border-white/10 space-y-6 text-center">
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center">
                  <Camera className="w-8 h-8 text-[#007AFF]" />
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-white">Attiva la Fotocamera</h3>
                <p className="text-zinc-400 text-sm">Per vederti mentre leggi, abbiamo bisogno dell'accesso alla tua webcam. Il video <span className="text-white font-bold">non verrà mai registrato o inviato online</span>.</p>
              </div>
              <div className="bg-blue-500/5 p-4 rounded-xl text-left flex gap-3">
                <AlertCircle className="w-5 h-5 text-blue-400 shrink-0" />
                <p className="text-[11px] text-blue-200/60 leading-normal">
                  Dopo aver cliccato il tasto qui sotto, il browser ti mostrerà un avviso in alto a sinistra. <br/><span className="text-blue-400 font-bold italic">Seleziona "Consenti" per procedere.</span>
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={requestCamera}
                  disabled={cameraPermissionStatus === 'pending'}
                  className={`w-full py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-3
                    ${cameraPermissionStatus === 'pending' 
                      ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' 
                      : 'bg-[#007AFF] text-white hover:bg-blue-600 active:scale-95 shadow-lg shadow-blue-500/20'}
                  `}
                >
                  {cameraPermissionStatus === 'pending' ? (
                    <>
                      <motion.div 
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-5 h-5 border-2 border-zinc-500 border-t-white rounded-full"
                      />
                      Attivazione...
                    </>
                  ) : (
                    'Acconsento, attiva ora'
                  )}
                </button>
                <button 
                  onClick={() => setShowCameraModal(false)}
                  disabled={cameraPermissionStatus === 'pending'}
                  className="w-full py-4 text-zinc-500 text-sm hover:text-zinc-300 disabled:opacity-30"
                >
                  Forse più tardi
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style dangerouslySetInnerHTML={{ __html: `
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />

    </div>
  );
}

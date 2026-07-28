import { useState, useTransition, useEffect } from 'react';
import { TapeWorkspace } from './components/TapeWorkspace';
import { TapeConfig } from './types';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, HelpCircle, RotateCcw, Camera } from 'lucide-react';
import { DEFAULT_STAMPS } from './utils/defaultStamps';
import { EditableTextBlock } from './components/EditableTextBlock';

export default function App() {
  const [config] = useState<TapeConfig>({
    width: 1.0, // Fixed 50mm thickness as requested
    pattern: 'custom',
    deskMaterial: 'cream_matte',
    tapeColor: '#E61919', // Highly saturated premium stamp ink red
    customImages: DEFAULT_STAMPS, // Pre-populate with our four gorgeous default stamps
  });

  const [stats, setStats] = useState({ length: 0, overlaps: 0 });
  const [clearTrigger, setClearTrigger] = useState(0);
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [isIntroHovered, setIsIntroHovered] = useState(false);
  const [showIntro, setShowIntro] = useState(false);
  const [uploadedImage1] = useState<string | null>(() => {
    try {
      return localStorage.getItem('uploadedImage1') || DEFAULT_STAMPS[0];
    } catch {
      return DEFAULT_STAMPS[0];
    }
  });
  const [uploadedImage2] = useState<string | null>(() => {
    try {
      return localStorage.getItem('uploadedImage2') || DEFAULT_STAMPS[1];
    } catch {
      return DEFAULT_STAMPS[1];
    }
  });
  const [uploadedImage3] = useState<string | null>(() => {
    try {
      return localStorage.getItem('uploadedImage3') || DEFAULT_STAMPS[2];
    } catch {
      return DEFAULT_STAMPS[2];
    }
  });
  const [uploadedImage4] = useState<string | null>(() => {
    try {
      return localStorage.getItem('uploadedImage4') || DEFAULT_STAMPS[3];
    } catch {
      return DEFAULT_STAMPS[3];
    }
  });

  const [, startTransition] = useTransition();

  const handleStatsUpdate = (length: number, overlaps: number) => {
    startTransition(() => {
      setStats({ length, overlaps });
    });
  };

  const handleClear = () => {
    setClearTrigger((prev) => prev + 1);
  };

  const handleCapture = () => {
    window.dispatchEvent(new CustomEvent('request-screenshot'));
  };

  // Add event listener for screenshot captured
  useEffect(() => {
    const handleScreenshotCaptured = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && customEvent.detail.dataUrl) {
        setScreenshotUrl(customEvent.detail.dataUrl);
      }
    };
    window.addEventListener('screenshot-captured', handleScreenshotCaptured);
    return () => {
      window.removeEventListener('screenshot-captured', handleScreenshotCaptured);
    };
  }, []);

  return (
    <div
      id="app-root"
      className="relative w-screen h-screen bg-[#FAF9F6] text-neutral-800 overflow-hidden font-sans select-none"
    >
      {/* 3D Canvas Workspace (fullscreen back layer) */}
      <div className="absolute inset-0 w-full h-full z-0">
        <TapeWorkspace
          config={config}
          onStatsUpdate={handleStatsUpdate}
          clearTrigger={clearTrigger}
        />
      </div>

      {/* Floating UI Elements Overlay */}
      <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-between pt-6 px-6 pb-1 md:pt-8 md:px-8 md:pb-1">
        
        {/* Top Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start w-full space-y-4 md:space-y-0">
          
          {/* Left: Branding Block */}
          <div className="pointer-events-auto select-none flex flex-col">
            <motion.h1
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="font-sans font-black tracking-tighter text-xl md:text-2xl lg:text-3xl text-neutral-950 leading-none uppercase"
            >
              EXHIBITION SPACE
            </motion.h1>
            
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.8 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="text-[9px] md:text-[10px] uppercase font-mono tracking-widest text-neutral-500 leading-relaxed mt-1.5 flex flex-col space-y-0.5"
            >
              <div>DIGITAL CREATIVE SYSTEM / MODEL_ID: WASHTAPE_OBL_3D</div>
              <div className="text-neutral-400">SPEC-ID: 7BC4-WASHI / WIDTH: 50.0 MM (FIXED) / LOOP: 4-SLOT STAMP</div>
            </motion.div>
          </div>

          {/* Right: Capture Screenshot Button */}
          <div className="pointer-events-auto flex self-end md:self-auto">
            <button
              onClick={handleCapture}
              className="bg-neutral-950 hover:bg-neutral-900 text-white font-mono text-[10px] md:text-[11px] font-bold uppercase tracking-widest px-4 py-2 cursor-pointer transition-all active:scale-95 flex items-center space-x-2 shadow-xs border border-transparent"
              title="Capture Canvas Screenshot"
            >
              <Camera className="w-3.5 h-3.5 text-neutral-300" />
              <span>SNAPSHOT</span>
            </button>
          </div>

        </div>

        {/* Bottom Footer Section */}
        <div className="w-full flex flex-col pointer-events-none mt-auto pb-4 md:pb-8 lg:pb-12 px-4 md:px-8 lg:px-12">
          
          {/* Transparent Floating Actions Row */}
          <div className="w-full flex justify-end mb-4 pointer-events-auto pr-2">
            {/* Clear Table Button: High Contrast Minimalist Tag */}
            <button
              onClick={handleClear}
              className="bg-neutral-950 hover:bg-neutral-900 text-white font-mono text-[10px] md:text-[11px] font-bold uppercase tracking-widest px-5 py-2 cursor-pointer transition-all active:scale-95 flex items-center space-x-2 shadow-xs border border-transparent"
              title="Clear Workspace Trails"
            >
              <RotateCcw className="w-3.5 h-3.5 text-neutral-300" />
              <span>Clear Table</span>
            </button>
          </div>

          {/* Elegant Classic Typography Row with 42px sizing and absolute bottom alignment */}
          <div className="flex justify-between items-center w-full pt-0 px-2 pointer-events-auto">
            <span className="font-sans font-black tracking-tighter text-xl sm:text-2xl md:text-3xl lg:text-[42px] text-neutral-950 leading-none select-none uppercase">
              LONGEVITY
            </span>

            {/* Dynamic expanding line/box container */}
            <div
              className="flex-1 mx-4 sm:mx-6 md:mx-8 flex items-center justify-center relative cursor-pointer h-[42px]"
              onMouseEnter={() => setIsIntroHovered(true)}
              onMouseLeave={() => setIsIntroHovered(false)}
              onClick={() => setShowIntro(true)}
            >
              <motion.div
                animate={{
                  height: isIntroHovered ? '24px' : '2px',
                  width: '100%',
                }}
                transition={{ duration: 0.25, ease: 'easeInOut' }}
                className="bg-neutral-950 flex items-center justify-center overflow-hidden shadow-xs"
              >
                <AnimatePresence>
                  {isIntroHovered && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15, delay: 0.05 }}
                      className="text-white font-mono text-[9px] font-bold tracking-widest uppercase select-none whitespace-nowrap px-3"
                    >
                      INTRODUCTION
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.div>
            </div>

            <span className="font-sans font-black tracking-tighter text-xl sm:text-2xl md:text-3xl lg:text-[42px] text-neutral-950 leading-none select-none uppercase font-bold">
              PATTERN
            </span>
          </div>

        </div>

      </div>

      {/* Screenshot Modal Popup */}
      <AnimatePresence>
        {screenshotUrl && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 pointer-events-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="bg-white border border-neutral-900/10 p-6 max-w-lg w-full shadow-2xl flex flex-col space-y-4"
            >
              <div className="flex justify-between items-center border-b border-neutral-900/10 pb-2">
                <span className="font-mono text-[11px] font-bold tracking-wider text-neutral-900 uppercase">
                  [CAPTURE SUCCESSFUL]
                </span>
                <button
                  onClick={() => setScreenshotUrl(null)}
                  className="text-neutral-400 hover:text-neutral-900 font-mono text-[10px] tracking-widest uppercase hover:underline cursor-pointer"
                >
                  CLOSE [X]
                </button>
              </div>

              {/* Captured Image Preview */}
              <div className="border border-neutral-900/10 overflow-hidden bg-[#FAF9F6]">
                <img
                  src={screenshotUrl}
                  alt="VX Lay Space Canvas Capture"
                  className="w-full h-auto block"
                  referrerPolicy="no-referrer"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3 pt-2">
                <a
                  href={screenshotUrl}
                  download="vx-lay-space-capture.png"
                  className="flex-1 bg-neutral-950 hover:bg-neutral-900 text-white font-mono text-[11px] font-bold uppercase tracking-widest py-3 text-center cursor-pointer transition-all active:scale-98 shadow-xs"
                >
                  SAVE IMAGE
                </a>
                <button
                  onClick={() => setScreenshotUrl(null)}
                  className="flex-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-mono text-[11px] font-bold uppercase tracking-widest py-3 text-center cursor-pointer transition-all active:scale-98"
                >
                  CANCEL
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      {/* Editorial Full Screen Introduction Page */}
      <AnimatePresence>
        {showIntro && (
          <motion.div
            initial={{ clipPath: 'inset(95% 0% 0% 0%)', opacity: 0.9 }}
            animate={{ clipPath: 'inset(0% 0% 0% 0%)', opacity: 1 }}
            exit={{ clipPath: 'inset(95% 0% 0% 0%)', opacity: 0.9 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-50 bg-neutral-950 text-white flex flex-col p-6 sm:p-12 md:p-16 lg:p-20 overflow-y-auto pointer-events-auto scroll-smooth"
          >
            {/* Top-Right Invisible Hover Zone to reveal Close Button [X] */}
            <div className="fixed top-0 right-0 z-[60] w-48 h-48 group pointer-events-none flex justify-end items-start p-6">
              <button
                onClick={() => setShowIntro(false)}
                className="pointer-events-auto opacity-0 group-hover:opacity-100 transition-opacity duration-300 ease-in-out bg-white/10 hover:bg-white/20 text-white font-mono text-[14px] font-bold tracking-widest uppercase px-4 py-3 cursor-pointer border border-white/20 rounded-none shadow-2xl backdrop-blur-md flex items-center justify-center"
                title="Close System Manual"
              >
                [X]
              </button>
            </div>

            {/* Static Header */}
            <div className="flex justify-between items-center border-b border-neutral-800 pb-6 relative z-20 pt-2 mb-10 w-full">
              <div className="flex flex-col">
                <span className="font-mono text-[10px] tracking-widest text-neutral-400 uppercase">
                  SYSTEM MANUAL / ARCHIVE
                </span>
                <span className="font-sans font-black tracking-tighter text-xl sm:text-2xl uppercase mt-1">
                  LONGEVITY PATTERN
                </span>
              </div>
              <button
                onClick={() => setShowIntro(false)}
                className="bg-white/10 hover:bg-white/20 text-white font-mono text-[11px] font-bold tracking-widest uppercase px-5 py-2.5 cursor-pointer transition-all active:scale-95 border border-white/10 flex items-center gap-2 rounded-none"
              >
                <span>RETURN TO EXHIBITION</span>
                <span className="text-neutral-400">[X]</span>
              </button>
            </div>

            {/* Main Interactive Editorial Content: Multipage Vertical Layout */}
            <div className="w-full max-w-6xl mx-auto py-12 space-y-24 sm:space-y-32">
              
              {/* PAGE 1: THE MANIFESTO */}
              <section id="chapter-01" className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 pt-8 scroll-mt-28">
                <div className="lg:col-span-5 flex flex-col justify-start">
                  <span className="text-xs font-mono text-neutral-500 tracking-widest uppercase mb-4 block">
                    — CHAPTER 01 / THE MANIFESTO
                  </span>
                  {uploadedImage1 && (
                    <div className="w-full max-w-sm md:max-w-md select-none mb-6 border border-neutral-800 p-0 shadow-2xl overflow-hidden bg-neutral-950">
                      <img
                        src={uploadedImage1}
                        alt="CHAPTER 01 / STAMP OR ARTWORK"
                        className="w-full h-auto block object-contain"
                      />
                    </div>
                  )}
                  <p className="text-neutral-400 font-mono text-xs tracking-widest uppercase mt-4 max-w-sm leading-relaxed">
                    A digital creative workspace exploring continuous washi tape loops on a three-dimensional plane.
                  </p>
                  
                  <div className="mt-12 hidden lg:flex flex-col space-y-3 border-l border-neutral-800 pl-4 text-xs font-mono text-neutral-400">
                    <span className="text-neutral-600">JUMP TO SECTIONS:</span>
                    <a href="#chapter-01" className="hover:text-white transition-colors">01 // THE MANIFESTO</a>
                    <a href="#chapter-02" className="hover:text-white transition-colors">02 // CONTROL SCHEMA</a>
                    <a href="#chapter-03" className="hover:text-white transition-colors">03 // WASHI CRAFT & 8K DEPTH</a>
                    <a href="#chapter-04" className="hover:text-white transition-colors">04 // LONGEVITY SYMMETRY</a>
                  </div>
                </div>

                <div className="lg:col-span-7 flex flex-col justify-start lg:pt-8 space-y-8 text-neutral-300 font-sans text-sm sm:text-base leading-relaxed tracking-wide">
                  <EditableTextBlock
                    id="chapter-01"
                    defaultText={`"There is an unspoken infinity in a tape loop. A path that has no destination, only continuity."\n\nTraditional Japanese Washi tape provides an unparalleled tactile pleasure through its soft fibrous texture, beautiful ink absorption, and repetitive graphic layout. In this space, we translate that touch into a cinematic 3D digital laboratory.\n\nBy rolling tape continuously across a flat, warm canvas, we capture physical movement and freeze it into permanent vectors. It is not just drawing; it is compiling a temporal physical loop.`}
                  />
                  
                  <div className="h-[1px] bg-neutral-800 my-4" />
                  
                  <div className="grid grid-cols-2 gap-4 font-mono text-xs text-neutral-400">
                    <div>
                      <span className="text-white block font-bold mb-1">PROJECT NAME</span>
                      <span>LONGEVITY PATTERN 3D</span>
                    </div>
                    <div>
                      <span className="text-white block font-bold mb-1">VERSION STATUS</span>
                      <span>v1.8 ARCHIVAL DECKLE</span>
                    </div>
                  </div>
                </div>
              </section>

              {/* PAGE 2: INTERACTIVE CONTROL SCHEMA */}
              <section id="chapter-02" className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 border-t border-neutral-900 pt-16 scroll-mt-28">
                <div className="lg:col-span-5 flex flex-col justify-start">
                  <span className="text-xs font-mono text-neutral-500 tracking-widest uppercase mb-4 block">
                    — CHAPTER 02 / SCHEMATICS
                  </span>
                  {uploadedImage2 && (
                    <div className="w-full max-w-sm md:max-w-md select-none mb-6 border border-neutral-800 p-0 shadow-2xl overflow-hidden bg-neutral-950">
                      <img
                        src={uploadedImage2}
                        alt="CHAPTER 02 / CONTROL MATRIX GRAPHIC"
                        className="w-full h-auto block object-contain"
                      />
                    </div>
                  )}
                  <p className="text-neutral-400 font-mono text-xs tracking-widest uppercase mt-4 max-w-sm leading-relaxed">
                    Interactive tactile gestures map structural trajectories on the desktop viewport.
                  </p>
                </div>

                <div className="lg:col-span-7 lg:pt-8">
                  <EditableTextBlock
                    id="chapter-02"
                    defaultText={`01 / LEFT-CLICK & DRAG / CREATE PATHWAYS\nHold down the left mouse button and slide across the workspace. This pulls tape directly from the rolling washi cylinder, plotting path coordinates and applying your selected stamp graphics.\n\n02 / RIGHT-CLICK ON TAPE / CLOSE-UP ZOOM\nHover and right-click on any existing tape strip. The camera will instantly re-align directly over the clicked graphic, zooming in close so you can inspect delicate fibers and high-definition ink patterns without distortion.\n\n03 / RIGHT-CLICK AGAIN / RESTORE OVERVIEW\nSimply right-click anywhere on the scene while zoomed in to instantly restore the original oblique architectural perspective. No need to look for reset buttons.`}
                  />
                </div>
              </section>

              {/* PAGE 3: WASHI CRAFT & 8K RESOLUTION */}
              <section id="chapter-03" className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 border-t border-neutral-900 pt-16 scroll-mt-28">
                <div className="lg:col-span-5 flex flex-col justify-start">
                  <span className="text-xs font-mono text-neutral-500 tracking-widest uppercase mb-4 block">
                    — CHAPTER 03 / DIGITAL ARCHAEOLOGY
                  </span>
                  <p className="text-neutral-400 font-sans text-sm mb-6">
                    Washi paper is beloved for its fibrous, organic edges and translucent layering. Our renderer reproduces these tactile structures with mathematical precision.
                  </p>
                  {uploadedImage3 && (
                    <div className="w-full max-w-sm md:max-w-md select-none mb-6 border border-neutral-800 p-0 shadow-2xl overflow-hidden bg-neutral-950">
                      <img
                        src={uploadedImage3}
                        alt="CHAPTER 03 / HIGHEST-RES TEXTURE"
                        className="w-full h-auto block object-contain"
                      />
                    </div>
                  )}
                </div>

                <div className="lg:col-span-7 lg:pt-[104px] space-y-6 text-neutral-300 font-sans text-sm sm:text-base leading-relaxed">
                  <EditableTextBlock
                    id="chapter-03"
                    defaultText={`Traditional rendering methods compress canvas textures to save memory, turning beautiful stamps into blurry pixels. To resolve this, we upgraded our canvas engine to support high-fidelity 8192px × 2048px resolutions.\n\nThis is coupled with WebGL's highest-quality image smoothing algorithms to ensure that even when you right-click and zoom in tightly onto a single stamp, the ink contours, deckle paper edges, and overlapping textures remain crisp, sharp, and perfectly undistorted.`}
                  />
                  <div className="border border-neutral-800 p-6 bg-neutral-950">
                    <span className="font-mono text-[10px] tracking-widest text-neutral-500 uppercase block mb-3 font-bold">
                      CORE SPECIFICATIONS
                    </span>
                    <ul className="grid grid-cols-2 gap-4 font-mono text-xs text-neutral-400">
                      <li>
                        <span className="text-white uppercase block mb-0.5">Atlas Size</span>
                        <span>8192 × 2048 pixels</span>
                      </li>
                      <li>
                        <span className="text-white uppercase block mb-0.5">Filter Mode</span>
                        <span>Trilinear Anisotropic</span>
                      </li>
                      <li>
                        <span className="text-white uppercase block mb-0.5">Color Space</span>
                        <span>sRGB Non-linear</span>
                      </li>
                      <li>
                        <span className="text-white uppercase block mb-0.5">Edge Type</span>
                        <span>Archival Deckle Edge</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* PAGE 4: LONGEVITY PATTERN THEORY */}
              <section id="chapter-04" className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 border-t border-neutral-900 pt-16 scroll-mt-28">
                <div className="lg:col-span-5 flex flex-col justify-start">
                  <span className="text-xs font-mono text-neutral-500 tracking-widest uppercase mb-4 block">
                    — CHAPTER 04 / MATHEMATICS & SYMMETRY
                  </span>
                  <p className="text-neutral-400 font-sans text-sm mb-6">
                    The repetitive geometry of traditional patterns represents the concept of eternity and continuity in East Asian aesthetics.
                  </p>
                  {uploadedImage4 && (
                    <div className="w-full max-w-sm md:max-w-md select-none mb-6 border border-neutral-800 p-0 shadow-2xl overflow-hidden bg-neutral-950">
                      <img
                        src={uploadedImage4}
                        alt="CHAPTER 04 / SYMMETRIC MOTIF"
                        className="w-full h-auto block object-contain"
                      />
                    </div>
                  )}
                </div>

                <div className="lg:col-span-7 lg:pt-[104px] space-y-6 text-neutral-300 font-sans text-sm sm:text-base leading-relaxed">
                  <EditableTextBlock
                    id="chapter-04"
                    defaultText={`The word "Longevity" translates visually to endless repeating geometric ribbons that loop, cross over, and intertwine. This interactive exhibit mimics this infinity, treating tape lines as infinite equations winding around a centralized coordinate frame.\n\nEvery overlap is calculated in physical 3D space with subtle soft shadowing to mimic real-world paper thickness and layering. This creates a striking harmony between classic ink craft and modern visual computing.`}
                  />
                  
                  <div className="h-12" />
                  
                  <div className="flex justify-center py-6 border-y border-neutral-800">
                    <div className="text-center">
                      <span className="font-mono text-[10px] tracking-widest text-neutral-400 uppercase">
                        Washi Tape Continuous Loop Exhibition
                      </span>
                    </div>
                  </div>
                </div>
              </section>

            </div>

            {/* Footer */}
            <div className="flex flex-col sm:flex-row justify-between items-center border-t border-neutral-800 pt-6 text-[10px] font-mono tracking-widest text-neutral-500 uppercase space-y-2 sm:space-y-0 mt-auto pb-4">
              <span>DESIGNED BY EXHIBITION TEAM © 2026</span>
              <span>STRICT SPECIFICATION / WASHTAPE_OBL_3D</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Subtle Frame Overlays */}
      <div className="absolute top-0 bottom-0 left-0 w-[1px] bg-neutral-900/5 z-1 pointer-events-none" />
      <div className="absolute top-0 bottom-0 right-0 w-[1px] bg-neutral-900/5 z-1 pointer-events-none" />
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-neutral-900/5 z-1 pointer-events-none" />
      <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-neutral-900/5 z-1 pointer-events-none" />
    </div>
  );
}

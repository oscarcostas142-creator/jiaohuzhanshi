import { useState, useTransition } from 'react';
import { TapeWorkspace } from './components/TapeWorkspace';
import { ControlPanel } from './components/ControlPanel';
import { TapeConfig } from './types';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Palette, HelpCircle, Layers } from 'lucide-react';

export default function App() {
  const [config, setConfig] = useState<TapeConfig>({
    width: 0.6,
    pattern: 'sage_gold',
    deskMaterial: 'light_wood',
    tapeColor: '#7D8C77',
  });

  const [stats, setStats] = useState({ length: 0, overlaps: 0 });
  const [clearTrigger, setClearTrigger] = useState(0);
  const [showGuide, setShowGuide] = useState(true);
  const [, startTransition] = useTransition();

  const handleStatsUpdate = (length: number, overlaps: number) => {
    // Wrap state updates in useTransition to avoid blocking rendering
    startTransition(() => {
      setStats({ length, overlaps });
    });
  };

  const handleClear = () => {
    setClearTrigger((prev) => prev + 1);
  };

  return (
    <div id="app-root" className="relative w-screen h-screen bg-[#FAF9F6] text-neutral-800 overflow-hidden font-sans select-none flex flex-col md:flex-row">
      {/* 3D Canvas Workspace (fullscreen back layer) */}
      <div className="absolute inset-0 w-full h-full z-0">
        <TapeWorkspace
          config={config}
          onStatsUpdate={handleStatsUpdate}
          clearTrigger={clearTrigger}
        />
      </div>

      {/* Aesthetic Top Floating Header (Creative branding) */}
      <div className="absolute top-4 left-4 md:top-6 md:left-6 z-10 pointer-events-none flex flex-col gap-1.5">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex items-center space-x-2 bg-white/60 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-neutral-200/50 shadow-sm w-fit"
        >
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-neutral-500">
            Studio Live Sandbox
          </span>
        </motion.div>
      </div>

      {/* Floating UI Elements Overlay */}
      <div className="relative z-10 w-full h-full pointer-events-none flex flex-col md:flex-row p-4 md:p-6 justify-between items-end md:items-stretch">
        
        {/* Sidebar/Floating Control Panel */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="pointer-events-auto self-end md:self-center order-2 md:order-1"
        >
          <ControlPanel
            config={config}
            onChangeConfig={setConfig}
            stats={stats}
            onClear={handleClear}
          />
        </motion.div>

        {/* Dynamic Help guide card or secondary metrics card */}
        <div className="pointer-events-auto order-1 md:order-2 self-start flex flex-col items-end space-y-3 max-w-[280px]">
          <AnimatePresence>
            {showGuide && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: -15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                className="bg-neutral-900/90 backdrop-blur-md border border-neutral-800 text-neutral-200 p-4 rounded-xl shadow-xl flex flex-col space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5 text-amber-300 font-semibold text-xs">
                    <Sparkles className="w-3.5 h-3.5 animate-bounce" />
                    <span>3D Interaction Mode</span>
                  </div>
                  <button
                    onClick={() => setShowGuide(false)}
                    className="text-neutral-400 hover:text-neutral-200 font-mono text-[10px] bg-neutral-800 px-1.5 py-0.5 rounded transition-colors"
                  >
                    Hide
                  </button>
                </div>
                <p className="text-[11px] text-neutral-300 leading-relaxed">
                  Drag the cursor to guide the washi roll on the table. The tape will automatically spiral roll, shrink, and smoothly build overlapping bridges when it crosses paths!
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {!showGuide && (
            <motion.button
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              onClick={() => setShowGuide(true)}
              className="bg-neutral-900 hover:bg-neutral-850 text-white rounded-full p-2.5 shadow-lg border border-neutral-800 transition-all flex items-center justify-center"
            >
              <HelpCircle className="w-5 h-5 text-neutral-200" />
            </motion.button>
          )}
        </div>
      </div>

      {/* Floating minimal layout accents/borders to establish editorial "Washi Art" vibe */}
      <div className="absolute top-0 bottom-0 left-0 w-[1px] bg-neutral-200/20 z-1 pointer-events-none" />
      <div className="absolute top-0 bottom-0 right-0 w-[1px] bg-neutral-200/20 z-1 pointer-events-none" />
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-neutral-200/20 z-1 pointer-events-none" />
      <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-neutral-200/20 z-1 pointer-events-none" />
    </div>
  );
}

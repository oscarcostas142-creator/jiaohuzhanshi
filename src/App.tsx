import { useState, useTransition } from 'react';
import { TapeWorkspace } from './components/TapeWorkspace';
import { ControlPanel } from './components/ControlPanel';
import { TapeConfig } from './types';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, HelpCircle } from 'lucide-react';

export default function App() {
  const [config, setConfig] = useState<TapeConfig>({
    width: 0.8,
    pattern: 'pastel_grid',
    deskMaterial: 'cream_matte',
    tapeColor: '#7D8C77',
    customImages: [], // Holds user-uploaded pattern images
  });

  const [stats, setStats] = useState({ length: 0, overlaps: 0 });
  const [clearTrigger, setClearTrigger] = useState(0);
  const [showGuide, setShowGuide] = useState(true);
  const [, startTransition] = useTransition();

  const handleStatsUpdate = (length: number, overlaps: number) => {
    startTransition(() => {
      setStats({ length, overlaps });
    });
  };

  const handleClear = () => {
    setClearTrigger((prev) => prev + 1);
  };

  return (
    <div
      id="app-root"
      className="relative w-screen h-screen bg-desk text-neutral-800 overflow-hidden font-sans select-none flex flex-col md:flex-row"
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
      <div className="relative z-10 w-full h-full pointer-events-none flex flex-col md:flex-row p-4 md:p-6 justify-between items-end md:items-stretch">
        
        {/* Sidebar/Floating Control Panel */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="pointer-events-auto self-start md:self-center order-2 md:order-1"
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
                className="bg-[#FCFAF7] border border-[#E5DEC9] text-[#2D2B2A] p-4 rounded-xl shadow-sm flex flex-col space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5 text-neutral-700 font-semibold text-xs uppercase tracking-wider">
                    <Sparkles className="w-3.5 h-3.5 text-neutral-500" />
                    <span>Guide</span>
                  </div>
                  <button
                    onClick={() => setShowGuide(false)}
                    className="text-neutral-400 hover:text-neutral-700 font-mono text-[9px] border border-[#EAE6DF] px-1.5 py-0.5 rounded transition-colors"
                  >
                    Close
                  </button>
                </div>
                <p className="text-[10px] text-neutral-500 leading-relaxed font-serif italic">
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
              className="bg-[#FCFAF7] hover:bg-neutral-50 text-neutral-700 rounded-full p-2.5 shadow-sm border border-[#E5DEC9] transition-all flex items-center justify-center"
            >
              <HelpCircle className="w-4 h-4 text-neutral-500" />
            </motion.button>
          )}
        </div>
      </div>

      {/* Floating minimal layout accents/borders to establish editorial "Washi Art" vibe */}
      <div className="absolute top-0 bottom-0 left-0 w-[1px] bg-neutral-200/10 z-1 pointer-events-none" />
      <div className="absolute top-0 bottom-0 right-0 w-[1px] bg-neutral-200/10 z-1 pointer-events-none" />
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-neutral-200/10 z-1 pointer-events-none" />
      <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-neutral-200/10 z-1 pointer-events-none" />
    </div>
  );
}

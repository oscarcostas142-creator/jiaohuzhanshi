import React, { useState } from 'react';
import { TapeConfig } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import {
  Maximize2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Compass,
  Sliders,
} from 'lucide-react';

interface ControlPanelProps {
  config: TapeConfig;
  onChangeConfig: (newConfig: TapeConfig) => void;
  stats: { length: number; overlaps: number };
  onClear: () => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  config,
  onChangeConfig,
  stats,
  onClear,
}) => {
  const [isOpen, setIsOpen] = useState(true);

  const handleWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const width = parseFloat(e.target.value);
    onChangeConfig({ ...config, width });
  };

  return (
    <div className="relative pointer-events-auto flex items-start">
      {/* Sidebar Panel with smooth slide and fade transitions */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="expanded-sidebar"
            initial={{ width: 0, opacity: 0, x: -40 }}
            animate={{ width: 320, opacity: 1, x: 0 }}
            exit={{ width: 0, opacity: 0, x: -40 }}
            transition={{ type: 'spring', damping: 26, stiffness: 220 }}
            className="h-[88vh] md:h-[84vh] bg-[#FCFAF7] border border-[#E5DEC9] shadow-sm rounded-2xl flex flex-col justify-between overflow-hidden select-none"
          >
            {/* Header Area */}
            <div className="p-5 border-b border-[#EAE6DF] flex-shrink-0 flex items-center justify-between">
              <div>
                <h1 className="text-sm font-semibold tracking-wider text-neutral-800 uppercase font-sans">
                  Washi Studio
                </h1>
                <p className="text-[10px] text-neutral-400 font-serif italic mt-0.5">
                  Interactive Tape Atelier
                </p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-neutral-100 rounded-lg transition-colors text-neutral-400 hover:text-neutral-700"
                title="Collapse Sidebar"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>

            {/* Content Area - Scrollable */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6 scrollbar-thin">
              {/* Slider Controls */}
              <div className="space-y-4">
                {/* Tape Width Slider */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-neutral-400" />
                      Tape Ribbon Width
                    </label>
                    <span className="font-mono text-[10px] text-neutral-500">
                      {(config.width * 50).toFixed(0)} mm
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.35"
                    max="1.35"
                    step="0.05"
                    value={config.width}
                    onChange={handleWidthChange}
                    className="w-full h-1 bg-neutral-200 rounded appearance-none cursor-pointer accent-neutral-800 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Stats and Action Footer */}
            <div className="p-5 border-t border-[#EAE6DF] flex-shrink-0 bg-[#FAF8F5]/80 space-y-4">
              <div className="flex items-center justify-between text-neutral-600 font-mono text-[10px]">
                <div className="flex items-center gap-1">
                  <Compass className="w-3.5 h-3.5 text-neutral-400" />
                  <span>Drawn:</span>
                </div>
                <span className="font-bold text-neutral-800">
                  {(stats.length * 10).toFixed(1)} cm
                </span>

                <div className="w-[1px] h-3 bg-neutral-300 mx-2" />

                <div className="flex items-center gap-1">
                  <Maximize2 className="w-3.5 h-3.5 text-neutral-400" />
                  <span>Bridges:</span>
                </div>
                <span className="font-bold text-neutral-800">{stats.overlaps}</span>
              </div>

              <button
                onClick={onClear}
                className="w-full bg-neutral-800 hover:bg-neutral-900 active:bg-black text-[#FAF8F5] rounded-xl py-2.5 px-4 flex items-center justify-center space-x-2 text-xs font-semibold tracking-wider uppercase transition-all duration-300 hover:shadow-sm"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Reset Sandbox</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Elegant, Restrained Small Mini-Toggle Icon button when closed */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            key="collapsed-trigger"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={() => setIsOpen(true)}
            className="p-3 bg-[#FCFAF7] hover:bg-neutral-100 text-neutral-800 rounded-full border border-[#E5DEC9] shadow-md flex items-center justify-center transition-all duration-300"
            title="Expand Workspace Control Panel"
          >
            <ChevronRight className="w-5 h-5" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
};

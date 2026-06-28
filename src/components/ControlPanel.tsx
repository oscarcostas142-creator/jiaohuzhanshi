import React from 'react';
import { TapeConfig, TapePattern, DeskMaterial } from '../types';
import {
  Sparkles,
  Layers,
  Palette,
  RefreshCw,
  Info,
  Compass,
  Maximize2,
  Trash2,
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
  const patterns: { id: TapePattern; name: string; desc: string; previewColor: string; accentColor: string }[] = [
    {
      id: 'sage_gold',
      name: 'Sage & Gold Leaf',
      desc: 'Elegant sage green canvas woven with golden branches.',
      previewColor: 'bg-[#6F806C]',
      accentColor: '#E5C158',
    },
    {
      id: 'terracotta_geo',
      name: 'Nordic Terracotta',
      desc: 'Warm desert terracotta with abstract cream arches.',
      previewColor: 'bg-[#B85E46]',
      accentColor: '#F4F0E6',
    },
    {
      id: 'indigo_constellation',
      name: 'Midnight Starfield',
      desc: 'Deep indigo field map with sparkling golden galaxies.',
      previewColor: 'bg-[#1D2436]',
      accentColor: '#EBC276',
    },
    {
      id: 'pastel_grid',
      name: 'Coral Grid-Cream',
      desc: 'Minimalist coral pink lines on soft warm cream.',
      previewColor: 'bg-[#F5EFE6] border border-neutral-300',
      accentColor: '#D97365',
    },
  ];

  const desks: { id: DeskMaterial; name: string; color: string }[] = [
    { id: 'light_wood', name: 'Warm Maple', color: 'bg-[#E6D0BA]' },
    { id: 'studio_slate', name: 'Studio Slate', color: 'bg-[#1B1D20]' },
    { id: 'cream_matte', name: 'Cardboard Cream', color: 'bg-[#F3EFEB]' },
    { id: 'warm_sand', name: 'Sand Mineral', color: 'bg-[#DECDBE]' },
  ];

  const handleWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const width = parseFloat(e.target.value);
    onChangeConfig({ ...config, width });
  };

  const handlePatternChange = (pattern: TapePattern) => {
    onChangeConfig({ ...config, pattern });
  };

  const handleDeskChange = (deskMaterial: DeskMaterial) => {
    onChangeConfig({ ...config, deskMaterial });
  };

  return (
    <div
      id="studio-control-panel"
      className="w-full md:w-[380px] bg-white/80 backdrop-blur-xl border border-neutral-200/50 shadow-2xl rounded-2xl p-6 flex flex-col justify-between max-h-[90vh] overflow-y-auto space-y-6 select-none"
    >
      {/* Title & Brand */}
      <div>
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#6F806C] via-[#B85E46] to-[#1D2436] animate-pulse flex items-center justify-center">
            <Palette className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-medium tracking-tight text-neutral-800 font-sans">
              Washi Tape Studio
            </h1>
            <p className="text-xs text-neutral-500">Interactive 3D Craft Workspace</p>
          </div>
        </div>

        <hr className="my-4 border-neutral-200/50" />

        {/* Customization Options */}
        <div className="space-y-6">
          {/* Tape Width Slider */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm">
              <label className="text-neutral-600 font-medium flex items-center gap-1.5">
                <Maximize2 className="w-4 h-4 text-neutral-400" />
                Tape Width
              </label>
              <span className="font-mono text-neutral-400 font-medium">
                {(config.width * 50).toFixed(0)} mm
              </span>
            </div>
            <input
              type="range"
              min="0.3"
              max="0.9"
              step="0.05"
              value={config.width}
              onChange={handleWidthChange}
              className="w-full h-1.5 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-neutral-600 focus:outline-none"
            />
          </div>

          {/* Tape Patterns Selector */}
          <div className="space-y-2">
            <label className="text-sm text-neutral-600 font-medium flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-neutral-400" />
              Washi Tape Design
            </label>
            <div className="grid grid-cols-1 gap-2.5">
              {patterns.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handlePatternChange(p.id)}
                  className={`flex items-start text-left p-2.5 rounded-xl border transition-all ${
                    config.pattern === p.id
                      ? 'border-neutral-800 bg-neutral-50/50 ring-1 ring-neutral-800'
                      : 'border-neutral-200 hover:border-neutral-300 bg-white/40'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg ${p.previewColor} mr-3 flex-shrink-0 relative overflow-hidden`}>
                    <div className="absolute inset-0 bg-white/10" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-neutral-700">{p.name}</p>
                      {config.pattern === p.id && (
                        <span className="w-1.5 h-1.5 rounded-full bg-neutral-800" />
                      )}
                    </div>
                    <p className="text-[10px] text-neutral-400 mt-0.5 leading-normal truncate">
                      {p.desc}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Studio Desk Surface */}
          <div className="space-y-2">
            <label className="text-sm text-neutral-600 font-medium flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-neutral-400" />
              Workspace Board
            </label>
            <div className="grid grid-cols-4 gap-2">
              {desks.map((d) => (
                <button
                  key={d.id}
                  onClick={() => handleDeskChange(d.id)}
                  className={`flex flex-col items-center justify-center p-1.5 rounded-xl border transition-all ${
                    config.deskMaterial === d.id
                      ? 'border-neutral-800 bg-neutral-50/50 ring-1 ring-neutral-800'
                      : 'border-neutral-200 hover:border-neutral-300 bg-white/40'
                  }`}
                >
                  <div className={`w-6 h-6 rounded-md ${d.color} shadow-sm border border-black/5 mb-1.5`} />
                  <span className="text-[9px] text-neutral-500 font-medium truncate w-full text-center">
                    {d.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Metrics & Interaction Guide */}
      <div className="space-y-4">
        {/* Real-time statistics */}
        <div className="bg-neutral-50/50 border border-neutral-100 p-4 rounded-xl space-y-2">
          <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider flex items-center gap-1">
            <Compass className="w-3.5 h-3.5" /> Live Metrics
          </h3>
          <div className="grid grid-cols-2 gap-4 pt-1">
            <div>
              <p className="text-[10px] text-neutral-400 font-medium">Tape Unrolled</p>
              <p className="text-base font-semibold font-mono text-neutral-700 mt-0.5">
                {(stats.length * 10).toFixed(1)} cm
              </p>
            </div>
            <div>
              <p className="text-[10px] text-neutral-400 font-medium">Overlap Layers</p>
              <p className="text-base font-semibold font-mono text-neutral-700 mt-0.5">
                {stats.overlaps}
              </p>
            </div>
          </div>
        </div>

        {/* Tip Box */}
        <div className="bg-amber-50/40 border border-amber-100/50 rounded-xl p-3 flex items-start space-x-2.5">
          <Info className="w-4.5 h-4.5 text-amber-600/80 mt-0.5 flex-shrink-0" />
          <p className="text-[10px] text-neutral-500 leading-normal">
            <strong className="text-amber-800">Craft Guide:</strong> Click or touch and drag anywhere on the desk surface to roll the tape. Watch the tape roll shrink dynamically as you draw loops and bridges over intersecting trails!
          </p>
        </div>

        {/* Actions */}
        <button
          onClick={onClear}
          className="w-full bg-neutral-800 hover:bg-neutral-900 active:bg-neutral-950 text-white rounded-xl py-3 px-4 flex items-center justify-center space-x-2 text-sm font-medium transition-all shadow-md active:scale-[0.98]"
        >
          <Trash2 className="w-4 h-4" />
          <span>Clear Studio Board</span>
        </button>
      </div>
    </div>
  );
};

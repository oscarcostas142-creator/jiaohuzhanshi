import { useState, useEffect, ChangeEvent } from 'react';
import { Edit3, Lock, Check } from 'lucide-react';

interface EditableTextBlockProps {
  id: string;
  defaultText: string;
  className?: string;
  isItalicHeader?: boolean;
}

export function EditableTextBlock({ id, defaultText, className = '', isItalicHeader = false }: EditableTextBlockProps) {
  const [text, setText] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(`editable-text-${id}`);
      return saved !== null ? saved : defaultText;
    } catch {
      return defaultText;
    }
  });

  const [isLocked, setIsLocked] = useState<boolean>(() => {
    try {
      return localStorage.getItem(`editable-text-locked-${id}`) === 'true';
    } catch {
      return false;
    }
  });

  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [tempText, setTempText] = useState<string>('');
  const [showConfirm, setShowConfirm] = useState<boolean>(false);

  const startEditing = () => {
    setTempText(text);
    setIsEditing(true);
    setShowConfirm(false);
  };

  const handleSave = () => {
    setShowConfirm(true);
  };

  const confirmSaveAndLock = () => {
    try {
      localStorage.setItem(`editable-text-${id}`, tempText);
      localStorage.setItem(`editable-text-locked-${id}`, 'true');
    } catch (e) {
      console.error('Failed to save to localStorage', e);
    }
    setText(tempText);
    setIsLocked(true);
    setIsEditing(false);
    setShowConfirm(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setShowConfirm(false);
  };

  // Helper to split text by double newlines into clean paragraph elements
  const renderParagraphs = (rawText: string) => {
    const paragraphs = rawText.split(/\n\s*\n/).filter(p => p.trim() !== '');
    
    return paragraphs.map((paragraph, index) => {
      // If it's the very first paragraph and isItalicHeader is requested, style it as a blockquote
      if (index === 0 && isItalicHeader) {
        return (
          <p key={index} className="text-lg sm:text-xl text-white font-medium leading-relaxed mb-6 font-sans not-italic">
            {paragraph.startsWith('"') && paragraph.endsWith('"') ? paragraph : `"${paragraph}"`}
          </p>
        );
      }
      return (
        <p key={index} className="mb-4 last:mb-0 font-light">
          {paragraph}
        </p>
      );
    });
  };

  return (
    <div className={`w-full group/text relative ${className}`} id={`editable-section-${id}`}>
      {isEditing ? (
        <div className="space-y-4 bg-neutral-900/30 border border-neutral-800 p-6 transition-all duration-300">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
            <span className="font-mono text-[10px] tracking-widest text-neutral-400 uppercase flex items-center gap-1.5">
              <Edit3 className="w-3 h-3" /> EDITING CONTENT
            </span>
            <span className="font-mono text-[9px] tracking-widest text-neutral-500 uppercase">
              SEPARATE PARAGRAPHS WITH DOUBLE ENTER
            </span>
          </div>

          <textarea
            value={tempText}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setTempText(e.target.value)}
            className="w-full min-h-[220px] bg-neutral-950 border border-neutral-800 p-4 text-neutral-300 font-sans text-sm sm:text-base leading-relaxed focus:outline-none focus:border-neutral-500 resize-y"
            placeholder="Type your custom chapter text here..."
          />

          {showConfirm ? (
            <div className="p-4 bg-neutral-950 border border-red-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="font-mono text-[10px] font-bold text-red-400 uppercase block tracking-wider">
                  ⚠️ CONFIRM PERMANENT LOCK
                </span>
                <span className="font-mono text-[9px] text-neutral-500 uppercase block mt-1">
                  Once saved, this text can NEVER be edited or modified again.
                </span>
              </div>
              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={confirmSaveAndLock}
                  className="bg-red-600 hover:bg-red-700 text-white font-mono text-[10px] font-bold tracking-widest uppercase px-3 py-2 cursor-pointer transition-colors"
                >
                  CONFIRM & LOCK
                </button>
                <button
                  type="button"
                  onClick={() => setShowConfirm(false)}
                  className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-mono text-[10px] font-bold tracking-widest uppercase px-3 py-2 cursor-pointer transition-colors"
                >
                  BACK
                </button>
              </div>
            </div>
          ) : (
            <div className="flex justify-end gap-2.5">
              <button
                type="button"
                onClick={handleCancel}
                className="bg-neutral-900 hover:bg-neutral-800 text-neutral-400 font-mono text-[10px] font-bold tracking-widest uppercase px-4 py-2 border border-neutral-800 cursor-pointer transition-colors"
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="bg-white text-black hover:bg-neutral-200 font-mono text-[10px] font-bold tracking-widest uppercase px-4 py-2 cursor-pointer transition-colors flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" /> SAVE & LOCK
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="relative">
          {/* Render clean typography */}
          <div className="text-neutral-300 font-sans text-sm sm:text-base leading-relaxed tracking-wide">
            {renderParagraphs(text)}
          </div>

          {/* Edit Trigger - Only visible when not locked and when hovering */}
          {!isLocked && (
            <div className="mt-6 flex items-center gap-2">
              <button
                onClick={startEditing}
                className="bg-neutral-900 hover:bg-neutral-800 text-white font-mono text-[10px] font-bold tracking-widest uppercase px-4 py-2 border border-neutral-800 cursor-pointer transition-all flex items-center gap-1.5 group-hover/text:border-neutral-500 duration-200"
              >
                <Edit3 className="w-3 h-3" /> EDIT TEXT CONTENT
              </button>
              <span className="font-mono text-[9px] text-neutral-500 uppercase tracking-wider">
                (EDITABLE UNTIL LOCKED)
              </span>
            </div>
          )}

          {/* Locked Status Indicator (Subtle, only when locked and hovering to show authenticity) */}
          {isLocked && (
            <div className="mt-6 opacity-0 group-hover/text:opacity-100 transition-opacity duration-300 flex items-center gap-4">
              <span className="font-mono text-[9px] tracking-widest text-neutral-600 uppercase flex items-center gap-1">
                <Lock className="w-3 h-3 text-neutral-700" /> CONTENT LOCKED PERMANENTLY
              </span>
              <button
                type="button"
                onClick={() => {
                  try {
                    localStorage.removeItem(`editable-text-locked-${id}`);
                  } catch (e) {
                    console.error(e);
                  }
                  setIsLocked(false);
                }}
                className="bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white font-mono text-[9px] tracking-widest uppercase px-2.5 py-1 border border-neutral-800 cursor-pointer transition-colors"
              >
                UNLOCK TO EDIT
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

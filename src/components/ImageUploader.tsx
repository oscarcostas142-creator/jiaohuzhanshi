import { useState, useRef, DragEvent, ChangeEvent, MouseEvent } from 'react';
import { Upload, Trash2, Image as ImageIcon } from 'lucide-react';

interface ImageUploaderProps {
  id: string;
  value: string | null;
  onChange: (value: string | null) => void;
  title: string;
  description: string;
}

export function ImageUploader({ id, value, onChange, title, description }: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (PNG, JPG, WEBP).');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        onChange(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleRemove = (e: MouseEvent) => {
    e.stopPropagation();
    onChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="w-full max-w-sm md:max-w-md select-none mb-6">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
        id={`file-input-${id}`}
      />

      {value ? (
        <div className="relative border border-neutral-800 p-0 shadow-2xl overflow-hidden transition-all duration-300 w-full">
          <img
            src={value}
            alt="Uploaded archive content"
            className="w-full h-auto block"
          />
        </div>
      ) : (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={triggerFileInput}
          className={`w-full aspect-[3/4] p-6 border-2 border-dashed flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 ${
            isDragging
              ? 'border-white bg-white/5 scale-[1.01]'
              : 'border-neutral-800 bg-neutral-900/30 hover:border-neutral-500 hover:bg-neutral-900/50'
          }`}
        >
          <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-none mb-4 group-hover:border-neutral-600 transition-colors">
            <Upload className="w-6 h-6 text-neutral-400" />
          </div>
          <span className="font-sans font-bold text-sm tracking-wider text-white mb-2 uppercase">
            {title}
          </span>
          <span className="font-mono text-[10px] tracking-widest text-neutral-500 uppercase px-4 max-w-xs leading-relaxed mb-4">
            {description}
          </span>
          <span className="text-[10px] font-mono text-neutral-400 border border-neutral-800 px-2.5 py-1 bg-neutral-950">
            DRAG & DROP OR CLICK
          </span>
        </div>
      )}
    </div>
  );
}

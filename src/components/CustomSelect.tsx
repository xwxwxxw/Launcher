import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface Option {
  value: string;
  label: string;
  subLabel?: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  className?: string;
  placeholder?: string;
  icon?: React.ReactNode;
}

export default function CustomSelect({ value, onChange, options, className = '', placeholder = '', icon }: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(opt => opt.value === value);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative inline-block ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-zinc-900 border border-zinc-800 hover:border-zinc-700/80 hover:bg-zinc-800/50 text-zinc-200 text-xs font-bold rounded-xl px-4 py-2.5 outline-none cursor-pointer transition-all flex items-center justify-between gap-2.5 shadow-inner"
      >
        <div className="flex items-center gap-2 truncate">
          {icon}
          <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
        </div>
        <ChevronDown size={14} className={`text-zinc-500 transition-transform duration-200 ${isOpen ? 'rotate-180 text-emerald-400' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-1.5 w-full min-w-[220px] bg-zinc-950 border border-zinc-800/80 backdrop-blur-xl rounded-xl shadow-[0_10px_25px_rgba(0,0,0,0.6)] p-1.5 z-50 flex flex-col gap-0.5 max-h-[250px] overflow-y-auto">
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full flex flex-col px-3 py-2 rounded-lg text-left transition-all ${
                  isSelected
                    ? 'bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20'
                    : 'hover:bg-zinc-900 text-zinc-400 hover:text-zinc-100'
                }`}
              >
                <span className="text-xs font-bold truncate">{opt.label}</span>
                {opt.subLabel && (
                  <span className="text-[9px] text-zinc-500 mt-0.5 font-mono truncate">{opt.subLabel}</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

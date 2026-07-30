import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, X } from 'lucide-react';

export default function MultiSelectFilter({ label, options = [], selected = [], onChange, placeholder = "All" }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggleOption = (option) => {
    if (selected.includes(option)) {
      onChange(selected.filter(item => item !== option));
    } else {
      onChange([...selected, option]);
    }
  };

  const handleSelectAll = () => {
    onChange([...options]);
  };

  const handleClear = () => {
    onChange([]);
  };

  const getDisplayText = () => {
    if (selected.length === 0) return placeholder;
    if (selected.length === 1) return selected[0];
    return `${selected.length} Selected`;
  };

  return (
    <div className="relative" ref={containerRef}>
      <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5 block">
        {label}
      </label>

      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between bg-slate-50 border rounded-xl px-3 py-2 text-xs md:text-sm font-semibold transition-all cursor-pointer ${
          selected.length > 0
            ? 'border-google-blue bg-blue-50/50 text-google-blue'
            : 'border-slate-300 text-slate-800 hover:border-slate-400'
        }`}
      >
        <span className="truncate pr-1 font-bold">{getDisplayText()}</span>
        <div className="flex items-center gap-1 shrink-0">
          {selected.length > 0 && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                handleClear();
              }}
              className="p-0.5 rounded-full hover:bg-blue-200/60 text-google-blue transition-colors"
              title="Clear selection"
            >
              <X className="w-3 h-3" />
            </span>
          )}
          <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 text-slate-500 ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {/* Popover Menu */}
      {isOpen && (
        <div className="absolute left-0 right-0 mt-1.5 z-40 bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto p-1.5 space-y-0.5 animate-in fade-in zoom-in-95 duration-100 min-w-[180px]">
          {/* Action Header */}
          <div className="flex items-center justify-between px-2 py-1 border-b border-slate-100 mb-1 text-[11px] font-extrabold text-slate-500">
            <button
              type="button"
              onClick={handleSelectAll}
              className="hover:text-google-blue transition-colors cursor-pointer"
            >
              Select All
            </button>
            {selected.length > 0 && (
              <button
                type="button"
                onClick={handleClear}
                className="hover:text-red-600 transition-colors cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>

          {/* Options List */}
          {options.length === 0 ? (
            <div className="px-2 py-2 text-xs text-slate-400 italic text-center">No options available</div>
          ) : (
            options.map((option) => {
              const isChecked = selected.includes(option);
              return (
                <div
                  key={option}
                  onClick={() => handleToggleOption(option)}
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                    isChecked
                      ? 'bg-blue-50 text-google-blue font-bold'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className="truncate mr-2">{option}</span>
                  <div
                    className={`w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0 ${
                      isChecked
                        ? 'bg-google-blue border-google-blue text-white'
                        : 'border-slate-300 bg-white'
                    }`}
                  >
                    {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

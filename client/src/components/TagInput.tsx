import { useState, useRef, useEffect, KeyboardEvent } from 'react';

interface Props {
  value: string[];
  onChange: (tags: string[]) => void;
  suggestions?: string[];
  placeholder?: string;
  id?: string;
}

export default function TagInput({ value, onChange, suggestions = [], placeholder = 'Type and press Enter', id }: Props) {
  const [input, setInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = input.trim()
    ? suggestions.filter(
        (s) =>
          s.toLowerCase().includes(input.toLowerCase()) &&
          !value.map((v) => v.toLowerCase()).includes(s.toLowerCase()),
      ).slice(0, 8)
    : [];

  useEffect(() => {
    setHighlighted(-1);
  }, [input]);

  function addTag(tag: string) {
    const trimmed = tag.trim();
    if (!trimmed) return;
    if (value.map((v) => v.toLowerCase()).includes(trimmed.toLowerCase())) return;
    onChange([...value, trimmed]);
    setInput('');
    setShowSuggestions(false);
  }

  function removeTag(idx: number) {
    onChange(value.filter((_, i) => i !== idx));
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if ((e.key === 'Enter' || e.key === ',') && !e.shiftKey) {
      e.preventDefault();
      if (highlighted >= 0 && filtered[highlighted]) {
        addTag(filtered[highlighted]);
      } else {
        addTag(input);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, -1));
    } else if (e.key === 'Backspace' && input === '' && value.length > 0) {
      removeTag(value.length - 1);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  }

  return (
    <div className="relative">
      <div
        className="min-h-[42px] w-full rounded-lg border border-gray-300 px-2 py-1.5 flex flex-wrap gap-1.5
                   focus-within:ring-2 focus-within:ring-tata-blue focus-within:border-transparent bg-white cursor-text"
        onClick={() => inputRef.current?.focus()}
      >
        {value.map((tag, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-tata-light text-tata-navy text-xs font-medium"
          >
            {tag}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); removeTag(i); }}
              className="text-tata-navy/60 hover:text-red-500 transition-colors leading-none"
            >
              ×
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          id={id}
          value={input}
          onChange={(e) => { setInput(e.target.value); setShowSuggestions(true); }}
          onKeyDown={onKeyDown}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          placeholder={value.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[120px] outline-none text-sm py-0.5 px-1 bg-transparent"
        />
      </div>

      {showSuggestions && filtered.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-auto">
          {filtered.map((s, i) => (
            <li
              key={s}
              onMouseDown={() => addTag(s)}
              className={`px-3 py-2 text-sm cursor-pointer ${
                i === highlighted ? 'bg-tata-light text-tata-navy' : 'hover:bg-gray-50'
              }`}
            >
              {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

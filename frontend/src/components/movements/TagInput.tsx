import { useState, type KeyboardEvent } from 'react';

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  label?: string;
  maxTags?: number;
}

export default function TagInput({ value, onChange, label = 'Tags', maxTags = 10 }: TagInputProps) {
  const [input, setInput] = useState('');

  const addTag = (raw: string) => {
    const tag = raw.trim().toLowerCase();
    if (!tag || tag.length > 30 || value.length >= maxTags || value.includes(tag)) return;
    onChange([...value, tag]);
    setInput('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(input);
    }
    if (e.key === 'Backspace' && !input && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  const removeTag = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-400">
        {label}
      </label>
      <div className="flex flex-wrap items-center gap-1.5 px-3 py-2 border border-gray-600 rounded-xl bg-gray-600 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all duration-200">
        {value.map((tag, i) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-gray-600 text-sm text-gray-400"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(i)}
              className="text-gray-400 hover:text-red-400"
              aria-label={`Remove tag ${tag}`}
            >
              &times;
            </button>
          </span>
        ))}
        {value.length < maxTags && (
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => { if (input) addTag(input); }}
            placeholder={value.length === 0 ? 'Add tags...' : ''}
            className="flex-1 min-w-[80px] bg-transparent outline-none text-sm text-gray-100 placeholder-gray-500"
          />
        )}
      </div>
      {value.length >= maxTags && (
        <p className="text-xs text-gray-400">Maximum {maxTags} tags reached</p>
      )}
    </div>
  );
}

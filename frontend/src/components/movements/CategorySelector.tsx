import { useState, useRef, useEffect } from 'react';
import { PREDEFINED_CATEGORIES, getCategoryColor } from '../../constants/categories';

interface CategorySelectorProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
}

export default function CategorySelector({ value, onChange, label = 'Category' }: CategorySelectorProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = PREDEFINED_CATEGORIES.filter(
    (c) => !inputValue || c.toLowerCase().includes(inputValue.toLowerCase())
  );

  const handleSelect = (cat: string) => {
    onChange(cat);
    setInputValue(cat);
    setOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    onChange(e.target.value);
    setOpen(true);
  };

  return (
    <div ref={containerRef} className="space-y-1 relative">
      <label className="block text-sm font-medium text-gray-400">
        {label}
      </label>
      <div className="relative">
        {value && (
          <span
            className="absolute left-3 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: getCategoryColor(value) }}
          />
        )}
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => setOpen(true)}
          placeholder="Select or type category..."
          className={`w-full px-4 py-3 border rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-0 border-gray-600 bg-gray-600 text-gray-100 focus:border-blue-500 focus:ring-blue-500/20 ${value ? 'pl-9' : ''}`}
        />
      </div>
      {open && filtered.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto bg-gray-700 border border-gray-700 rounded-xl">
          {filtered.map((cat) => (
            <li
              key={cat}
              onClick={() => handleSelect(cat)}
              className="flex items-center gap-2 px-4 py-2 cursor-pointer hover:bg-gray-600 text-sm text-gray-100"
            >
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: getCategoryColor(cat) }}
              />
              {cat}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

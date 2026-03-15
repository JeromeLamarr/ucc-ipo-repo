import { useRef, useState, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { Building, Search, ChevronDown, X } from 'lucide-react';

interface Department {
  id: string;
  name: string;
}

interface Props {
  departments: Department[];
  value: string;
  onChange: (id: string) => void;
  required?: boolean;
}

export function SearchableDepartmentDropdown({ departments, value, onChange, required }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Position the portal panel directly below the trigger button
  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setPanelStyle({
      position: 'fixed',
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
      zIndex: 9999,
    });
  }, [open]);

  // Close on click outside either trigger or panel
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current && !triggerRef.current.contains(target) &&
        panelRef.current && !panelRef.current.contains(target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  // Close on scroll so panel doesn't drift from trigger
  useEffect(() => {
    if (!open) return;
    const handleScroll = () => setOpen(false);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [open]);

  const filtered = departments.filter((d) =>
    d.name.toLowerCase().includes(search.toLowerCase())
  );

  const panel = (
    <div
      ref={panelRef}
      style={panelStyle}
      className="bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden"
    >
      {/* Search input */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100">
        <Search className="h-4 w-4 text-gray-400 flex-shrink-0" />
        <input
          type="text"
          autoFocus
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search departments..."
          className="flex-1 text-sm outline-none bg-transparent placeholder-gray-400"
        />
        {search && (
          <button type="button" onClick={() => setSearch('')} title="Clear search" className="text-gray-400 hover:text-gray-600">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Filtered list */}
      <ul className="max-h-52 overflow-y-auto">
        {departments.length === 0 ? (
          <li className="px-4 py-3 text-sm text-gray-400 text-center">No departments available</li>
        ) : filtered.length === 0 ? (
          <li className="px-4 py-3 text-sm text-gray-400 text-center">No departments found</li>
        ) : (
          filtered.map((dept) => (
            <li key={dept.id}>
              <button
                type="button"
                onClick={() => {
                  onChange(dept.id);
                  setOpen(false);
                  setSearch('');
                }}
                className={`w-full text-left px-4 py-2.5 text-sm hover:bg-blue-50 hover:text-blue-700 transition-colors ${
                  value === dept.id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
                }`}
              >
                {dept.name}
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  );

  return (
    <div className="relative">
      {/* Hidden input keeps required/form-submit validation intact */}
      <input type="hidden" value={value} required={required} />

      {/* Trigger button */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center pl-10 pr-4 py-2.5 border rounded-lg bg-white text-left focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          value ? 'border-gray-300 text-gray-900' : 'border-gray-300 text-gray-400'
        }`}
      >
        <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
        <span className="flex-1 truncate text-sm">
          {value
            ? departments.find((d) => d.id === value)?.name
            : 'Select a department...'}
        </span>
        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Portal-rendered dropdown panel — escapes all stacking contexts */}
      {open && createPortal(panel, document.body)}
    </div>
  );
}


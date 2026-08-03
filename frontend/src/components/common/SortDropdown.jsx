import React, { useState, useRef, useEffect } from 'react';
import { ArrowDownAZ, ArrowUpZA, SortAsc, SortDesc, Calendar, HardDrive, Type, Star } from 'lucide-react';

const SORT_OPTIONS = [
  { value: 'name', label: 'Name', icon: <Type size={16} /> },
  { value: 'size', label: 'Size', icon: <HardDrive size={16} /> },
  { value: 'date', label: 'Upload Date', icon: <Calendar size={16} /> },
  { value: 'modified', label: 'Modified Date', icon: <Calendar size={16} /> },
  { value: 'extension', label: 'Extension', icon: <Type size={16} /> },
  { value: 'type', label: 'File Type', icon: <Type size={16} /> },
  { value: 'favorite', label: 'Favorite', icon: <Star size={16} /> },
];

const SortDropdown = ({ sortBy, setSortBy, sortOrder, setSortOrder }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const activeOption = SORT_OPTIONS.find(opt => opt.value === sortBy) || SORT_OPTIONS[0];

  return (
    <div className="sort-dropdown-container" ref={dropdownRef} style={{ position: 'relative' }}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
          padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer',
          color: 'var(--text-primary)', fontSize: '0.9rem',
          transition: 'all 0.2s ease'
        }}
        onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent-primary)'}
        onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
          {sortOrder === 'asc' ? <SortAsc size={16} /> : <SortDesc size={16} />}
          <span>Sort:</span>
        </div>
        <span style={{ fontWeight: 500 }}>{activeOption.label}</span>
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute', top: '100%', right: 0, marginTop: '0.5rem',
          background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
          borderRadius: '8px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          minWidth: '220px', padding: '0.5rem', display: 'flex', flexDirection: 'column', zIndex: 50
        }}>
          
          <div style={{ padding: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Sort By
          </div>
          {SORT_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => {
                if (sortBy === opt.value) {
                  setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                } else {
                  setSortBy(opt.value);
                  setSortOrder('asc');
                }
                setIsOpen(false);
              }}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0.5rem 0.75rem', border: 'none', background: sortBy === opt.value ? 'var(--bg-tertiary)' : 'transparent',
                color: sortBy === opt.value ? 'var(--accent-primary)' : 'var(--text-primary)',
                borderRadius: '6px', cursor: 'pointer', width: '100%', textAlign: 'left',
                transition: 'background 0.15s ease'
              }}
              onMouseEnter={(e) => { if (sortBy !== opt.value) e.currentTarget.style.background = 'var(--bg-tertiary)'; }}
              onMouseLeave={(e) => { if (sortBy !== opt.value) e.currentTarget.style.background = 'transparent'; }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {opt.icon}
                <span>{opt.label}</span>
              </div>
              {sortBy === opt.value && (
                sortOrder === 'asc' ? <ArrowUpZA size={14} /> : <ArrowDownAZ size={14} />
              )}
            </button>
          ))}
          
          <div style={{ height: '1px', background: 'var(--border-color)', margin: '0.5rem 0' }} />
          
          <div style={{ padding: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Direction
          </div>
          <button
            onClick={() => { setSortOrder('asc'); setIsOpen(false); }}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              padding: '0.5rem 0.75rem', border: 'none', background: sortOrder === 'asc' ? 'var(--bg-tertiary)' : 'transparent',
              color: sortOrder === 'asc' ? 'var(--accent-primary)' : 'var(--text-primary)',
              borderRadius: '6px', cursor: 'pointer', width: '100%', textAlign: 'left'
            }}
          >
            <SortAsc size={16} />
            <span>Ascending</span>
          </button>
          <button
            onClick={() => { setSortOrder('desc'); setIsOpen(false); }}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              padding: '0.5rem 0.75rem', border: 'none', background: sortOrder === 'desc' ? 'var(--bg-tertiary)' : 'transparent',
              color: sortOrder === 'desc' ? 'var(--accent-primary)' : 'var(--text-primary)',
              borderRadius: '6px', cursor: 'pointer', width: '100%', textAlign: 'left'
            }}
          >
            <SortDesc size={16} />
            <span>Descending</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default SortDropdown;

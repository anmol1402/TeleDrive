import React, { useState, useRef, useEffect } from 'react';
import { Filter, Image, Video, Music, FileText, Archive, Terminal, File, Check } from 'lucide-react';

export const FILTER_CATEGORIES = {
  'Images': { icon: <Image size={16} />, exts: ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'] },
  'Videos': { icon: <Video size={16} />, exts: ['mp4', 'avi', 'mov', 'mkv', 'webm'] },
  'Audio': { icon: <Music size={16} />, exts: ['mp3', 'wav', 'ogg', 'm4a'] },
  'PDF': { icon: <FileText size={16} color="#ef4444" />, exts: ['pdf'] },
  'Word': { icon: <FileText size={16} color="#3b82f6" />, exts: ['doc', 'docx'] },
  'Excel': { icon: <FileText size={16} color="#10b981" />, exts: ['xls', 'xlsx', 'csv'] },
  'PowerPoint': { icon: <FileText size={16} color="#f59e0b" />, exts: ['ppt', 'pptx'] },
  'ZIP': { icon: <Archive size={16} />, exts: ['zip'] },
  'RAR': { icon: <Archive size={16} />, exts: ['rar'] },
  'APK': { icon: <File size={16} />, exts: ['apk'] },
  'Programming': { icon: <Terminal size={16} />, exts: ['js', 'jsx', 'ts', 'tsx', 'py', 'html', 'css', 'json', 'java', 'c', 'cpp', 'rs', 'go'] },
  'Executables': { icon: <Terminal size={16} />, exts: ['exe', 'msi', 'bat', 'cmd', 'sh'] },
  'Archives': { icon: <Archive size={16} />, exts: ['zip', 'rar', '7z', 'tar', 'gz'] },
  'Documents': { icon: <FileText size={16} />, exts: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'csv', 'txt'] },
};

const FilterDropdown = ({ activeFilters, setActiveFilters }) => {
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

  const toggleFilter = (filterKey) => {
    if (activeFilters.includes(filterKey)) {
      setActiveFilters(activeFilters.filter(f => f !== filterKey));
    } else {
      setActiveFilters([...activeFilters, filterKey]);
    }
  };

  return (
    <div className="filter-dropdown-container" ref={dropdownRef} style={{ position: 'relative' }}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          background: activeFilters.length > 0 ? 'var(--accent-primary)' : 'var(--bg-secondary)', 
          border: '1px solid',
          borderColor: activeFilters.length > 0 ? 'var(--accent-primary)' : 'var(--border-color)',
          padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer',
          color: activeFilters.length > 0 ? 'white' : 'var(--text-primary)', 
          fontSize: '0.9rem',
          transition: 'all 0.2s ease'
        }}
        onMouseEnter={(e) => {
            if (activeFilters.length === 0) e.currentTarget.style.borderColor = 'var(--accent-primary)';
        }}
        onMouseLeave={(e) => {
            if (activeFilters.length === 0) e.currentTarget.style.borderColor = 'var(--border-color)';
        }}
      >
        <Filter size={16} />
        <span>Filter</span>
        {activeFilters.length > 0 && (
          <span style={{ 
            background: 'white', color: 'var(--accent-primary)', 
            borderRadius: '50%', width: '20px', height: '20px', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', 
            fontSize: '0.75rem', fontWeight: 'bold' 
          }}>
            {activeFilters.length}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="dropdown-menu-responsive" style={{
          minWidth: '240px', padding: '0.5rem',
          maxHeight: '400px', overflowY: 'auto'
        }}>
          
          <div style={{ padding: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            File Types
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {Object.keys(FILTER_CATEGORIES).map(key => {
              const isActive = activeFilters.includes(key);
              return (
                <button
                  key={key}
                  onClick={() => toggleFilter(key)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '0.5rem 0.75rem', border: 'none', 
                    background: isActive ? 'var(--bg-tertiary)' : 'transparent',
                    color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                    borderRadius: '6px', cursor: 'pointer', width: '100%', textAlign: 'left',
                    transition: 'background 0.15s ease'
                  }}
                  onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = 'var(--bg-tertiary)'; }}
                  onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {FILTER_CATEGORIES[key].icon}
                    <span>{key}</span>
                  </div>
                  {isActive && <Check size={16} color="var(--accent-primary)" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default FilterDropdown;

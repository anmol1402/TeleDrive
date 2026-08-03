import React, { useState, useEffect, useRef } from 'react';
import { Menu, Cloud, Search, LayoutGrid, List, Sun, Moon, Clock, File, Folder, X } from 'lucide-react';

const DriveTopbar = ({ 
  isSidebarOpen, 
  setIsSidebarOpen, 
  searchQuery, 
  setSearchQuery, 
  viewMode, 
  setViewMode, 
  isDarkMode, 
  setIsDarkMode,
  files = [],
  setSelectedFiles,
  setCurrentPath,
  children
}) => {
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useState(() => {
    try { return JSON.parse(localStorage.getItem('recentSearches')) || []; }
    catch (e) { return []; }
  });
  const searchRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const saveRecentSearch = (query) => {
    if (!query.trim()) return;
    const newRecents = [query.trim(), ...recentSearches.filter(r => r !== query.trim())].slice(0, 5);
    setRecentSearches(newRecents);
    localStorage.setItem('recentSearches', JSON.stringify(newRecents));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      saveRecentSearch(searchQuery);
      setIsSearchFocused(false);
    }
  };

  const handleSuggestionClick = (file) => {
    saveRecentSearch(file.filename);
    setSearchQuery(file.filename);
    if (setSelectedFiles) setSelectedFiles([file]);
    if (file.isFolder && setCurrentPath) setCurrentPath(file.folder === '/' ? `/${file.filename}` : `${file.folder}/${file.filename}`);
    setIsSearchFocused(false);
  };

  const handleRecentClick = (query) => {
    setSearchQuery(query);
    saveRecentSearch(query);
    setIsSearchFocused(false);
  };

  const removeRecent = (e, query) => {
    e.stopPropagation();
    const newRecents = recentSearches.filter(r => r !== query);
    setRecentSearches(newRecents);
    localStorage.setItem('recentSearches', JSON.stringify(newRecents));
  };

  const suggestions = searchQuery.trim() 
    ? files.filter(f => f.filename.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 6)
    : [];
  return (
    <div className="topbar">
      <div className="topbar-logo-container" style={{ width: '256px', paddingLeft: '0.5rem', gap: '0.5rem' }}>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="topbar-btn" title="Main menu">
          <Menu size={24} color="var(--text-secondary)" />
        </button>
        <div className="logo hide-on-mobile" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
          <Cloud className="logo-icon" size={32} color="var(--accent-primary)" />
          <span style={{ fontSize: '1.375rem', fontWeight: 400, color: 'var(--text-secondary)', fontFamily: 'Outfit' }}>TeleDrive</span>
        </div>
      </div>
      
      <div className="search-container" style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, padding: '0 2rem' }}>
        <div className="search-bar-wrapper" ref={searchRef} style={{ position: 'relative', width: '100%', maxWidth: '720px' }}>
          <div className={`search-bar ${isSearchFocused ? 'focused' : ''}`} style={{ background: isSearchFocused ? 'var(--bg-secondary)' : 'var(--bg-tertiary)', boxShadow: isSearchFocused ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>
            <Search className="search-icon" size={24} />
            <input
              type="text"
              placeholder="Search in Drive"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onKeyDown={handleKeyDown}
            />
            {searchQuery && (
              <button 
                onClick={() => { setSearchQuery(''); searchRef.current.querySelector('input').focus(); }} 
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--text-secondary)' }}
              >
                <X size={20} />
              </button>
            )}
          </div>

          {isSearchFocused && (
            <div className="search-dropdown" style={{
              position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '0.25rem',
              background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
              borderRadius: '8px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
              zIndex: 100, padding: '0.5rem 0', display: 'flex', flexDirection: 'column',
              maxHeight: '400px', overflowY: 'auto'
            }}>
              
              {!searchQuery.trim() && recentSearches.length > 0 && (
                <>
                  <div style={{ padding: '0.5rem 1rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Recent Searches</div>
                  {recentSearches.map((query, idx) => (
                    <div key={idx} className="search-suggestion-item" onClick={() => handleRecentClick(query)} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 1rem',
                      cursor: 'pointer', transition: 'background 0.2s', color: 'var(--text-primary)'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-tertiary)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <Clock size={18} color="var(--text-secondary)" />
                        <span>{query}</span>
                      </div>
                      <button onClick={(e) => removeRecent(e, query)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '4px' }}>
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </>
              )}

              {searchQuery.trim() && suggestions.length > 0 && (
                <>
                  <div style={{ padding: '0.5rem 1rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Suggestions</div>
                  {suggestions.map((file) => (
                    <div key={file.messageId} className="search-suggestion-item" onClick={() => handleSuggestionClick(file)} style={{
                      display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.5rem 1rem',
                      cursor: 'pointer', transition: 'background 0.2s', color: 'var(--text-primary)'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-tertiary)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      {file.isFolder ? <Folder size={18} color="var(--text-secondary)" /> : <File size={18} color="var(--text-secondary)" />}
                      <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.filename}</span>
                    </div>
                  ))}
                </>
              )}
              
              {searchQuery.trim() && suggestions.length === 0 && (
                <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  No matches found for "{searchQuery}"
                </div>
              )}

            </div>
          )}
        </div>
      </div>

      <div className="topbar-actions" style={{ display: 'flex', alignItems: 'center', gap: '1rem', paddingRight: '1.5rem' }}>
        <div style={{ display: 'flex', border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden' }}>
          <button 
            onClick={() => setViewMode('grid')} 
            style={{ padding: '0.25rem 0.5rem', background: viewMode === 'grid' ? 'var(--bg-tertiary)' : 'transparent', border: 'none', cursor: 'pointer', color: viewMode === 'grid' ? 'var(--text-primary)' : 'var(--text-secondary)' }}
            title="Grid view"
          >
            <LayoutGrid size={18} />
          </button>
          <button 
            onClick={() => setViewMode('list')} 
            style={{ padding: '0.25rem 0.5rem', background: viewMode === 'list' ? 'var(--bg-tertiary)' : 'transparent', border: 'none', cursor: 'pointer', color: viewMode === 'list' ? 'var(--text-primary)' : 'var(--text-secondary)' }}
            title="List view"
          >
            <List size={18} />
          </button>
        </div>
        <button onClick={() => setIsDarkMode(!isDarkMode)} className="topbar-btn" title="Toggle theme" style={{ marginRight: '-0.5rem' }}>
          {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>
        {children}
      </div>
    </div>
  );
};

export default DriveTopbar;

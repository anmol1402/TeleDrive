import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, LogOut, Cloud, FolderPlus, ChevronRight, BarChart2, Bot, Menu, Sun, Moon, LayoutGrid, List, X, Plus, Trash2 } from 'lucide-react';
import Sidebar from './Sidebar';
import FileGrid from '../files/FileGrid';
import Analytics from '../features/Analytics';
import AIChat from '../features/AIChat';
import DriveLayout from './DriveLayout';
import DriveTopbar from './DriveTopbar';
import MetadataSidebar from './MetadataSidebar';
import SortDropdown from '../common/SortDropdown';
import FilterDropdown, { FILTER_CATEGORIES } from '../common/FilterDropdown';
import BulkToolbar from '../files/BulkToolbar';
import UploadProgress from '../features/UploadProgress';
import UploadModal from '../features/UploadModal';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const formatBytes = (bytes, decimals = 2) => {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

const Dashboard = ({ user, onLogout }) => {
  const [activeCategory, setActiveCategory] = useState('My Drive');
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => window.innerWidth > 768);
  const [currentPath, setCurrentPath] = useState('/');
  const [searchQuery, setSearchQuery] = useState('');
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [uploadQueue, setUploadQueue] = useState([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [userProfile, setUserProfile] = useState(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [totalStorage, setTotalStorage] = useState(0);

  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(0);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const [viewMode, setViewMode] = useState(() => localStorage.getItem('viewMode') || 'grid');
  const [selectedFiles, setSelectedFiles] = useState([]);

  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const [sortBy, setSortBy] = useState(() => localStorage.getItem('sortBy') || 'name');
  const [sortOrder, setSortOrder] = useState(() => localStorage.getItem('sortOrder') || 'asc');
  const [activeFilters, setActiveFilters] = useState([]);

  useEffect(() => {
    localStorage.setItem('sortBy', sortBy);
    localStorage.setItem('sortOrder', sortOrder);
  }, [sortBy, sortOrder]);

  useEffect(() => {
    localStorage.setItem('viewMode', viewMode);
  }, [viewMode]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const fileInputRef = useRef(null);
  const profileMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
    };
    if (showProfileMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showProfileMenu]);

  const fetchFiles = async (query = '') => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/files${query ? `?query=${encodeURIComponent(query)}` : ''}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Unable to load files.');
      }
      setFiles(data.files);
      setLoadError('');
    } catch (error) {
      console.error("Failed to fetch files", error);
      setLoadError(error.message || 'Unable to load files. Check the backend connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserProfile();
    fetchTotalStorage();

    const eventSource = new EventSource(`${API_URL}/api/events`);
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'UPDATE') {
          setLastUpdate(Date.now());
        } else if (data.type === 'UPLOAD_PROGRESS') {
          setUploadQueue(prev => prev.map(u => 
            u.id === data.uploadId ? { 
                ...u, 
                progress: Math.min(100, 10 + ((data.loadedBytes / data.totalBytes) * 90)), 
                loadedBytes: data.loadedBytes, 
                totalBytes: data.totalBytes,
                phase: 'cloud'
            } : u
          ));
        }
      } catch (e) {
        console.error("Error parsing SSE data", e);
      }
    };

    return () => eventSource.close();
  }, []);

  useEffect(() => {
    fetchFiles();
  }, [lastUpdate]);

  useEffect(() => {
    fetchTotalStorage();
  }, [lastUpdate]);

  const fetchTotalStorage = async () => {
    try {
      const res = await fetch(`${API_URL}/api/analytics`);
      const data = await res.json();
      if (data.success) setTotalStorage(data.analytics.totalSize);
    } catch (e) {
      console.error("Failed to fetch storage", e);
    }
  };

  const fetchUserProfile = async () => {
    try {
      const res = await fetch(`${API_URL}/api/user`);
      const data = await res.json();
      if (data.success) {
        setUserProfile(data.user);
      }
    } catch (error) {
      console.error("Failed to fetch user profile", error);
    }
  };

  const xhrRefs = useRef({});

  const startUpload = (upload) => {
    const formData = new FormData();
    formData.append('file', upload.file);
    formData.append('folder', upload.folder);
    formData.append('category', upload.category);
    formData.append('uploadId', upload.id);

    const xhr = new XMLHttpRequest();
    xhrRefs.current[upload.id] = xhr;

    xhr.open('POST', `${API_URL}/api/files/upload`, true);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percentComplete = (event.loaded / event.total) * 10;
        setUploadQueue(prev => prev.map(u => 
          u.id === upload.id ? { 
            ...u, 
            progress: percentComplete, 
            loadedBytes: event.loaded,
            totalBytes: event.total 
          } : u
        ));
      }
    };

    xhr.onload = () => {
      if (xhr.status === 200) {
        setUploadQueue(prev => prev.map(u => 
          u.id === upload.id ? { ...u, status: 'success', progress: 100 } : u
        ));
        fetchFiles();
      } else {
        setUploadQueue(prev => prev.map(u => 
          u.id === upload.id ? { ...u, status: 'error' } : u
        ));
      }
      delete xhrRefs.current[upload.id];
    };

    xhr.onerror = () => {
      setUploadQueue(prev => prev.map(u => 
        u.id === upload.id ? { ...u, status: 'error' } : u
      ));
      delete xhrRefs.current[upload.id];
    };

    xhr.onabort = () => {
      // Set to paused if aborted explicitly
      setUploadQueue(prev => prev.map(u => 
        u.id === upload.id && u.status !== 'canceled' ? { ...u, status: 'paused' } : u
      ));
      delete xhrRefs.current[upload.id];
    };

    xhr.send(formData);
  };

  const handlePauseUpload = (id) => {
    if (xhrRefs.current[id]) {
      xhrRefs.current[id].abort();
    }
  };

  const handleResumeUpload = (id) => {
    setUploadQueue(prev => {
      const target = prev.find(u => u.id === id);
      if (target) {
        setTimeout(() => startUpload(target), 0);
        return prev.map(u => u.id === id ? { ...u, status: 'uploading', progress: 0, loadedBytes: 0, phase: 'local' } : u);
      }
      return prev;
    });
  };

  const handleCancelUpload = (id) => {
    if (xhrRefs.current[id]) {
      xhrRefs.current[id].abort();
    }
    setUploadQueue(prev => prev.filter(u => u.id !== id));
  };

  const processFiles = (fileList) => {
    const selectedFiles = Array.from(fileList);
    if (selectedFiles.length === 0) return;

    const getFileCategory = (filename) => {
      if (filename.match(/\.(jpg|jpeg|png|gif|svg|webp)$/i)) return 'Images';
      if (filename.match(/\.(mp4|avi|mov|mkv|webm)$/i)) return 'Media';
      if (filename.match(/\.(mp3|wav|ogg|m4a)$/i)) return 'Audio';
      if (filename.match(/\.(pdf|doc|docx|txt|xls|xlsx|ppt|pptx)$/i)) return 'Documents';
      return 'Uncategorized';
    };

    const newUploads = selectedFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      filename: file.name,
      folder: currentPath,
      category: getFileCategory(file.name),
      progress: 0,
      loadedBytes: 0,
      totalBytes: file.size,
      status: 'uploading',
      phase: 'local'
    }));

    setUploadQueue(prev => [...prev, ...newUploads]);

    newUploads.forEach(upload => {
      startUpload(upload);
    });
  };

  const handleFileUpload = (e) => {
    processFiles(e.target.files);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      await fetch(`${API_URL}/api/files/folder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folderName: newFolderName,
          parentPath: currentPath,
          category: activeCategory === 'My Drive' ? 'Uncategorized' : activeCategory
        })
      });
      setCreatingFolder(false);
      setNewFolderName('');
      fetchFiles();
    } catch (error) {
      console.error("Failed to create folder", error);
    }
  };

  const handleEmptyTrash = async () => {
    const trashedFiles = files.filter(f => f.trashed === true);
    if (trashedFiles.length === 0) return;

    if (window.confirm("Are you sure you want to permanently delete all items in the Trash? This cannot be undone.")) {
      try {
        const messageIds = trashedFiles.map(f => f.messageId);
        await fetch(`${API_URL}/api/files/delete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messageIds })
        });
        fetchFiles();
      } catch (error) {
        console.error("Failed to empty trash", error);
      }
    }
  };

  useEffect(() => {
    setCurrentPath('/');
    setSelectedFiles([]);
  }, [activeCategory]);

  const normalizePath = (p) => {
    if (!p) return '/';
    let s = String(p).trim();
    if (!s.startsWith('/')) s = '/' + s;
    if (s.length > 1 && s.endsWith('/')) s = s.slice(0, -1);
    return s;
  };

  const filteredFiles = files.filter(f => {
    // Trash view
    if (activeCategory === 'Trash') {
      return f.trashed === true;
    }
    // Filter out trashed files for normal views
    if (f.trashed) return false;

    // Favorites view
    if (activeCategory === 'Favorites') {
      return f.favorite === true;
    }

    // Advanced Filters
    if (activeFilters.length > 0) {
      if (f.isFolder) return false;
      const ext = (f.filename || '').split('.').pop().toLowerCase();
      let matches = false;
      for (const filter of activeFilters) {
        if (FILTER_CATEGORIES[filter]?.exts.includes(ext)) {
          matches = true;
          break;
        }
      }
      if (!matches) return false;
    }

    // Search and Path filtering
    if (debouncedSearchQuery) {
      if (!f.filename.toLowerCase().includes(debouncedSearchQuery.toLowerCase())) {
        return false;
      }
    } else {
      if (activeCategory === 'My Drive') {
        if (normalizePath(f.folder) !== normalizePath(currentPath)) return false;
      }
    }

    if (activeCategory === 'My Drive') return true;
    if (activeCategory === 'Documents' && f.filename.match(/\.(pdf|doc|docx|txt|xls|xlsx|ppt|pptx|csv|md|c|cpp|py|js|json|html|css|rs|go|java|sh|zip|tar|gz)$/i)) return true;
    if (activeCategory === 'Images' && f.filename.match(/\.(jpg|jpeg|png|gif|svg|webp)$/i)) return true;
    if (activeCategory === 'Media' && f.filename.match(/\.(mp4|avi|mov|mkv|webm)$/i)) return true;
    if (activeCategory === 'Audio' && f.filename.match(/\.(mp3|wav|ogg|m4a)$/i)) return true;

    if (f.category === activeCategory) return true;
    return false;
  });

  const sortedFiles = useMemo(() => {
    const sorted = [...filteredFiles].sort((a, b) => {
      // Always put folders first unless sorting by type
      if (sortBy !== 'type') {
        if (a.isFolder && !b.isFolder) return -1;
        if (!a.isFolder && b.isFolder) return 1;
      }

      let cmp = 0;
      switch (sortBy) {
        case 'name':
          cmp = (a.filename || '').localeCompare(b.filename || '', undefined, { numeric: true, sensitivity: 'base' });
          break;
        case 'size':
          cmp = (a.size || 0) - (b.size || 0);
          break;
        case 'date':
          cmp = new Date(a.uploadedAt || 0).getTime() - new Date(b.uploadedAt || 0).getTime();
          break;
        case 'modified':
          const modA = a.metadata?.lastModified || a.uploadedAt || 0;
          const modB = b.metadata?.lastModified || b.uploadedAt || 0;
          cmp = new Date(modA).getTime() - new Date(modB).getTime();
          break;
        case 'extension':
          const extA = a.isFolder ? '' : (a.filename || '').split('.').pop().toLowerCase();
          const extB = b.isFolder ? '' : (b.filename || '').split('.').pop().toLowerCase();
          cmp = extA.localeCompare(extB);
          break;
        case 'type':
          const typeA = a.isFolder ? 'a_folder' : a.category || 'z_unknown';
          const typeB = b.isFolder ? 'a_folder' : b.category || 'z_unknown';
          cmp = typeA.localeCompare(typeB);
          break;
        case 'favorite':
          cmp = (a.favorite === b.favorite) ? 0 : a.favorite ? -1 : 1;
          break;
        default:
          cmp = 0;
      }

      return sortOrder === 'asc' ? cmp : -cmp;
    });
    return sorted;
  }, [filteredFiles, sortBy, sortOrder]);

  const numFolders = filteredFiles.filter(f => f.isFolder).length;
  const numFiles = filteredFiles.filter(f => !f.isFolder).length;
  const folderText = numFolders > 0 ? `, ${numFolders} folder${numFolders > 1 ? 's' : ''}` : '';
  const countText = `${numFiles} file${numFiles !== 1 ? 's' : ''}${folderText}`;

  return (
    <>
      <DriveLayout
      sidebar={

        <>
          {isSidebarOpen && window.innerWidth <= 768 && (
            <div className="sidebar-overlay-backdrop" onClick={() => setIsSidebarOpen(false)}></div>
          )}
          <Sidebar
            activeCategory={activeCategory}
            setActiveCategory={(category) => {
              setActiveCategory(category);
              if (window.innerWidth <= 768) setIsSidebarOpen(false);
            }}
            isSidebarOpen={isSidebarOpen}
            files={files}
            currentPath={currentPath}
            setCurrentPath={setCurrentPath}
            onNewUploadClick={() => setShowUploadModal(true)}
            totalStorage={totalStorage}
          />
        </>
      }
      topbar={
        <DriveTopbar
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          viewMode={viewMode}
          setViewMode={setViewMode}
          isDarkMode={isDarkMode}
          setIsDarkMode={setIsDarkMode}
          files={files}
          setSelectedFiles={setSelectedFiles}
          setCurrentPath={setCurrentPath}
        >
          {!searchQuery && activeCategory !== 'Trash' && activeCategory !== 'Favorites' && (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={() => setShowAIChat(true)} className="topbar-btn" title="AI Chat"><Bot size={20} /></button>
              <button onClick={() => setShowAnalytics(true)} className="topbar-btn" title="Analytics"><BarChart2 size={20} /></button>
              <button onClick={() => setCreatingFolder(true)} className="topbar-btn" title="New Folder"><FolderPlus size={20} /></button>
              <div style={{ position: 'relative' }} ref={profileMenuRef}>
                <button
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="topbar-btn"
                  style={{
                    padding: 0, borderRadius: '50%', overflow: 'hidden', width: '36px', height: '36px',
                    border: '2px solid transparent', borderColor: showProfileMenu ? 'var(--accent-primary)' : 'transparent',
                  }}
                >
                  <img src={`${API_URL}/api/user/avatar`} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.style.display = 'none'; }} />
                </button>
                {showProfileMenu && (
                  <div style={{
                    position: 'absolute', top: 'calc(100% + 0.5rem)', right: 0, background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
                    borderRadius: '12px', padding: '0.5rem', minWidth: '240px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)', zIndex: 50, display: 'flex', flexDirection: 'column', gap: '0.5rem'
                  }}>
                    {userProfile && (
                      <div style={{ padding: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>
                        <div style={{ fontWeight: 'bold' }}>{userProfile.firstName} {userProfile.lastName || ''}</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>@{userProfile.username}</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{userProfile.phone}</div>
                      </div>
                    )}
                    <button onClick={onLogout} className="action-btn" style={{ width: '100%', justifyContent: 'flex-start', color: '#ef4444' }}>
                      <LogOut size={16} style={{ marginRight: '0.5rem' }} /> Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </DriveTopbar>
      }
      rightSidebar={
        <MetadataSidebar
          files={selectedFiles}
          isOpen={selectedFiles.length > 0}
          onClose={() => setSelectedFiles([])}
          userProfile={userProfile}
        />
      }
    >
      <div className="main-content" onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column' }}>
        {isDragging && (
          <div className="drag-overlay">
            <div className="drag-overlay-content">
              <Cloud size={64} />
              <span>Drop files here to upload to {activeCategory}</span>
            </div>
          </div>
        )}

        <div className="content-area">
          {loadError && (
            <div role="alert" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '1rem', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.35)', color: 'var(--text-primary)' }}>
              <span>{loadError}</span>
              <button onClick={() => fetchFiles()} className="action-btn" style={{ flexShrink: 0 }}>Retry</button>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 className="section-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {searchQuery ? 'Search Results' : (
                <div className="breadcrumb">
                  <span className={`breadcrumb-segment ${currentPath === '/' ? 'active' : ''}`} onClick={() => setCurrentPath('/')}>
                    {activeCategory} <span style={{ fontSize: '0.85em', color: 'var(--text-secondary)', marginLeft: '0.5rem', fontWeight: 'normal' }}>({countText})</span>
                  </span>
                  {currentPath !== '/' && currentPath.split('/').filter(Boolean).map((segment, idx, arr) => {
                    const isLast = idx === arr.length - 1;
                    const pathUpToSegment = '/' + arr.slice(0, idx + 1).join('/');
                    return (
                      <React.Fragment key={pathUpToSegment}>
                        <ChevronRight size={16} className="breadcrumb-separator" />
                        <span className={`breadcrumb-segment ${isLast ? 'active' : ''}`} onClick={() => !isLast && setCurrentPath(pathUpToSegment)}>
                          {segment}
                        </span>
                      </React.Fragment>
                    );
                  })}
                </div>
              )}
            </h2>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <FilterDropdown activeFilters={activeFilters} setActiveFilters={setActiveFilters} />
              <SortDropdown sortBy={sortBy} setSortBy={setSortBy} sortOrder={sortOrder} setSortOrder={setSortOrder} />
              {activeCategory === 'Trash' && (
                <button onClick={handleEmptyTrash} className="empty-trash-btn" style={{ display: 'flex', alignItems: 'center' }}>
                  <Trash2 size={16} style={{ marginRight: '0.5rem' }} /> Empty Trash
                </button>
              )}
            </div>
          </div>

          {activeFilters.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
              {activeFilters.map(filter => (
                <div key={filter} style={{
                  display: 'flex', alignItems: 'center', gap: '0.25rem',
                  padding: '0.25rem 0.5rem', background: 'var(--accent-primary)',
                  color: 'white', borderRadius: '16px', fontSize: '0.8rem', fontWeight: 500
                }}>
                  {FILTER_CATEGORIES[filter]?.icon && React.cloneElement(FILTER_CATEGORIES[filter].icon, { color: 'white' })}
                  <span>{filter}</span>
                  <button
                    onClick={() => setActiveFilters(prev => prev.filter(f => f !== filter))}
                    style={{ background: 'transparent', border: 'none', color: 'white', display: 'flex', alignItems: 'center', cursor: 'pointer', padding: 0, marginLeft: '0.25rem' }}
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
              <button
                onClick={() => setActiveFilters([])}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: '0.85rem', cursor: 'pointer', marginLeft: '0.5rem' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
              >
                Clear all
              </button>
            </div>
          )}

          <FileGrid
            files={sortedFiles}
            category={activeCategory}
            currentPath={currentPath}
            setCurrentPath={setCurrentPath}
            refreshFiles={fetchFiles}
            viewMode={viewMode}
            loading={loading}
            selectedFiles={selectedFiles}
            setSelectedFiles={setSelectedFiles}
            setIsSidebarOpen={setIsSidebarOpen}
          />
          <BulkToolbar
            selectedFiles={selectedFiles}
            setSelectedFiles={setSelectedFiles}
            refreshFiles={fetchFiles}
          />
        </div>

        {/* Hidden File Input */}
        <input type="file" id="file-upload" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileUpload} multiple />

        {/* Mobile FAB */}
        <button className="fab-btn" onClick={() => setShowUploadModal(true)} title="Upload File">
          <Plus size={24} />
        </button>

        {showAnalytics && <Analytics onClose={() => setShowAnalytics(false)} />}
        {showAIChat && <AIChat onClose={() => setShowAIChat(false)} files={files} />}

        {creatingFolder && (
          <div className="upload-overlay glass" onClick={() => setCreatingFolder(false)}>
            <div className="auth-card" onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>
              <h3>Create New Folder</h3>
              <input
                type="text"
                placeholder="Folder Name"
                value={newFolderName}
                onChange={e => setNewFolderName(e.target.value)}
                style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-primary)' }}
                autoFocus
              />
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button onClick={() => setCreatingFolder(false)} style={{ flex: 1, padding: '0.75rem', background: 'transparent', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}>Cancel</button>
                <button onClick={handleCreateFolder} style={{ flex: 1, padding: '0.75rem', background: 'var(--accent-primary)', color: 'white', border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}>Create</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DriveLayout>
    <UploadProgress 
      uploads={uploadQueue} 
      onClose={() => setUploadQueue([])} 
      onPause={handlePauseUpload}
      onResume={handleResumeUpload}
      onCancel={handleCancelUpload}
      onRetry={handleResumeUpload}
    />
    <UploadModal 
      isOpen={showUploadModal} 
      onClose={() => setShowUploadModal(false)} 
      onUpload={processFiles} 
    />
    
      </>

  );
};

export default Dashboard;

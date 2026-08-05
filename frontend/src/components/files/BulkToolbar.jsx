import React from 'react';
import { Trash2, FolderInput, Download, Star, Tag, X } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const BulkToolbar = ({ selectedFiles, setSelectedFiles, refreshFiles }) => {
  if (!selectedFiles || selectedFiles.length === 0) return null;

  const handleBulkDelete = async () => {
    if (window.confirm(`Are you sure you want to delete ${selectedFiles.length} items?`)) {
      try {
        const messageIds = selectedFiles.map(f => f.messageId);
        await fetch(`${API_URL}/api/files/delete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messageIds })
        });
        setSelectedFiles([]);
        if (refreshFiles) refreshFiles();
      } catch (error) {
        console.error("Bulk delete failed", error);
      }
    }
  };

  const handleBulkFavorite = async () => {
    try {
      await Promise.all(selectedFiles.map(f => 
        fetch(`${API_URL}/api/files/update/${f.messageId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ favorite: true })
        })
      ));
      setSelectedFiles([]);
      if (refreshFiles) refreshFiles();
    } catch (error) {
      console.error("Bulk favorite failed", error);
    }
  };

  const handleBulkDownload = () => {
    selectedFiles.forEach(f => {
      if (!f.isFolder) {
        window.open(`${API_URL}/api/files/download/${f.messageId}`, '_blank');
      }
    });
    setSelectedFiles([]);
  };

  const handleBulkMove = async () => {
    const targetPath = window.prompt("Enter destination folder path (e.g., /Documents/Work):", "/");
    if (targetPath === null) return;
    
    try {
      await Promise.all(selectedFiles.map(f => 
        fetch(`${API_URL}/api/files/update/${f.messageId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ folder: targetPath })
        })
      ));
      setSelectedFiles([]);
      if (refreshFiles) refreshFiles();
    } catch (error) {
      console.error("Bulk move failed", error);
    }
  };

  const handleBulkTag = async () => {
    const tagsInput = window.prompt("Enter tags separated by commas (e.g., work, important):");
    if (!tagsInput) return;
    const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);
    
    try {
      await Promise.all(selectedFiles.map(f => {
        const existingTags = f.metadata?.tags || [];
        const newTags = [...new Set([...existingTags, ...tags])];
        return fetch(`${API_URL}/api/files/update/${f.messageId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tags: newTags })
        });
      }));
      setSelectedFiles([]);
      if (refreshFiles) refreshFiles();
    } catch (error) {
      console.error("Bulk tag failed", error);
    }
  };

  return (
    <div className="bulk-toolbar animate-fade-up" style={{
      position: 'fixed', bottom: '2rem', left: '50%', transform: 'translateX(-50%)',
      background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
      borderRadius: '32px', padding: '0.5rem', display: 'flex', alignItems: 'center',
      gap: '0.5rem', boxShadow: '0 8px 32px rgba(0,0,0,0.2)', zIndex: 9999,
      maxWidth: 'calc(100vw - 2rem)', overflow: 'hidden'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)', fontWeight: 500, paddingRight: '0.5rem', borderRight: '1px solid var(--border-color)', flexShrink: 0, paddingLeft: '0.5rem' }}>
        <span style={{ background: 'var(--accent-primary)', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '0.8rem' }}>
          {selectedFiles.length}
        </span>
        <span className="hide-on-mobile">Selected</span>
      </div>

      <div className="hide-scrollbar" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', overflowX: 'auto', flex: 1 }}>
        <button onClick={handleBulkDelete} className="action-btn" title="Delete" style={{ padding: '0.5rem', color: '#ef4444', flexShrink: 0 }}>
          <Trash2 size={18} />
        </button>
        <button onClick={handleBulkMove} className="action-btn" title="Move" style={{ padding: '0.5rem', flexShrink: 0 }}>
          <FolderInput size={18} />
        </button>
        <button onClick={handleBulkDownload} className="action-btn" title="Download" style={{ padding: '0.5rem', flexShrink: 0 }}>
          <Download size={18} />
        </button>
        <button onClick={handleBulkFavorite} className="action-btn" title="Favorite" style={{ padding: '0.5rem', flexShrink: 0 }}>
          <Star size={18} />
        </button>
        <button onClick={handleBulkTag} className="action-btn" title="Tag" style={{ padding: '0.5rem', flexShrink: 0 }}>
          <Tag size={18} />
        </button>
      </div>

      <button onClick={() => setSelectedFiles([])} style={{ background: 'var(--bg-tertiary)', border: 'none', borderRadius: '50%', width: '28px', height: '28px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: '0.25rem', flexShrink: 0 }}>
        <X size={16} color="var(--text-secondary)" />
      </button>
    </div>
  );
};

export default BulkToolbar;

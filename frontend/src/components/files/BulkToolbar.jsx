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
      borderRadius: '32px', padding: '0.5rem 1rem', display: 'flex', alignItems: 'center',
      gap: '1rem', boxShadow: '0 8px 32px rgba(0,0,0,0.2)', zIndex: 9999
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)', fontWeight: 500, paddingRight: '1rem', borderRight: '1px solid var(--border-color)' }}>
        <span style={{ background: 'var(--accent-primary)', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '0.8rem' }}>
          {selectedFiles.length}
        </span>
        <span>Selected</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <button onClick={handleBulkDelete} className="action-btn" title="Delete" style={{ padding: '0.5rem', color: '#ef4444' }}>
          <Trash2 size={18} />
        </button>
        <button onClick={handleBulkMove} className="action-btn" title="Move" style={{ padding: '0.5rem' }}>
          <FolderInput size={18} />
        </button>
        <button onClick={handleBulkDownload} className="action-btn" title="Download" style={{ padding: '0.5rem' }}>
          <Download size={18} />
        </button>
        <button onClick={handleBulkFavorite} className="action-btn" title="Favorite" style={{ padding: '0.5rem' }}>
          <Star size={18} />
        </button>
        <button onClick={handleBulkTag} className="action-btn" title="Tag" style={{ padding: '0.5rem' }}>
          <Tag size={18} />
        </button>
      </div>

      <button onClick={() => setSelectedFiles([])} style={{ background: 'var(--bg-tertiary)', border: 'none', borderRadius: '50%', padding: '0.25rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: '0.5rem' }}>
        <X size={16} color="var(--text-secondary)" />
      </button>
    </div>
  );
};

export default BulkToolbar;

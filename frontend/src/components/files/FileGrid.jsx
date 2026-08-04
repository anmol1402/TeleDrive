import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { File, Image as ImageIcon, FileText, Music, Video, Folder, Download, Eye, Star, Trash2, RotateCcw, XCircle, Share2, Edit2, MoreVertical } from 'lucide-react';
import ContextMenu from './ContextMenu';
import FilePreviewModal from './FilePreviewModal';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const FileGrid = ({ files, category, currentPath, setCurrentPath, refreshFiles, viewMode = 'grid', loading = false, selectedFiles = [], setSelectedFiles, setIsSidebarOpen, onOpenProperties }) => {
  const [viewingFile, setViewingFile] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [renamingFile, setRenamingFile] = useState(null);
  const [newName, setNewName] = useState('');

  const [visibleCount, setVisibleCount] = useState(30);
  const observerTarget = useRef(null);
  const containerRef = useRef(null);
  const [lastSelectedIndex, setLastSelectedIndex] = useState(null);
  const [selectionBox, setSelectionBox] = useState(null);
  const isDragging = useRef(false);
  const startCoords = useRef({ x: 0, y: 0 });
  const clickTimeoutRef = useRef(null);
  const touchTimerRef = useRef(null);
  const longPressOccurredRef = useRef(false);
  const initialSelectionRef = useRef([]);
  const filteredFiles = useMemo(() => files.slice(0, visibleCount), [files, visibleCount]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        e.preventDefault();
        if (setSelectedFiles) {
          setSelectedFiles([...files.slice(0, visibleCount)]);
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [files, visibleCount, setSelectedFiles]);

  useEffect(() => {
    setVisibleCount(30);
  }, [files, viewMode]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) {
          setVisibleCount(prev => prev + 30);
        }
      },
      { threshold: 0.1 }
    );
    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }
    return () => observer.disconnect();
  }, []);

  const handleMouseDown = (e) => {
    if (e.target.closest('.file-card') || e.target.closest('.file-list-row') || e.target.closest('.file-actions')) return;
    if (e.button !== 0) return; // Only left click

    isDragging.current = true;
    startCoords.current = { x: e.clientX, y: e.clientY };
    setSelectionBox({ left: e.clientX, top: e.clientY, width: 0, height: 0 });

    if (!e.ctrlKey && !e.metaKey && !e.shiftKey) {
      if (setSelectedFiles) setSelectedFiles([]);
      initialSelectionRef.current = [];
    } else {
      initialSelectionRef.current = selectedFiles || [];
    }
  };

  const handleMouseMove = useCallback((e) => {
    if (!isDragging.current) return;

    const currentX = e.clientX;
    const currentY = e.clientY;

    const left = Math.min(startCoords.current.x, currentX);
    const top = Math.min(startCoords.current.y, currentY);
    const width = Math.abs(currentX - startCoords.current.x);
    const height = Math.abs(currentY - startCoords.current.y);

    setSelectionBox({ left, top, width, height });

    if (containerRef.current && setSelectedFiles) {
      const boxRect = { left, top, right: left + width, bottom: top + height };
      const elements = containerRef.current.querySelectorAll('.file-card, .file-list-row');
      const newSelection = [];

      elements.forEach(el => {
        const elRect = el.getBoundingClientRect();
        const intersect = !(
          elRect.right < boxRect.left ||
          elRect.left > boxRect.right ||
          elRect.bottom < boxRect.top ||
          elRect.top > boxRect.bottom
        );

        if (intersect) {
          const id = el.getAttribute('data-id');
          const file = filteredFiles.find(f => String(f.messageId) === id);
          if (file) newSelection.push(file);
        }
      });

      if (e.ctrlKey || e.metaKey || e.shiftKey) {
        const merged = [...initialSelectionRef.current];
        newSelection.forEach(item => {
           if (!merged.some(f => f.messageId === item.messageId)) {
             merged.push(item);
           }
        });
        setSelectedFiles(merged);
      } else {
        setSelectedFiles(newSelection);
      }
    }
  }, [filteredFiles, setSelectedFiles]);

  const handleMouseUp = () => {
    isDragging.current = false;
    setSelectionBox(null);
  };

  useEffect(() => {
    if (selectionBox) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [selectionBox, filteredFiles, handleMouseMove]);


  const getBaseIcon = (file) => {
    if (file.isFolder) return <Folder size={24} color="var(--text-secondary)" />;
    const filename = file.filename;
    if (!filename) return <File size={24} color="var(--text-secondary)" />;
    if (filename.match(/\.(jpg|jpeg|png|gif|svg)$/i)) return <ImageIcon size={24} color="#ea4335" />;
    if (filename.match(/\.(pdf|doc|docx|txt)$/i)) return <FileText size={24} color="#4285f4" />;
    if (filename.match(/\.(mp4|avi|mov|mkv)$/i)) return <Video size={24} color="#ea4335" />;
    if (filename.match(/\.(mp3|wav|ogg)$/i)) return <Music size={24} color="#fbbc04" />;
    return <File size={24} color="var(--text-secondary)" />;
  };

  const getSmallFileIcon = (filename) => {
    if (!filename) return <File size={16} color="var(--text-secondary)" />;
    if (filename.match(/\.(jpg|jpeg|png|gif|svg)$/i)) return <ImageIcon size={16} color="#ea4335" />;
    if (filename.match(/\.(pdf|doc|docx|txt)$/i)) return <FileText size={16} color="#4285f4" />;
    if (filename.match(/\.(mp4|avi|mov|mkv)$/i)) return <Video size={16} color="#ea4335" />;
    if (filename.match(/\.(mp3|wav|ogg)$/i)) return <Music size={16} color="#fbbc04" />;
    return <File size={16} color="var(--text-secondary)" />;
  };

  const formatSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
  };

  const handleDownload = (e, file) => {
    e.stopPropagation();
    if (file.isFolder) return;
    window.location.href = `${API_URL}/api/files/download/${file.messageId}`;
  };

  const handleCardClick = (file) => {
    if (file.isFolder) {
      let parent = file.folder;
      if (!parent) parent = '/';
      const targetPath = parent === '/' ? `/${file.filename}` : `${parent}/${file.filename}`;
      setCurrentPath(targetPath);
    } else {
      setViewingFile(file);
    }
  };

  const handleContextMenu = (e, file) => {
    e.preventDefault();
    e.stopPropagation();
    if (!selectedFiles.some(f => f.messageId === file.messageId)) {
      if (setSelectedFiles) setSelectedFiles([file]);
    }
    setContextMenu({ x: e.clientX, y: e.clientY, file });
  };

  const handleRename = (file) => {
    if (newName.trim() && newName !== file.filename) {
      updateMetadata({ stopPropagation: () => { } }, file, { filename: newName.trim() });
    }
    setRenamingFile(null);
  };

  const menuActions = {
    onOpen: (file) => handleCardClick(file),
    onPreview: (file) => setViewingFile(file),
    onRename: (file) => {
      setRenamingFile(file.messageId);
      setNewName(file.filename);
    },
    onMove: (file) => alert(`Move action triggered for ${file.filename}. UI stub only.`),
    onCopy: (file) => alert(`Copy action triggered for ${file.filename}. UI stub only.`),
    onDuplicate: (file) => alert(`Duplicate action triggered for ${file.filename}. UI stub only.`),
    onDownload: (file) => handleDownload({ stopPropagation: () => { } }, file),
    onFavorite: (file) => updateMetadata({ stopPropagation: () => { } }, file, { favorite: !file.favorite }),
    onDelete: (file) => category === 'Trash' ? permanentDelete({ stopPropagation: () => { } }, file) : updateMetadata({ stopPropagation: () => { } }, file, { trashed: true, trashedAt: new Date().toISOString() }),
    onProperties: (file) => {
      if (onOpenProperties) {
        onOpenProperties(file);
      } else if (setSelectedFiles) {
        setSelectedFiles([file]);
      }
    }
  };

  const updateMetadata = async (e, file, updates) => {
    e.stopPropagation();
    try {
      await fetch(`${API_URL}/api/files/update/${file.messageId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      refreshFiles();
    } catch (error) {
      console.error("Update failed", error);
    }
  };

  const permanentDelete = async (e, file) => {
    e.stopPropagation();
    if (window.confirm("Permanently delete this file?")) {
      try {
        await fetch(`${API_URL}/api/files/delete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messageIds: [file.messageId] })
        });
        refreshFiles();
      } catch (error) {
        console.error("Delete failed", error);
      }
    }
  };

  const handleDragStart = (e, file) => {
    if (!selectedFiles.some(f => f.messageId === file.messageId)) {
      if (setSelectedFiles) setSelectedFiles([file]);
      e.dataTransfer.setData('text/plain', JSON.stringify([file.messageId]));
    } else {
      e.dataTransfer.setData('text/plain', JSON.stringify(selectedFiles.map(f => f.messageId)));
    }
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, file) => {
    if (!file.isFolder) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    e.currentTarget.style.border = '2px dashed var(--accent-primary)';
    e.currentTarget.style.background = 'var(--bg-tertiary)';
  };

  const handleDragLeave = (e, file) => {
    if (!file.isFolder) return;
    e.currentTarget.style.border = '';
    e.currentTarget.style.background = '';
  };

  const handleDrop = (e, targetFolder) => {
    e.preventDefault();
    e.stopPropagation();
    if (!targetFolder.isFolder) return;
    e.currentTarget.style.border = '';
    e.currentTarget.style.background = '';

    try {
      const data = e.dataTransfer.getData('text/plain');
      if (!data) return;
      const messageIds = JSON.parse(data);
      
      if (messageIds.includes(targetFolder.messageId)) {
        alert("Cannot move a folder into itself!");
        return;
      }

      const targetPath = currentPath === '/' ? `/${targetFolder.filename}` : `${currentPath}/${targetFolder.filename}`;
      
      messageIds.forEach(id => {
         fetch(`${API_URL}/api/files/update/${id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ folder: targetPath })
         }).then(() => refreshFiles());
      });
      if (setSelectedFiles) setSelectedFiles([]);
    } catch (err) {
      console.error(err);
    }
  };

  const handleShare = async (e, file) => {
    if (e && e.stopPropagation) e.stopPropagation();
    const downloadUrl = `${API_URL}/api/files/download/${file.messageId}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: file.filename,
          text: `Check out this file: ${file.filename}`,
          url: downloadUrl
        });
      } catch (err) {
        console.log('Error sharing or share cancelled:', err);
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(downloadUrl);
      alert('Link copied to clipboard! You can paste it in WhatsApp or Mail.');
    }
  };


  const isImageOrVideo = (filename) => {
    return filename && filename.match(/\.(jpg|jpeg|png|gif|svg|mp4|avi|mov|mkv)$/i);
  };

  if (loading) {
    if (viewMode === 'list') {
      return (
        <div className="file-list-view">
          <div className="list-header">
            <span>Name</span>
            <span>Last Modified</span>
            <span>File Size</span>
          </div>
          <div className="skeleton-list">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="skeleton-row">
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div className="skeleton-icon" />
                  <div className="skeleton-text" />
                </div>
                <div className="skeleton-text" style={{ width: '40%' }} />
                <div className="skeleton-text" style={{ width: '30%' }} />
              </div>
            ))}
          </div>
        </div>
      );
    }
    return (
      <div className="file-grid">
        <div className="skeleton-grid">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => (
            <div key={i} className="skeleton-card">
              <div className="skeleton-icon" />
              <div className="skeleton-text" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div style={{ textAlign: 'center', color: 'var(--text-secondary)', marginTop: '4rem' }}>
        <Folder size={64} style={{ opacity: 0.2, marginBottom: '1rem' }} />
        <p>No files found here</p>
      </div>
    );
  }

  const handleTouchStart = (e, file, index) => {
    const isMobile = window.innerWidth <= 768;
    if (!isMobile) return;
    longPressOccurredRef.current = false;
    touchTimerRef.current = setTimeout(() => {
      touchTimerRef.current = null;
      longPressOccurredRef.current = true;
      handleSelect(e, file, index, true);
      if (navigator.vibrate) navigator.vibrate(50);
    }, 500);
  };

  const handleTouchEnd = () => {
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
    }
  };

  const handleTouchMove = () => {
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
    }
  };

  const handleSelect = (e, file, index, isLongPress = false) => {
    e.stopPropagation();
    e.preventDefault();

    const isMobile = window.innerWidth <= 768;

    if (isMobile && !isLongPress) {
      if (longPressOccurredRef.current) {
        longPressOccurredRef.current = false;
        return;
      }
      
      // If we are already selecting files, single tap should toggle selection
      if (selectedFiles.length > 0) {
        const isSelected = selectedFiles.some(f => f.messageId === file.messageId);
        if (isSelected) {
          setSelectedFiles(selectedFiles.filter(f => f.messageId !== file.messageId));
        } else {
          setSelectedFiles([...selectedFiles, file]);
        }
        return;
      }

      handleCardClick(file);
      return;
    }

    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
    }

    const isShift = e.shiftKey;
    // On mobile, a long press acts as if the Ctrl key is held (toggles selection without clearing others)
    const isCtrl = e.ctrlKey || e.metaKey || (isMobile && isLongPress);

    clickTimeoutRef.current = setTimeout(() => {
      if (!setSelectedFiles) return;

      const isSelected = selectedFiles.some(f => f.messageId === file.messageId);

      if (isShift && lastSelectedIndex !== null) {
        const start = Math.min(lastSelectedIndex, index);
        const end = Math.max(lastSelectedIndex, index);
        const newSelection = [...selectedFiles];
        const itemsToSelect = filteredFiles.slice(start, end + 1);

        itemsToSelect.forEach(item => {
          if (!newSelection.some(f => f.messageId === item.messageId)) {
            newSelection.push(item);
          }
        });
        setSelectedFiles(newSelection);
      } else if (isCtrl) {
        if (isSelected) {
          setSelectedFiles(selectedFiles.filter(f => f.messageId !== file.messageId));
        } else {
          setSelectedFiles([...selectedFiles, file]);
        }
        setLastSelectedIndex(index);
      } else {
        setSelectedFiles([file]);
        setLastSelectedIndex(index);
      }
    }, 250); // Delay to check for double click
  };

  const handleDoubleClickWrapper = (e, file) => {
    e.stopPropagation();
    e.preventDefault();
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
    }
    handleCardClick(file);
  };

  const renderCard = (file, index) => {
    const isSelected = selectedFiles.some(f => f.messageId === file.messageId);
    const fileActions = (
      <div className="file-actions" style={{ opacity: 1 }}>
        <button className="action-btn" title="More actions" onClick={(e) => handleContextMenu(e, file)}>
          <MoreVertical size={16} />
        </button>
      </div>
    );

    if (viewMode === 'list') {
      return (
        <div
          className={`file-list-row animate-fade-in ${file.isFolder ? 'folder' : ''} ${isSelected ? 'selected' : ''}`}
          key={file.messageId}
          data-id={file.messageId}
          draggable
          onDragStart={(e) => handleDragStart(e, file)}
          onDragOver={(e) => handleDragOver(e, file)}
          onDragLeave={(e) => handleDragLeave(e, file)}
          onDrop={(e) => handleDrop(e, file)}
          onClick={(e) => handleSelect(e, file, index)}
          onDoubleClick={(e) => handleDoubleClickWrapper(e, file)}
          onContextMenu={(e) => handleContextMenu(e, file)}
          onTouchStart={(e) => handleTouchStart(e, file, index)}
          onTouchEnd={handleTouchEnd}
          onTouchMove={handleTouchMove}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', overflow: 'hidden', flex: 1 }}>
            {getBaseIcon(file)}
            {renamingFile === file.messageId ? (
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onBlur={() => handleRename(file)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleRename(file);
                  if (e.key === 'Escape') setRenamingFile(null);
                }}
                autoFocus
                onClick={e => e.stopPropagation()}
                style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--accent-primary)', borderRadius: '4px', padding: '2px 6px', fontSize: 'inherit', width: '100%', maxWidth: '200px' }}
              />
            ) : (
              <span className="file-name" title={file.filename}>{file.filename}</span>
            )}
          </div>
          <div className="hide-on-mobile" style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            {new Date(file.uploadedAt).toLocaleDateString()}
          </div>
          <div className="hide-on-mobile" style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            {formatSize(file.size)}
          </div>
          {fileActions}
        </div>
      );
    }

    return (
      <div
        className={`file-card animate-fade-in ${file.isFolder ? 'folder' : ''} ${isSelected ? 'selected' : ''}`}
        key={file.messageId}
        data-id={file.messageId}
        draggable
        onDragStart={(e) => handleDragStart(e, file)}
        onDragOver={(e) => handleDragOver(e, file)}
        onDragLeave={(e) => handleDragLeave(e, file)}
        onDrop={(e) => handleDrop(e, file)}
        onClick={(e) => handleSelect(e, file, index)}
        onDoubleClick={(e) => handleDoubleClickWrapper(e, file)}
        onContextMenu={(e) => handleContextMenu(e, file)}
        onTouchStart={(e) => handleTouchStart(e, file, index)}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchMove}
      >
        {fileActions}
        <div className="file-info" style={{ padding: 0, display: 'flex', alignItems: 'center', flex: 1, gap: '1rem', overflow: 'hidden', width: '100%' }}>
          {getBaseIcon(file)}
          {renamingFile === file.messageId ? (
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onBlur={() => handleRename(file)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleRename(file);
                if (e.key === 'Escape') setRenamingFile(null);
              }}
              autoFocus
              onClick={e => e.stopPropagation()}
              style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--accent-primary)', borderRadius: '4px', padding: '2px 6px', fontSize: 'inherit', width: '100%', maxWidth: '120px' }}
            />
          ) : (
            <span className="file-name" title={file.filename}>{file.filename}</span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      style={{ position: 'relative', minHeight: '100%', paddingBottom: '4rem' }}
    >
      {selectionBox && (
        <div style={{
          position: 'fixed',
          left: selectionBox.left,
          top: selectionBox.top,
          width: selectionBox.width,
          height: selectionBox.height,
          background: 'rgba(59, 130, 246, 0.2)',
          border: '1px solid rgba(59, 130, 246, 0.5)',
          pointerEvents: 'none',
          zIndex: 9999
        }} />
      )}
      {viewMode === 'list' ? (
        <div className="file-list-view">
          <div className="list-header">
            <span>Name</span>
            <span className="hide-on-mobile">Last Modified</span>
            <span className="hide-on-mobile">File Size</span>
          </div>
          {filteredFiles.map(renderCard)}
        </div>
      ) : (
        <div className="file-grid">
          {filteredFiles.map(renderCard)}
        </div>
      )}

      {visibleCount < files.length && (
        <div ref={observerTarget} className="intersection-observer-target" />
      )}

      {viewingFile && (
        <FilePreviewModal
          file={viewingFile}
          files={filteredFiles}
          onClose={() => setViewingFile(null)}
        />
      )}

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          file={contextMenu.file}
          onClose={() => setContextMenu(null)}
          actions={menuActions}
        />
      )}
    </div>
  );
};

export default FileGrid;

import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, Folder } from 'lucide-react';

const FolderTreeItem = ({ folder, allFolders, currentPath, setCurrentPath, refreshFiles }) => {
  const folderPath = folder.folder === '/' ? `/${folder.filename}` : `${folder.folder}/${folder.filename}`;
  const children = allFolders.filter(f => (f.folder || '').toLowerCase() === folderPath.toLowerCase());
  const hasChildren = children.length > 0;
  
  // Auto-expand if the current path is inside this folder
  const isPathInside = currentPath.toLowerCase().startsWith(folderPath.toLowerCase() + '/') || currentPath.toLowerCase() === folderPath.toLowerCase();
  const [isExpanded, setIsExpanded] = useState(isPathInside);
  const isActive = currentPath.toLowerCase() === folderPath.toLowerCase();
  
  useEffect(() => {
    if (isPathInside) {
      setIsExpanded(true);
    }
  }, [currentPath, isPathInside]);

  const [isDragOver, setIsDragOver] = useState(false);

  const handleToggle = (e) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  const handleSelect = (e) => {
    e.stopPropagation();
    if (currentPath.toLowerCase() === folderPath.toLowerCase()) {
      if (hasChildren) {
        setIsExpanded(!isExpanded);
      }
    } else {
      setCurrentPath(folderPath);
      if (!isExpanded && hasChildren) {
        setIsExpanded(true);
      }
    }
  };

  const dragCounter = React.useRef(0);

  const onDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current += 1;
    setIsDragOver(true);
  };

  const onDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const onDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current <= 0) {
      setIsDragOver(false);
      dragCounter.current = 0;
    }
  };

  const onDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    dragCounter.current = 0;

    try {
      const data = e.dataTransfer.getData('text/plain');
      if (!data) {
          setCurrentPath(folderPath);
          return;
      }
      
      const messageIds = JSON.parse(data);
      if (!messageIds || messageIds.length === 0) return;

      if (messageIds.includes(folder.messageId)) {
        alert("Cannot move a folder into itself!");
        return;
      }

      const movedFolders = allFolders.filter(f => messageIds.includes(f.messageId));
      for (const item of movedFolders) {
          const itemPath = item.folder === '/' ? `/${item.filename}` : `${item.folder}/${item.filename}`;
          if (folderPath.toLowerCase() === itemPath.toLowerCase() || folderPath.toLowerCase().startsWith(itemPath.toLowerCase() + '/')) {
             alert(`Cannot move a folder into itself or its descendant (${item.filename}).`);
             return;
          }
      }

      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      messageIds.forEach(id => {
         fetch(`${API_URL}/api/files/update/${id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ folder: folderPath })
         }).then(() => {
             if (refreshFiles) refreshFiles();
         });
      });
      
      setCurrentPath(folderPath);
    } catch (err) {
      console.error(err);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleSelect(e);
    } else if (e.key === 'ArrowRight') {
      if (hasChildren && !isExpanded) {
        setIsExpanded(true);
      }
    } else if (e.key === 'ArrowLeft') {
      if (isExpanded) {
        setIsExpanded(false);
      }
    }
  };

  const handleContextMenu = (e) => {
    e.preventDefault();
    e.stopPropagation();
    // In a real implementation, you could dispatch a custom event to open the main FileGrid context menu,
    // or set a local context menu state here. For now, we reuse the selection.
    handleSelect(e);
  };

  return (
    <div style={{ marginLeft: '0.25rem' }}>
      <div 
        className={`folder-tree-item ${isActive ? 'active' : ''} ${isDragOver ? 'drag-over' : ''}`}
        onClick={handleSelect}
        onDragEnter={onDragEnter}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onContextMenu={handleContextMenu}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        style={{
          display: 'flex', alignItems: 'center', padding: '0.35rem 0.5rem', 
          cursor: 'pointer', borderRadius: '4px', gap: '0.25rem',
          background: isDragOver ? 'rgba(59, 130, 246, 0.1)' : isActive ? 'var(--bg-tertiary)' : 'transparent',
          color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
          outline: 'none',
          transition: 'all 0.2s ease',
          userSelect: 'none'
        }}
      >
        <div onClick={handleToggle} style={{ display: 'flex', alignItems: 'center', width: '20px', justifyContent: 'center' }} className="folder-tree-chevron">
          {hasChildren ? (
            isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />
          ) : (
            <span style={{ width: '16px' }} />
          )}
        </div>
        <Folder size={18} fill={isActive ? "var(--text-primary)" : "none"} color={isActive ? "var(--text-primary)" : "currentColor"} />
        <span style={{ fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: isActive ? '500' : 'normal' }}>
          {folder.filename}
        </span>
      </div>
      <div className={`folder-tree-children-wrapper ${isExpanded && hasChildren ? 'expanded' : ''}`}>
        <div className="folder-tree-children-inner" style={{ marginLeft: '12px', paddingLeft: '4px' }}>
          {hasChildren && children.map(child => (
            <FolderTreeItem 
              key={child.messageId}
              folder={child}
              allFolders={allFolders}
              currentPath={currentPath}
              setCurrentPath={setCurrentPath}
              refreshFiles={refreshFiles}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default FolderTreeItem;

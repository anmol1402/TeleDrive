import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, Folder } from 'lucide-react';

const FolderTreeItem = ({ folder, allFolders, currentPath, setCurrentPath }) => {
  const folderPath = folder.folder === '/' ? `/${folder.filename}` : `${folder.folder}/${folder.filename}`;
  const children = allFolders.filter(f => f.folder === folderPath);
  const hasChildren = children.length > 0;
  
  // Auto-expand if the current path is inside this folder
  const isPathInside = currentPath.startsWith(folderPath + '/') || currentPath === folderPath;
  const [isExpanded, setIsExpanded] = useState(isPathInside);
  const isActive = currentPath === folderPath;
  
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
    if (currentPath === folderPath) {
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

  const onDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const onDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const onDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    // Setting current path will let Dashboard handle the drag-and-drop into this folder natively.
    setCurrentPath(folderPath);
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
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default FolderTreeItem;

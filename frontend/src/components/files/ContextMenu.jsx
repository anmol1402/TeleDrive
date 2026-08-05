import React, { useEffect, useRef, useState } from 'react';
import { ExternalLink, Eye, Edit2, FolderInput, Copy, CopyPlus, Download, Star, Trash2, Info } from 'lucide-react';

const MenuItem = ({ icon: Icon, label, onClick, onClose, danger, separator }) => (
  <>
    {separator && <div style={{ height: '1px', background: 'var(--border-color)', margin: '0.25rem 0' }} />}
    <div 
      onClick={(e) => { e.stopPropagation(); onClick(); onClose(); }}
      className="context-menu-item"
      style={{
        padding: '0.5rem 1rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        cursor: 'pointer',
        fontSize: '0.9rem',
        color: danger ? '#ef4444' : 'inherit',
        transition: 'background 0.2s'
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-tertiary)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <Icon size={18} />
      <span>{label}</span>
    </div>
  </>
);

const ContextMenu = ({ x, y, file, onClose, actions }) => {
  const menuRef = useRef(null);
  const [adjustedPos, setAdjustedPos] = useState({ top: y, left: x });

  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      let newLeft = x;
      let newTop = y;
      
      if (x + rect.width > window.innerWidth) {
        newLeft = window.innerWidth - rect.width - 10;
      }
      if (y + rect.height > window.innerHeight) {
        newTop = window.innerHeight - rect.height - 10;
      }
      setAdjustedPos({ top: newTop, left: newLeft });
    }
  }, [x, y]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };

    setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
      document.addEventListener('contextmenu', handleClickOutside);
      document.addEventListener('keydown', handleEsc);
    }, 10);

    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('contextmenu', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [onClose]);

  const style = {
    position: 'fixed',
    top: adjustedPos.top,
    left: adjustedPos.left,
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
    zIndex: 10000,
    minWidth: '220px',
    padding: '0.5rem 0',
    display: 'flex',
    flexDirection: 'column',
    color: 'var(--text-primary)'
  };



  return (
    <div 
      ref={menuRef} 
      style={style} 
      className="animate-fade-in" 
      onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
    >
      <MenuItem icon={ExternalLink} label="Open" onClick={() => actions.onOpen(file)} onClose={onClose} />
      {!file.isFolder && <MenuItem icon={Eye} label="Preview" onClick={() => actions.onPreview(file)} onClose={onClose} />}
      
      <MenuItem icon={Edit2} label="Rename" onClick={() => actions.onRename(file)} onClose={onClose} separator />
      <MenuItem icon={FolderInput} label="Move to..." onClick={() => actions.onMove(file)} onClose={onClose} />
      <MenuItem icon={Copy} label="Copy to..." onClick={() => actions.onCopy(file)} onClose={onClose} />
      <MenuItem icon={CopyPlus} label="Duplicate" onClick={() => actions.onDuplicate(file)} onClose={onClose} />
      
      {!file.isFolder && <MenuItem icon={Download} label="Download" onClick={() => actions.onDownload(file)} onClose={onClose} separator />}
      
      <MenuItem icon={Star} label={file.favorite ? "Remove from Favorites" : "Add to Favorites"} onClick={() => actions.onFavorite(file)} onClose={onClose} separator={file.isFolder} />
      
      <MenuItem icon={Trash2} label="Delete" onClick={() => actions.onDelete(file)} onClose={onClose} danger separator />
      
      <MenuItem icon={Info} label="Properties" onClick={() => actions.onProperties(file)} onClose={onClose} />
    </div>
  );
};

export default ContextMenu;

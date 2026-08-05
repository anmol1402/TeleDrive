import React, { useState } from 'react';
import { X, Folder } from 'lucide-react';
import FolderTree from './FolderTree';

const FolderSelectionModal = ({ files, action, file, onClose, onConfirm }) => {
  const [selectedPath, setSelectedPath] = useState('/');

  const title = action === 'move' ? `Move "${file?.filename}" to...` : `Copy "${file?.filename}" to...`;

  return (
    <div className="modal-overlay" onClick={onClose} style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 11000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(4px)'
    }}>
      <div className="modal-content animate-fade-in" onClick={(e) => e.stopPropagation()} style={{
        background: 'var(--bg-secondary)',
        borderRadius: '12px',
        width: '90%',
        maxWidth: '400px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{
          padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-color)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>
        
        <div style={{ padding: '1rem', flex: 1, maxHeight: '350px', overflowY: 'auto' }}>
          <div 
            onClick={() => setSelectedPath('/')}
            style={{
              padding: '0.5rem 0.75rem',
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              cursor: 'pointer', borderRadius: '6px',
              background: selectedPath === '/' ? 'var(--bg-tertiary)' : 'transparent',
              color: 'var(--text-primary)',
              fontWeight: selectedPath === '/' ? '600' : 'normal'
            }}
          >
            <Folder size={18} fill={selectedPath === '/' ? "currentColor" : "none"} />
            <span>Root (/)</span>
          </div>
          
          <div style={{ marginLeft: '-0.5rem', marginTop: '0.5rem' }}>
            <FolderTree 
              files={files}
              currentPath={selectedPath}
              setCurrentPath={setSelectedPath}
              refreshFiles={() => {}} 
              category={undefined} 
            />
          </div>
        </div>

        <div style={{
          padding: '1rem 1.25rem', borderTop: '1px solid var(--border-color)',
          display: 'flex', justifyContent: 'flex-end', gap: '0.75rem'
        }}>
          <button onClick={onClose} style={{
            padding: '0.5rem 1rem', border: 'none', borderRadius: '6px',
            background: 'var(--bg-tertiary)', color: 'var(--text-primary)', cursor: 'pointer',
            fontWeight: '500'
          }}>
            Cancel
          </button>
          <button 
            onClick={() => onConfirm(selectedPath)} 
            style={{
              padding: '0.5rem 1.25rem', border: 'none', borderRadius: '6px',
              background: 'var(--primary-color)', color: 'white', cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            {action === 'move' ? 'Move Here' : 'Copy Here'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FolderSelectionModal;

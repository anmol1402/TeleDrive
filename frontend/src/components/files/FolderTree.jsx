import React from 'react';
import FolderTreeItem from './FolderTreeItem';

const FolderTree = ({ files = [], currentPath, setCurrentPath, refreshFiles, category }) => {
  // Get root folders (folders whose parent is '/')
  const folders = (files || []).filter(f => {
    if (!f || !f.isFolder || f.trashed) return false;
    if (category && category !== 'My Drive') {
      return f.category === category;
    }
    return true;
  });
  const rootFolders = folders.filter(f => f && (f.folder || '').toLowerCase() === '/');

  return (
    <div className="folder-tree" style={{ marginTop: '0.25rem' }}>
      {rootFolders.length > 0 ? rootFolders.map(folder => (
        <FolderTreeItem 
          key={folder.messageId}
          folder={folder}
          allFolders={folders}
          currentPath={currentPath}
          setCurrentPath={setCurrentPath}
          refreshFiles={refreshFiles}
        />
      )) : (
        <div style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', color: 'var(--text-secondary)', marginLeft: '1rem' }}>
          No folders
        </div>
      )}
    </div>
  );
};

export default FolderTree;

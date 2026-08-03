import React, { useState } from 'react';
import { Cloud, Folder, FileImage, FileText, Music, Video, Plus, Star, Trash2, Menu, ChevronDown, ChevronRight } from 'lucide-react';
import FolderTree from '../files/FolderTree';

const formatBytes = (bytes, decimals = 1) => {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

const Sidebar = ({ activeCategory, setActiveCategory, isSidebarOpen, files = [], currentPath, setCurrentPath, onNewUploadClick, totalStorage = 0 }) => {
  const [expandedCategories, setExpandedCategories] = useState({ 'My Drive': true });

  const hasFolders = (catName) => {
    if (catName === 'My Drive') return files.some(f => f.isFolder && !f.trashed);
    return files.some(f => f.isFolder && !f.trashed && f.category === catName);
  };

  const categories = [
    { name: 'My Drive', icon: <Cloud size={20} /> },
    { name: 'Documents', icon: <FileText size={20} /> },
    { name: 'Images', icon: <FileImage size={20} /> },
    { name: 'Media', icon: <Video size={20} /> },
    { name: 'Audio', icon: <Music size={20} /> },
    { name: 'Favorites', icon: <Star size={20} /> },
    { name: 'Trash', icon: <Trash2 size={20} /> },
  ];

  return (
    <div className={`sidebar ${isSidebarOpen ? 'mobile-open' : 'closed'}`}>
      <button className="upload-btn" onClick={onNewUploadClick}>
        <div className="nav-icon-wrapper">
          <Plus size={24} color="var(--text-primary)" style={{ flexShrink: 0 }} />
        </div>
        <span className="nav-text">New Upload</span>
      </button>

      <div className="nav-menu">
        {categories.map((cat) => (
          <React.Fragment key={cat.name}>
            <div 
              className={`nav-item ${activeCategory === cat.name ? 'active' : ''}`}
              onClick={() => {
                if (activeCategory === cat.name) {
                  setExpandedCategories(prev => ({ ...prev, [cat.name]: !prev[cat.name] }));
                } else {
                  setActiveCategory(cat.name);
                  setExpandedCategories(prev => ({ ...prev, [cat.name]: true }));
                  if (setCurrentPath) setCurrentPath('/');
                }
              }}
            >
              <div className="nav-icon-wrapper">
                {cat.icon}
              </div>
              <span className="nav-text" style={{ flex: 1, paddingRight: 0 }}>{cat.name}</span>
              {hasFolders(cat.name) && (
                <div className="nav-text" style={{ paddingRight: '1rem', display: 'flex', alignItems: 'center' }}>
                  {expandedCategories[cat.name] && activeCategory === cat.name ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </div>
              )}
            </div>
            <div className={`folder-tree-wrapper ${activeCategory === cat.name && expandedCategories[cat.name] && hasFolders(cat.name) ? 'expanded' : ''}`}>
              <div className="folder-tree-inner">
                {hasFolders(cat.name) && (
                  <FolderTree files={files} currentPath={currentPath} setCurrentPath={setCurrentPath} category={cat.name} />
                )}
              </div>
            </div>
          </React.Fragment>
        ))}
      </div>

      <div className="storage-section" style={{ marginTop: '1.5rem', padding: '0.5rem 0', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div className="nav-item" style={{ padding: '0', background: 'transparent', cursor: 'default' }}>
          <div className="nav-icon-wrapper">
            <Cloud size={20} color="var(--text-primary)" />
          </div>
          <span className="nav-text" style={{ fontWeight: 'bold' }}>Storage</span>
        </div>
        <div className="nav-text" style={{ fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-primary)', marginLeft: '40px' }}>
          {formatBytes(totalStorage)} of unlimited used
        </div>
      </div>
    </div>
  );
};

export default Sidebar;

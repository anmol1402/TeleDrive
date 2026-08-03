import React from 'react';
import { X, Info, File, Folder, Image, Video, Music, FileText, HardDrive, Calendar, Tag, User, Star } from 'lucide-react';

const formatBytes = (bytes, decimals = 2) => {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

const getFileTypeDetails = (filename, isFolder) => {
  if (isFolder) return { type: 'Folder', icon: <Folder size={24} color="var(--accent-primary)" /> };
  
  const ext = filename.split('.').pop().toLowerCase();
  
  if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(ext)) {
    return { type: 'Image', icon: <Image size={24} color="#ef4444" /> };
  }
  if (['mp4', 'avi', 'mov', 'mkv', 'webm'].includes(ext)) {
    return { type: 'Video', icon: <Video size={24} color="#f59e0b" /> };
  }
  if (['mp3', 'wav', 'ogg', 'm4a'].includes(ext)) {
    return { type: 'Audio', icon: <Music size={24} color="#10b981" /> };
  }
  if (['pdf', 'doc', 'docx', 'txt', 'xls', 'xlsx', 'ppt', 'pptx', 'csv'].includes(ext)) {
    return { type: 'Document', icon: <FileText size={24} color="#3b82f6" /> };
  }
  
  return { type: 'Unknown File', icon: <File size={24} color="var(--text-secondary)" /> };
};

const MetadataSidebar = ({ files = [], isOpen, onClose, userProfile }) => {
  const [localFiles, setLocalFiles] = React.useState(files);

  // Keep old files around during the closing animation
  React.useEffect(() => {
    if (files && files.length > 0) {
      setLocalFiles(files);
    }
  }, [files]);

  const displayFiles = (files && files.length > 0) ? files : localFiles;

  if (displayFiles.length > 1) {
    const totalSize = displayFiles.reduce((acc, f) => acc + (f.size || 0), 0);
    const numFolders = displayFiles.filter(f => f.isFolder).length;
    const numFiles = displayFiles.filter(f => !f.isFolder).length;
    
    return (
      <div className="metadata-sidebar" style={{
        width: isOpen ? '320px' : '0px', 
        opacity: isOpen ? 1 : 0,
        background: 'var(--bg-secondary)', 
        borderLeft: isOpen ? '1px solid var(--border-color)' : 'none',
        display: 'flex', flexDirection: 'column', height: '100%', overflowX: 'hidden', overflowY: 'auto',
        transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        flexShrink: 0
      }}>
        <div style={{
          padding: '1rem', borderBottom: '1px solid var(--border-color)', display: 'flex',
          alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0,
          background: 'var(--bg-secondary)', zIndex: 10
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Info size={18} color="var(--text-secondary)" />
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 500, color: 'var(--text-primary)' }}>Multiple Items</h3>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
            <X size={20} />
          </button>
        </div>
        
        <div style={{ padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '12px', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
            <File size={32} color="var(--accent-primary)" />
          </div>
          <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', color: 'var(--text-primary)', textAlign: 'center' }}>
            {files.length} items selected
          </h4>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            {numFiles} files, {numFolders} folders
          </span>
        </div>

        <div style={{ padding: '1rem' }}>
          <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', margin: '0 0 1rem 0' }}>Properties</h4>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <HardDrive size={18} color="var(--text-secondary)" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Total Size</div>
                <div style={{ color: 'var(--text-primary)', fontSize: '0.9rem' }}>{formatBytes(totalSize)}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const file = displayFiles[0];
  if (!file) return (
    <div className="metadata-sidebar" style={{
      width: isOpen ? '320px' : '0px', 
      opacity: isOpen ? 1 : 0,
      background: 'var(--bg-secondary)', 
      borderLeft: isOpen ? '1px solid var(--border-color)' : 'none',
      display: 'flex', flexDirection: 'column', height: '100%', overflowX: 'hidden', overflowY: 'auto',
      transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      flexShrink: 0
    }} />
  );

  const fileType = getFileTypeDetails(file.filename, file.isFolder);

  return (
    <div className="metadata-sidebar" style={{
      width: isOpen ? '320px' : '0px', 
      opacity: isOpen ? 1 : 0,
      background: 'var(--bg-secondary)', 
      borderLeft: isOpen ? '1px solid var(--border-color)' : 'none',
      display: 'flex', flexDirection: 'column', height: '100%', overflowX: 'hidden', overflowY: 'auto',
      transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      flexShrink: 0
    }}>
      <div style={{
        padding: '1rem',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        background: 'var(--bg-secondary)',
        zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Info size={18} color="var(--text-secondary)" />
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 500, color: 'var(--text-primary)' }}>Details</h3>
        </div>
        <button 
          onClick={onClose} 
          className="action-btn"
          style={{ border: 'none', background: 'transparent' }}
        >
          <X size={18} color="var(--text-secondary)" />
        </button>
      </div>

      <div style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2rem' }}>
          <div style={{ 
            width: '80px', height: '80px', borderRadius: '16px', 
            background: 'var(--bg-tertiary)', display: 'flex', 
            alignItems: 'center', justifyContent: 'center',
            marginBottom: '1rem'
          }}>
            {React.cloneElement(fileType.icon, { size: 40 })}
          </div>
          <h4 style={{ margin: '0 0 0.5rem 0', textAlign: 'center', wordBreak: 'break-word', color: 'var(--text-primary)' }}>
            {file.filename}
          </h4>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            {fileType.type} • {formatBytes(file.size)}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div className="metadata-group">
            <h5 style={{ margin: '0 0 0.75rem 0', color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              System Properties
            </h5>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
              <HardDrive size={16} color="var(--text-secondary)" style={{ flexShrink: 0 }} />
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Storage Location</div>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>Telegram Servers</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
              <Folder size={16} color="var(--text-secondary)" style={{ flexShrink: 0 }} />
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Location Path</div>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', wordBreak: 'break-all' }}>
                  {file.folder}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <Tag size={16} color="var(--text-secondary)" style={{ flexShrink: 0 }} />
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Telegram File ID</div>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', wordBreak: 'break-all', fontFamily: 'monospace' }}>
                  {file.messageId}
                </div>
              </div>
            </div>
          </div>

          <div className="metadata-group">
            <h5 style={{ margin: '0 0 0.75rem 0', color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Activity
            </h5>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
              <Calendar size={16} color="var(--text-secondary)" style={{ flexShrink: 0 }} />
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Uploaded At</div>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                  {new Date(file.uploadedAt).toLocaleString()}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <Calendar size={16} color="var(--text-secondary)" style={{ flexShrink: 0 }} />
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Last Modified</div>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                  {file.metadata?.lastModified ? new Date(file.metadata.lastModified).toLocaleString() : new Date(file.uploadedAt).toLocaleString()}
                </div>
              </div>
            </div>
          </div>

            <div className="metadata-group">
              <h5 style={{ margin: '0 0 0.75rem 0', color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Permissions
              </h5>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
                <User size={16} color="var(--text-secondary)" style={{ flexShrink: 0 }} />
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Owner</div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                    {userProfile ? `${userProfile.firstName} ${userProfile.lastName || ''}` : 'You'}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <Star size={16} fill={file.favorite ? "var(--accent-primary)" : "none"} color={file.favorite ? "var(--accent-primary)" : "var(--text-secondary)"} style={{ flexShrink: 0 }} />
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Favorite</div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                    {file.favorite ? 'Yes' : 'No'}
                  </div>
                </div>
              </div>
            </div>

            <AIInsightsSection fileId={file.messageId} />

          </div>
        </div>
      </div>
    );
  };

  const AIInsightsSection = ({ fileId }) => {
    const [insights, setInsights] = React.useState(null);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        let mounted = true;
        if (!fileId) return;
        setLoading(true);
        fetch(`http://localhost:3001/api/files/${fileId}/insights`)
            .then(res => res.json())
            .then(data => {
                if (mounted) {
                    if (data.success && data.insights) {
                        setInsights(data.insights);
                    } else {
                        setInsights(null);
                    }
                    setLoading(false);
                }
            })
            .catch(err => {
                console.error("Failed to fetch insights", err);
                if (mounted) setLoading(false);
            });
        return () => { mounted = false; };
    }, [fileId]);

    if (loading) {
        return (
            <div className="metadata-group">
                <h5 style={{ margin: '0 0 0.75rem 0', color: 'var(--accent-primary)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Star size={14} color="var(--accent-primary)" /> AI Insights
                </h5>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Loading AI analysis...</div>
            </div>
        );
    }

    if (!insights) {
        return null; // No insights available yet (maybe still processing in background)
    }

    return (
        <div className="metadata-group" style={{ background: 'var(--accent-glow)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--accent-primary)' }}>
            <h5 style={{ margin: '0 0 0.75rem 0', color: 'var(--accent-primary)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Star size={14} color="var(--accent-primary)" fill="var(--accent-primary)" /> AI Insights
            </h5>
            
            {insights.Summary && (
                <div style={{ marginBottom: '1rem' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Summary</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', lineHeight: '1.5' }}>{insights.Summary}</div>
                </div>
            )}
            
            {insights.Title && (
                <div style={{ marginBottom: '1rem' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Detected Title</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 'bold' }}>{insights.Title}</div>
                </div>
            )}

            {insights.Keywords && insights.Keywords.length > 0 && (
                <div style={{ marginBottom: '1rem' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Keywords</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {insights.Keywords.map((kw, idx) => (
                            <span key={idx} style={{ background: 'var(--bg-secondary)', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', color: 'var(--accent-primary)', border: '1px solid var(--border-color)' }}>
                                {kw}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {insights.Objects && insights.Objects.length > 0 && (
                <div style={{ marginBottom: '1rem' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Detected Objects</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {insights.Objects.map((obj, idx) => (
                            <span key={idx} style={{ background: 'var(--bg-secondary)', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}>
                                {obj}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {insights.Caption && (
                <div style={{ marginBottom: '1rem' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Caption</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontStyle: 'italic' }}>"{insights.Caption}"</div>
                </div>
            )}

            {insights.OCR && (
                <div style={{ marginBottom: '1rem' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Detected Text (OCR)</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', background: 'var(--bg-secondary)', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', maxHeight: '100px', overflowY: 'auto' }}>
                        {insights.OCR}
                    </div>
                </div>
            )}

            {insights.Transcript && (
                <div style={{ marginBottom: '1rem' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Transcript</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', background: 'var(--bg-secondary)', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', maxHeight: '150px', overflowY: 'auto', lineHeight: '1.5' }}>
                        {insights.Transcript}
                    </div>
                </div>
            )}
        </div>
    );
  };

export default MetadataSidebar;

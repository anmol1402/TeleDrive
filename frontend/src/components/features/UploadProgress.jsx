import React, { useState } from 'react';
import { X, ChevronDown, ChevronUp, File, CheckCircle2, AlertCircle, PauseCircle, PlayCircle, XCircle, RefreshCw } from 'lucide-react';

const formatBytes = (bytes, decimals = 1) => {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

const UploadProgress = ({ uploads, onClose, onPause, onResume, onCancel, onRetry }) => {
  const [isMinimized, setIsMinimized] = useState(false);

  if (!uploads || uploads.length === 0) return null;

  const totalUploads = uploads.length;
  const completedUploads = uploads.filter(u => u.status === 'success').length;
  const failedUploads = uploads.filter(u => u.status === 'error').length;
  const inProgress = uploads.filter(u => u.status === 'uploading').length;

  let title = `Uploading ${inProgress} item${inProgress !== 1 ? 's' : ''}`;
  if (inProgress === 0) {
    if (failedUploads > 0) {
      title = `${completedUploads} uploaded, ${failedUploads} failed`;
    } else {
      title = `${completedUploads} upload${completedUploads !== 1 ? 's' : ''} complete`;
    }
  }

  return (
    <div className={`upload-progress-popup ${isMinimized ? 'minimized' : ''}`}>
      <div className="upload-progress-header" onClick={() => setIsMinimized(!isMinimized)}>
        <div className="upload-progress-title">{title}</div>
        <div className="upload-progress-actions">
          <button className="icon-btn-small" onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }}>
            {isMinimized ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
          <button className="icon-btn-small" onClick={(e) => { e.stopPropagation(); onClose(); }}>
            <X size={18} />
          </button>
        </div>
      </div>
      
      {!isMinimized && (
        <div className="upload-progress-body">
          {uploads.map(upload => (
            <div key={upload.id} className="upload-item">
              <div className="upload-item-icon">
                <File size={20} className="text-secondary" />
              </div>
              <div className="upload-item-details">
                <span className="upload-item-name">{upload.filename}</span>
                {(upload.status === 'uploading' || upload.status === 'paused') && (
                  <div className="upload-progress-bar-container">
                    <div 
                      className="upload-progress-bar-fill" 
                      style={{ width: `${upload.progress}%`, background: upload.status === 'paused' ? 'var(--text-secondary)' : 'var(--accent-primary)' }} 
                    />
                  </div>
                )}
                {upload.status === 'error' && (
                  <span className="upload-item-error">Failed</span>
                )}
              </div>
              <div className="upload-item-status" style={{ minWidth: '120px', textAlign: 'right', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem' }}>
                {upload.status === 'uploading' && (
                  <>
                    <span className="upload-progress-text" style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                      {upload.phase === 'local' ? (
                        `Processing... ${Math.round(upload.progress)}%`
                      ) : (
                        `${formatBytes(upload.loadedBytes || 0)} / ${formatBytes(upload.totalBytes || 0)}`
                      )}
                    </span>
                    <button onClick={() => onPause(upload.id)} title="Pause" className="icon-btn-small" style={{ color: 'var(--text-secondary)' }}><PauseCircle size={16} /></button>
                    <button onClick={() => onCancel(upload.id)} title="Cancel" className="icon-btn-small" style={{ color: 'var(--text-secondary)' }}><XCircle size={16} /></button>
                  </>
                )}
                {upload.status === 'paused' && (
                  <>
                    <span className="upload-progress-text" style={{ fontSize: '0.75rem', whiteSpace: 'nowrap', color: 'var(--text-secondary)' }}>Paused</span>
                    <button onClick={() => onResume(upload.id)} title="Resume" className="icon-btn-small" style={{ color: 'var(--accent-primary)' }}><PlayCircle size={16} /></button>
                    <button onClick={() => onCancel(upload.id)} title="Cancel" className="icon-btn-small" style={{ color: 'var(--text-secondary)' }}><XCircle size={16} /></button>
                  </>
                )}
                {upload.status === 'success' && (
                  <CheckCircle2 size={20} className="text-success" color="#10b981" />
                )}
                {upload.status === 'error' && (
                  <>
                    <AlertCircle size={20} className="text-error" color="#ef4444" />
                    <button onClick={() => onRetry(upload.id)} title="Retry" className="icon-btn-small" style={{ color: 'var(--accent-primary)' }}><RefreshCw size={16} /></button>
                    <button onClick={() => onCancel(upload.id)} title="Remove" className="icon-btn-small" style={{ color: 'var(--text-secondary)' }}><XCircle size={16} /></button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default UploadProgress;

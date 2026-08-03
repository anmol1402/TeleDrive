import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Download, Share2, ZoomIn, ZoomOut, Maximize, XCircle, ChevronLeft, ChevronRight, Music } from 'lucide-react';
import CustomVideoPlayer from '../features/CustomVideoPlayer';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const FilePreviewModal = ({ file, files, onClose }) => {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const [currentIndex, setCurrentIndex] = useState(0);

  const previewableFiles = React.useMemo(() => files.filter(f => !f.isFolder), [files]);

  useEffect(() => {
    const idx = previewableFiles.findIndex(f => f.messageId === file.messageId);
    if (idx !== -1) setCurrentIndex(idx);
  }, [file.messageId, previewableFiles]);

  const currentFile = previewableFiles[currentIndex] || file;

  const resetZoom = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const handleNext = useCallback((e) => {
    if (e) e.stopPropagation();
    if (currentIndex < previewableFiles.length - 1) {
      setCurrentIndex(currentIndex + 1);
      resetZoom();
    }
  }, [currentIndex, previewableFiles.length, resetZoom]);

  const handlePrev = useCallback((e) => {
    if (e) e.stopPropagation();
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      resetZoom();
    }
  }, [currentIndex, resetZoom]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrev, onClose]);

  const isImageOrVideo = (filename) => {
    return filename && filename.match(/\.(jpg|jpeg|png|gif|svg|mp4|avi|mov|mkv|webp)$/i);
  };
  
  const isImage = (filename) => {
    return filename && filename.match(/\.(jpg|jpeg|png|gif|svg|webp)$/i);
  };

  const handleWheel = (e) => {
    if (!isImage(currentFile.filename)) return;
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setZoom(prev => Math.min(Math.max(1, prev + delta), 5));
    }
  };

  const handleMouseDown = (e) => {
    if (zoom > 1 && e.button === 0) {
      setIsDragging(true);
      dragStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      setPan({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleDownload = async (e) => {
    e.stopPropagation();
    try {
      const a = document.createElement('a');
      a.href = `${API_URL}/api/files/download/${currentFile.messageId}`;
      a.download = currentFile.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error(err);
    }
  };

  const handleShare = async (e) => {
    e.stopPropagation();
    const downloadUrl = `${API_URL}/api/files/download/${currentFile.messageId}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: currentFile.filename,
          text: `Check out ${currentFile.filename}`,
          url: downloadUrl
        });
      } catch (err) {
        console.error(err);
      }
    } else {
      navigator.clipboard.writeText(downloadUrl);
      alert('Link copied to clipboard!');
    }
  };

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.9)',
        backdropFilter: 'blur(8px)',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
      }}
      onWheel={handleWheel}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1.5rem 2rem', background: 'linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)', zIndex: 10 }}>
        <div style={{ color: 'white', display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '1.25rem', fontWeight: 600 }}>{currentFile.filename}</span>
          <span style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)' }}>{currentIndex + 1} of {previewableFiles.length}</span>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {isImage(currentFile.filename) && (
            <div style={{ display: 'flex', background: 'rgba(255,255,255,0.1)', borderRadius: 'var(--radius-full)', padding: '4px' }}>
              <button onClick={(e) => { e.stopPropagation(); setZoom(prev => Math.max(1, prev - 0.25)); }} style={{ background: 'transparent', border: 'none', color: 'white', padding: '8px', cursor: 'pointer', borderRadius: '50%' }}>
                <ZoomOut size={20} />
              </button>
              <button onClick={(e) => { e.stopPropagation(); resetZoom(); }} style={{ background: 'transparent', border: 'none', color: 'white', padding: '8px', cursor: 'pointer', borderRadius: '50%' }}>
                <Maximize size={20} />
              </button>
              <button onClick={(e) => { e.stopPropagation(); setZoom(prev => Math.min(5, prev + 0.25)); }} style={{ background: 'transparent', border: 'none', color: 'white', padding: '8px', cursor: 'pointer', borderRadius: '50%' }}>
                <ZoomIn size={20} />
              </button>
            </div>
          )}
          
          <button onClick={handleDownload} title="Download" style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', padding: '12px', cursor: 'pointer', borderRadius: '50%' }}>
            <Download size={20} />
          </button>
          <button onClick={handleShare} title="Share" style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', padding: '12px', cursor: 'pointer', borderRadius: '50%' }}>
            <Share2 size={20} />
          </button>
          <button onClick={onClose} title="Close" style={{ background: 'transparent', border: 'none', color: 'white', padding: '12px', cursor: 'pointer', marginLeft: '1rem' }}>
            <XCircle size={32} />
          </button>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', position: 'relative' }} onClick={onClose}>
        
        {currentIndex > 0 && (
          <button 
            onClick={handlePrev}
            style={{ position: 'absolute', left: '2rem', top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', borderRadius: '50%', width: '48px', height: '48px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10, backdropFilter: 'blur(4px)' }}
          >
            <ChevronLeft size={32} />
          </button>
        )}

        <div onClick={e => e.stopPropagation()} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', height: '100%' }}>
          {isImageOrVideo(currentFile.filename) ? (
            isImage(currentFile.filename) ? (
              <img 
                src={`${API_URL}/api/files/download/${currentFile.messageId}`} 
                alt="preview" 
                draggable="false"
                onMouseDown={handleMouseDown}
                style={{ 
                  maxWidth: '90vw', maxHeight: '85vh', objectFit: 'contain', borderRadius: 'var(--radius-lg)', boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                  cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
                  transition: isDragging ? 'none' : 'transform 0.2s ease'
                }} 
              />
            ) : (
              <CustomVideoPlayer src={`${API_URL}/api/files/download/${currentFile.messageId}`} />
            )
          ) : currentFile.filename.match(/\.(mp3|wav|ogg|m4a)$/i) ? (
            <div style={{ textAlign: 'center', background: 'var(--bg-secondary)', padding: '4rem', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-color)', boxShadow: '0 10px 40px rgba(0,0,0,0.5)', width: '400px' }}>
              <Music size={80} style={{ color: 'var(--accent-primary)', marginBottom: '3rem' }} />
              <audio 
                src={`${API_URL}/api/files/download/${currentFile.messageId}`} 
                autoPlay 
                controls
                style={{ width: '100%' }}
              />
            </div>
          ) : currentFile.filename.match(/\.(pdf)$/i) ? (
            <iframe 
              src={`${API_URL}/api/files/download/${currentFile.messageId}`} 
              style={{ width: '80vw', height: '85vh', borderRadius: 'var(--radius-lg)', border: 'none', background: 'white', boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }}
              title="PDF Preview"
            />
          ) : currentFile.filename.match(/\.(txt|md|csv|json)$/i) ? (
            <iframe 
              src={`${API_URL}/api/files/download/${currentFile.messageId}`} 
              style={{ width: '80vw', height: '85vh', borderRadius: 'var(--radius-lg)', border: 'none', background: 'white', boxShadow: '0 10px 40px rgba(0,0,0,0.5)', padding: '2rem' }}
              title="Text Preview"
            />
          ) : (
            <div style={{ textAlign: 'center', color: 'white', background: 'rgba(255,255,255,0.1)', padding: '4rem', borderRadius: 'var(--radius-xl)', border: '1px solid rgba(255,255,255,0.2)' }}>
              <p style={{ fontSize: '1.2rem', marginBottom: '2rem', fontWeight: '500' }}>Direct preview not available for this file type.</p>
              <button 
                onClick={handleDownload}
                style={{ background: 'var(--accent-primary)', color: 'white', padding: '1rem 2rem', borderRadius: 'var(--radius-md)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold', border: 'none', cursor: 'pointer', fontSize: '1rem' }}
              >
                <Download size={20} /> Download {currentFile.filename} to View
              </button>
            </div>
          )}
        </div>

        {currentIndex < previewableFiles.length - 1 && (
          <button 
            onClick={handleNext}
            style={{ position: 'absolute', right: '2rem', top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', borderRadius: '50%', width: '48px', height: '48px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10, backdropFilter: 'blur(4px)' }}
          >
            <ChevronRight size={32} />
          </button>
        )}
      </div>
    </div>
  );
};

export default FilePreviewModal;

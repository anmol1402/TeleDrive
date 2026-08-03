import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize } from 'lucide-react';

const CustomVideoPlayer = ({ src, autoPlay = true }) => {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isBuffering, setIsBuffering] = useState(true);
  
  const controlsTimeoutRef = useRef(null);
  const targetTimeRef = useRef(null);
  const wasPlayingRef = useRef(false);
  
  useEffect(() => {
    const handleMouseMove = () => {
      setShowControls(true);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      controlsTimeoutRef.current = setTimeout(() => {
        if (isPlaying) {
          setShowControls(false);
        }
      }, 2500);
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('mousemove', handleMouseMove);
      container.addEventListener('mouseleave', () => {
        if (isPlaying) setShowControls(false);
      });
    }

    return () => {
      if (container) {
        container.removeEventListener('mousemove', handleMouseMove);
      }
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [isPlaying]);

  const togglePlay = () => {
    if (videoRef.current.paused) {
      videoRef.current.play().catch(console.error);
    } else {
      videoRef.current.pause();
    }
  };

  const handleTimeUpdate = () => {
    const current = videoRef.current.currentTime;
    const total = videoRef.current.duration;
    setCurrentTime(current);
    if (total > 0) {
      setProgress((current / total) * 100);
    }
  };

  const handleLoadedMetadata = () => {
    setDuration(videoRef.current.duration);
    
    // Restore time if we just switched quality
    if (targetTimeRef.current !== null) {
      videoRef.current.currentTime = targetTimeRef.current;
      targetTimeRef.current = null;
    }
    
    if (wasPlayingRef.current || isPlaying || autoPlay) {
      videoRef.current.play().then(() => {
        wasPlayingRef.current = false;
      }).catch(err => {
        console.log("Autoplay prevented", err);
        setIsPlaying(false);
        setIsBuffering(false);
      });
    } else {
      setIsBuffering(false);
    }
    
    videoRef.current.playbackRate = playbackSpeed;
  };

  const formatTime = (time) => {
    if (isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const handleSeek = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    const newTime = percentage * duration;
    videoRef.current.currentTime = newTime;
    setProgress(percentage * 100);
  };

  const toggleMute = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    videoRef.current.muted = newMuted;
    if (newMuted) {
      videoRef.current.volume = 0;
    } else {
      videoRef.current.volume = volume || 1;
    }
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    videoRef.current.volume = newVolume;
    setIsMuted(newVolume === 0);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const handleSpeedChange = (speed) => {
    setPlaybackSpeed(speed);
    videoRef.current.playbackRate = speed;
    setShowSpeedMenu(false);
  };

  const toggleSpeedMenu = () => {
    setShowSpeedMenu(!showSpeedMenu);
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  return (
    <div 
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        maxWidth: isFullscreen ? 'none' : '90vw',
        maxHeight: isFullscreen ? 'none' : '85vh',
        backgroundColor: 'black',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        borderRadius: isFullscreen ? '0' : 'var(--radius-lg)',
        boxShadow: isFullscreen ? 'none' : '0 10px 40px rgba(0,0,0,0.5)',
        cursor: showControls ? 'default' : 'none',
      }}
    >
      <style>
        {`
          @keyframes yt-spinner {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          .yt-spinner-circle {
            animation: yt-spinner 1.2s linear infinite;
          }
        `}
      </style>
      
      <video
        ref={videoRef}
        src={src}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
        }}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onWaiting={() => setIsBuffering(true)}
        onPlaying={() => { setIsBuffering(false); setIsPlaying(true); }}
        onPause={() => setIsPlaying(false)}
        onCanPlay={() => setIsBuffering(false)}
        onClick={togglePlay}
        onEnded={() => setIsPlaying(false)}
      />

      {isBuffering && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 10
        }}>
          <svg className="yt-spinner-circle" width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="32" cy="32" r="24" stroke="rgba(255, 255, 255, 0.3)" strokeWidth="5" />
            <path d="M32 8C45.2548 8 56 18.7452 56 32" stroke="white" strokeWidth="5" strokeLinecap="round" />
          </svg>
        </div>
      )}

      <div 
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.4) 60%, transparent 100%)',
          padding: '20px 20px 10px 20px',
          opacity: showControls ? 1 : 0,
          transition: 'opacity 0.3s ease',
          pointerEvents: showControls ? 'auto' : 'none',
        }}
      >
        {/* Timeline */}
        <div 
          onClick={handleSeek}
          style={{
            width: '100%',
            height: '6px',
            background: 'rgba(255,255,255,0.3)',
            cursor: 'pointer',
            position: 'relative',
            marginBottom: '15px',
            borderRadius: '3px',
            transition: 'height 0.1s ease',
          }}
          onMouseEnter={(e) => e.currentTarget.style.height = '8px'}
          onMouseLeave={(e) => e.currentTarget.style.height = '6px'}
        >
          <div 
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              height: '100%',
              width: `${progress}%`,
              background: '#ff0000',
              borderRadius: '3px',
            }}
          >
            {/* Scrubber thumb */}
            <div style={{
              position: 'absolute',
              right: '-6px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '12px',
              height: '12px',
              background: '#ff0000',
              borderRadius: '50%',
              boxShadow: '0 0 5px rgba(0,0,0,0.5)'
            }} />
          </div>
        </div>

        {/* Controls Row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <button 
              onClick={togglePlay}
              style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
            >
              {isPlaying ? <Pause size={24} fill="white" /> : <Play size={24} fill="white" />}
            </button>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button 
                onClick={toggleMute}
                style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
              >
                {isMuted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
              </button>
              <input 
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                style={{
                  width: '80px',
                  height: '4px',
                  accentColor: 'white',
                  cursor: 'pointer'
                }}
              />
            </div>

            <div style={{ color: 'white', fontSize: '13px', fontWeight: '500', marginLeft: '10px', textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}>
              {formatTime(currentTime)} <span style={{ opacity: 0.7, margin: '0 4px' }}>/</span> {formatTime(duration)}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div style={{ position: 'relative' }}>
              <button 
                onClick={toggleSpeedMenu}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  color: 'white', 
                  cursor: 'pointer', 
                  padding: '5px 10px', 
                  display: 'flex', 
                  alignItems: 'center',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: showSpeedMenu ? 'rgba(255,255,255,0.2)' : 'transparent',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.2)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = showSpeedMenu ? 'rgba(255,255,255,0.2)' : 'transparent'}
              >
                {playbackSpeed === 1 ? '1x' : `${playbackSpeed}x`}
              </button>
              
              {showSpeedMenu && (
                <div style={{ 
                  position: 'absolute', 
                  bottom: '100%', 
                  right: 0, 
                  marginBottom: '15px', 
                  background: 'rgba(28, 28, 28, 0.95)', 
                  backdropFilter: 'blur(10px)',
                  borderRadius: 'var(--radius-md)',
                  padding: '5px 0',
                  minWidth: '120px',
                  boxShadow: '0 -5px 20px rgba(0,0,0,0.5)',
                  color: 'white',
                  fontSize: '13px'
                }}>
                  {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map(speed => (
                    <div 
                      key={speed}
                      onClick={() => handleSpeedChange(speed)}
                      style={{ 
                        padding: '10px 15px',
                        paddingLeft: '35px', 
                        cursor: 'pointer', 
                        display: 'flex', 
                        alignItems: 'center', 
                        position: 'relative', 
                        background: playbackSpeed === speed ? 'rgba(255,255,255,0.1)' : 'transparent' 
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = playbackSpeed === speed ? 'rgba(255,255,255,0.1)' : 'transparent'}
                    >
                      {playbackSpeed === speed && <span style={{ position: 'absolute', left: '15px' }}>✓</span>}
                      <span>{speed === 1 ? 'Normal' : `${speed}x`}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button 
              onClick={toggleFullscreen}
              style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
            >
              {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomVideoPlayer;

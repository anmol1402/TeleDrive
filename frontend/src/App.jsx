import React, { useState, useEffect } from 'react';
import Login from './components/auth/Login';
import Dashboard from './components/layout/Dashboard';
import './App.css';

function App() {
  // Cache busting comment to force a new JS file hash on Vercel build
  // Check if we have a session stored (simple mock auth for frontend)
  // In a real app, we'd validate the session with the backend on load
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    console.log("Cache busted! Build timestamp:", Date.now());
    const session = localStorage.getItem('telegram_session_active');
    if (session) {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLoginSuccess = () => {
    localStorage.setItem('telegram_session_active', 'true');
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('telegram_session_active');
    setIsAuthenticated(false);
  };

  return (
    <div className="app-container">
      {isAuthenticated ? (
        <Dashboard onLogout={handleLogout} />
      ) : (
        <Login onLoginSuccess={handleLoginSuccess} />
      )}
    </div>
  );
}

export default App;

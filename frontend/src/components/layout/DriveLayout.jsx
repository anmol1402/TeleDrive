import React from 'react';

const DriveLayout = ({ sidebar, topbar, children, rightSidebar }) => {
  return (
    <div className="dashboard-layout" style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw' }}>
      {topbar}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {sidebar}
        <main className="main-content" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          {children}
        </main>
        {rightSidebar}
      </div>
    </div>
  );
};

export default DriveLayout;

import React, { useState } from 'react';
import './App.css';
import OfferLetter from './modules/OfferLetter/OfferLetter';

function App() {
  const [activeModule, setActiveModule] = useState('offerletter');

  const renderModule = () => {
    switch (activeModule) {
      case 'offerletter':
        return <OfferLetter />;
      // Add more modules here in the future
      // case 'attendance':
      //   return <Attendance />;
      // case 'leave':
      //   return <LeaveManagement />;
      default:
        return <OfferLetter />;
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>HR Management System</h1>
        <nav className="App-nav">
          <button 
            className={activeModule === 'offerletter' ? 'active' : ''} 
            onClick={() => setActiveModule('offerletter')}
          >
            Offer Letter
          </button>
          {/* Add more module buttons here in the future */}
          {/* <button 
            className={activeModule === 'attendance' ? 'active' : ''} 
            onClick={() => setActiveModule('attendance')}
          >
            Attendance
          </button>
          <button 
            className={activeModule === 'leave' ? 'active' : ''} 
            onClick={() => setActiveModule('leave')}
          >
            Leave Management
          </button> */}
        </nav>
      </header>
      
      <main className="App-main">
        {renderModule()}
      </main>
    </div>
  );
}

export default App;

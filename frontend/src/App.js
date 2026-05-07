import React from 'react';
import './App.css';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import OfferLetter from './modules/OfferLetter/OfferLetter';
import AdvancedEditor from './modules/OfferLetter/AdvancedEditor';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={
            <>
              <header className="App-header">
                <h1>HR Management System</h1>
                <nav className="App-nav">
                  <button className="active">
                    Offer Letter
                  </button>
                </nav>
              </header>
              <main className="App-main">
                <OfferLetter />
              </main>
            </>
          } />
          <Route path="/advanced-editor" element={<AdvancedEditor />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;

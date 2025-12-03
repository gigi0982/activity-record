import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Navigation from './components/Navigation';
import ActivityForm from './components/ActivityForm';
import ActivityList from './components/ActivityList';
import Statistics from './components/Statistics';

function App() {
  return (
    <div className="App">
      <Navigation />
      <div className="container mt-4">
        <Routes>
          <Route path="/" element={<ActivityList />} />
          <Route path="/add" element={<ActivityForm />} />
          <Route path="/stats" element={<Statistics />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;
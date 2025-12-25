import React from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import Navigation from './components/Navigation';
import Dashboard from './components/Dashboard';
import ActivityForm from './components/ActivityForm';
import ActivityList from './components/ActivityList';
import Statistics from './components/Statistics';
import QuarterlyStats from './components/QuarterlyStats';
import ElderProfile from './components/ElderProfile';
import ElderReport from './components/ElderReport';
import SystemSettings from './components/SystemSettings';
import MeetingList from './components/MeetingList';
import MeetingForm from './components/MeetingForm';
import PlanEditor from './components/PlanEditor';
import EvaluationReport from './components/EvaluationReport';
import QuarterlyComparison from './components/QuarterlyComparison';
import PlanTracking from './components/PlanTracking';
import FeeRegistration from './components/FeeRegistration';
import FeeSettings from './components/FeeSettings';
import FeeReport from './components/FeeReport';
import QuickEntry from './components/QuickEntry';
import FeeHistory from './components/FeeHistory';
import FeeEdit from './components/FeeEdit';

function App() {
  const location = useLocation();
  const isHomePage = location.pathname === '/';

  return (
    <div className="App">
      {/* 首頁不顯示導航列 */}
      {!isHomePage && <Navigation />}
      <div className={isHomePage ? '' : 'container mt-4'}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/activities" element={<ActivityList />} />
          <Route path="/add" element={<ActivityForm />} />
          <Route path="/stats" element={<Statistics />} />
          <Route path="/quarterly" element={<QuarterlyStats />} />
          <Route path="/elder/:name" element={<ElderProfile />} />
          <Route path="/elder-report/:elderName" element={<ElderReport />} />
          <Route path="/settings" element={<SystemSettings />} />
          <Route path="/meetings" element={<MeetingList />} />
          <Route path="/meetings/new" element={<MeetingForm />} />
          <Route path="/meetings/:id" element={<MeetingForm />} />
          <Route path="/plans" element={<PlanEditor />} />
          <Route path="/tracking" element={<PlanTracking />} />
          <Route path="/comparison" element={<QuarterlyComparison />} />
          <Route path="/evaluation" element={<EvaluationReport />} />
          <Route path="/fee" element={<FeeRegistration />} />
          <Route path="/fee-settings" element={<FeeSettings />} />
          <Route path="/fee-report" element={<FeeReport />} />
          <Route path="/fee-history" element={<FeeHistory />} />
          <Route path="/fee-edit/:date" element={<FeeEdit />} />
          <Route path="/quick" element={<QuickEntry />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;
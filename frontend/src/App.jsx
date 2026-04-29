import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { useState } from 'react';
import Login from './pages/Login';
import PatientDashboard from './pages/PatientDashboard';
import DoctorDashboard from './pages/DoctorDashboard';
import About from './pages/About';
import { Activity, Info } from 'lucide-react';
import './index.css';

function App() {
  const [user, setUser] = useState(null);

  const handleLogout = () => {
    setUser(null);
  };

  return (
    <BrowserRouter>
      <div className="app-wrapper">
        <nav className="navbar">
          <Link to="/" className="navbar-brand">
            <Activity color="#4cc9f0" size={28} className="glow-effect" style={{borderRadius: '50%'}} />
            AuraHealth
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/about" className="btn btn-secondary" style={{padding: '6px 12px', fontSize: '0.8rem'}}>
              <Info size={16} /> About Project
            </Link>
            {user && (
              <>
                <span className="badge">{user.role}</span>
                <span className="text-sm">{user.name}</span>
                <button onClick={handleLogout} className="btn" style={{padding: '6px 12px', fontSize: '0.8rem'}}>
                  Logout
                </button>
              </>
            )}
          </div>
        </nav>

        <main className="animate-fade-in" style={{height: '100%'}}>
          <Routes>
            <Route 
              path="/" 
              element={!user ? <Login onLogin={setUser} /> : <Navigate to={user.role === 'PATIENT' ? '/patient' : '/doctor'} />} 
            />
            <Route path="/about" element={<About />} />
            <Route 
              path="/patient/*" 
              element={user && user.role === 'PATIENT' ? <PatientDashboard user={user} /> : <Navigate to="/" />} 
            />
            <Route 
              path="/doctor/*" 
              element={user && user.role === 'DOCTOR' ? <DoctorDashboard user={user} /> : <Navigate to="/" />} 
            />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;

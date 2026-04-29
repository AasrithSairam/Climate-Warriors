import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import Login from './pages/Login';
import PatientDashboard from './pages/PatientDashboard';
import DoctorDashboard from './pages/DoctorDashboard';
import NurseDashboard from './pages/NurseDashboard'; // NEW
import { Activity, Globe, Info } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState(null);
  const [language, setLanguage] = useState('EN');
  const nav = useNavigate();
  const loc = useLocation();

  useEffect(() => {
    const saved = localStorage.getItem('user');
    if (saved) {
      setUser(JSON.parse(saved));
    } else if (loc.pathname !== '/login') {
      nav('/login');
    }
  }, [nav, loc.pathname]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    setUser(null);
    nav('/login');
  };

  return (
    <div>
      {/* Universal Top Header */}
      <header style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
        padding: '16px 40px', background: 'white', borderBottom: '1px solid #e2e8f0',
        position: 'sticky', top: 0, zIndex: 100
      }}>
        <div className="flex items-center gap-2">
          <Activity color="var(--primary-color)" size={28} />
          <h2 style={{margin:0, color: 'var(--primary-color)', letterSpacing: '-0.5px'}}>AuraHealth</h2>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-sm text-secondary">
            <Globe size={16} />
            <select 
              value={language} 
              onChange={(e) => setLanguage(e.target.value)}
              style={{border: 'none', background: 'transparent', outline: 'none', cursor: 'pointer', padding: 0, fontWeight: 600, color: 'var(--text-primary)'}}
            >
              <option value="EN">English</option>
              <option value="TA">தமிழ் (Tamil)</option>
              <option value="HI">हिन्दी (Hindi)</option>
            </select>
          </div>
          
          <button className="btn btn-secondary flex items-center gap-2" style={{padding: '8px 16px'}}>
            <Info size={16} /> About Project
          </button>
          
          {user && (
            <div className="flex items-center gap-4 border-l pl-6" style={{borderColor: '#e2e8f0'}}>
              <span className="badge" style={{
                background: user.role === 'DOCTOR' ? 'var(--secondary-color)' : (user.role === 'NURSE' ? 'var(--warning)' : 'var(--primary-color)'),
                color: 'white', border: 'none'
              }}>{user.role}</span>
              <span className="font-bold text-sm">{user.name}</span>
              <button className="btn" style={{padding: '8px 16px', background: 'var(--danger)'}} onClick={handleLogout}>Logout</button>
            </div>
          )}
        </div>
      </header>

      {/* Main Routing Content */}
      <Routes>
        <Route path="/login" element={<Login setUser={setUser} />} />
        <Route path="/patient/*" element={user?.role === 'PATIENT' ? <PatientDashboard user={user} /> : <Login setUser={setUser}/>} />
        <Route path="/doctor/*" element={user?.role === 'DOCTOR' ? <DoctorDashboard user={user} /> : <Login setUser={setUser}/>} />
        <Route path="/nurse/*" element={user?.role === 'NURSE' ? <NurseDashboard user={user} /> : <Login setUser={setUser}/>} />
      </Routes>
    </div>
  );
}

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Activity, ShieldCheck, HeartPulse, User } from 'lucide-react';

export default function Login({ setUser }) {
  const [email, setEmail] = useState('john@example.com');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState('');
  const nav = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('http://localhost:3001/api/login', { email, password });
      localStorage.setItem('user', JSON.stringify(res.data));
      setUser(res.data);
      if (res.data.role === 'PATIENT') nav('/patient');
      else if (res.data.role === 'DOCTOR') nav('/doctor');
      else if (res.data.role === 'NURSE') nav('/nurse');
    } catch (err) {
      setError('Invalid credentials');
    }
  };

  return (
    <div className="flex justify-center items-center h-full animate-fade-in" style={{background: 'var(--bg-light)', minHeight: 'calc(100vh - 70px)'}}>
      <div className="glass-card flex" style={{padding: 0, maxWidth: '900px', width: '100%', overflow: 'hidden'}}>
        
        {/* Left Side Branding */}
        <div style={{flex: 1, background: 'var(--primary-color)', color: 'white', padding: '60px 40px', display: 'flex', flexDirection: 'column', justifyContent: 'center'}}>
          <Activity size={64} className="mb-4" />
          <h1 style={{fontSize: '3rem', margin: '0 0 16px 0', color: 'white'}}>AuraHealth</h1>
          <p style={{fontSize: '1.2rem', opacity: 0.9, lineHeight: 1.6}}>The privacy-preserving patient memory layer. Unifying healthcare data at the point of care.</p>
          
          <div className="mt-8 flex-col gap-4">
            <div className="flex items-center gap-3"><ShieldCheck/> <span>Granular Data Governance</span></div>
            <div className="flex items-center gap-3"><HeartPulse/> <span>Real-time AI Clinical Insights</span></div>
            <div className="flex items-center gap-3"><User/> <span>Seamless Triage & Provider Workflow</span></div>
          </div>
        </div>

        {/* Right Side Form */}
        <div style={{flex: 1, padding: '60px 40px', background: 'white'}}>
          <h2 className="mb-2">Welcome Back</h2>
          <p className="text-secondary mb-8">Sign in to your centralized healthcare portal.</p>
          
          <form onSubmit={handleLogin} className="flex-col gap-4">
            <div>
              <label className="text-sm font-bold">Email Address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div>
              <label className="text-sm font-bold">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            {error && <p className="text-sm" style={{color: 'var(--danger)'}}>{error}</p>}
            
            <button type="submit" className="btn mt-4 w-full" style={{padding: '16px'}}>Secure Login</button>
          </form>

          <div className="mt-8 pt-8" style={{borderTop: '1px solid var(--glass-border)'}}>
            <p className="text-sm font-bold mb-4">Demo Accounts:</p>
            <div className="flex gap-2 mb-2">
              <button className="badge btn-secondary" onClick={()=>setEmail('john@example.com')}>Patient</button>
              <button className="badge btn-secondary" onClick={()=>setEmail('sarah@example.com')}>Doctor</button>
              <button className="badge btn-secondary" onClick={()=>setEmail('priya@example.com')}>Nurse</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

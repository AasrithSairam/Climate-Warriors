import { useState } from 'react';
import axios from 'axios';
import { User, Lock, ArrowRight } from 'lucide-react';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('john@example.com');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('http://localhost:3001/api/login', { email, password });
      onLogin(res.data);
    } catch (err) {
      setError('Invalid credentials');
    }
  };

  return (
    <div className="flex justify-center items-center w-full animate-fade-in" style={{ flex: 1, minHeight: 'calc(100vh - 80px)' }}>
      <div className="glass-card" style={{ width: '100%', maxWidth: '450px' }}>
        <h2 className="text-gradient" style={{ textAlign: 'center', marginBottom: '1rem' }}>Welcome to AuraHealth</h2>
        <p className="text-sm" style={{ textAlign: 'center', marginBottom: '2rem' }}>
          Persistent, privacy-preserving patient memory layer.
        </p>

        <form onSubmit={handleLogin} className="flex-col gap-4">
          <div>
            <label className="text-sm mb-4" style={{display: 'block'}}>Email</label>
            <div className="flex items-center gap-4">
              <User size={20} color="var(--text-secondary)" />
              <input 
                type="email" 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                required 
                style={{marginBottom: 0}}
              />
            </div>
          </div>

          <div style={{marginTop: '1rem'}}>
            <label className="text-sm mb-4" style={{display: 'block'}}>Password</label>
            <div className="flex items-center gap-4">
              <Lock size={20} color="var(--text-secondary)" />
              <input 
                type="password" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                required 
                style={{marginBottom: 0}}
              />
            </div>
          </div>

          {error && <p style={{color: 'var(--danger)', fontSize: '0.875rem', marginTop: '1rem'}}>{error}</p>}

          <button type="submit" className="btn mt-8" style={{width: '100%'}}>
            Access Secure Portal <ArrowRight size={18} />
          </button>
        </form>

        <div className="mt-8 text-sm flex-col gap-4" style={{background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px'}}>
          <p><strong>Demo Accounts:</strong></p>
          <p>Patient: john@example.com / password123</p>
          <p>Psychologist: sarah@example.com / password123</p>
          <p>Cardiologist: alan@example.com / password123</p>
        </div>
      </div>
    </div>
  );
}

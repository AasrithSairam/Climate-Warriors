import { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import { Users, Calendar, BrainCircuit, ShieldAlert, FileText, CheckCircle, Clock } from 'lucide-react';

export default function DoctorDashboard({ user }) {
  const [patients, setPatients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [aiSummary, setAiSummary] = useState(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [records, setRecords] = useState([]);
  const loc = useLocation();

  const fetchData = async () => {
    const res = await axios.get(`http://localhost:3001/api/doctors/${user.id}/patients`);
    const uniquePatients = [];
    const map = new Map();
    for (const item of res.data.patients) {
      if(!map.has(item.user.id)){
          map.set(item.user.id, true);
          uniquePatients.push(item.user);
      }
    }
    setPatients(uniquePatients);
    setAppointments(res.data.appointments);
  };

  useEffect(() => { fetchData(); }, [user.id]);

  const handleSelectPatient = async (patient) => {
    setSelectedPatient(patient);
    setAiSummary(null); setRecords([]); setLoadingAi(true);
    
    const res = await axios.get(`http://localhost:3001/api/patients/${patient.id}/records?doctorId=${user.id}`);
    setRecords(res.data.records);

    try {
      const aiRes = await axios.post('http://localhost:8000/api/synthesize', {
        patient_name: patient.name,
        doctor_specialty: user.specialty,
        records: res.data.records
      });
      setAiSummary(aiRes.data.summary);
    } catch (e) {
      setAiSummary("Failed to generate AI synthesis. LLM unavailable or patient revoked access.");
    }
    setLoadingAi(false);
  };

  const handleAcceptAppointment = async (id) => {
    await axios.put(`http://localhost:3001/api/appointments/${id}/accept`);
    fetchData();
  };

  const handlePrescribe = async (e, appointmentId, patientId, hospitalId) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    await axios.post(`http://localhost:3001/api/appointments/${appointmentId}/prescribe`, {
      patientId, hospitalId,
      title: formData.get('title'), type: formData.get('type'),
      specialty: user.specialty, content: formData.get('content')
    });
    alert('Record saved to Patient Memory Layer.');
    e.target.reset();
    handleSelectPatient(selectedPatient); 
  };

  const navItem = (path, icon, label) => {
    const active = loc.pathname === path || (path === '/doctor' && loc.pathname === '/doctor/');
    return (
      <Link to={path} className={`sidebar-item ${active ? 'active' : ''}`} style={{textDecoration: 'none'}}>
        {icon} <span>{label}</span>
      </Link>
    );
  };

  return (
    <div className="dashboard-layout animate-fade-in">
      <div className="sidebar">
        {navItem('/doctor', <Users size={20} />, 'Point of Care')}
        {navItem('/doctor/appointments', <Calendar size={20} />, 'Appointments')}
      </div>

      <div className="dashboard-content">
        <Routes>
          <Route path="/" element={
            <div className="stagger-1 grid grid-2" style={{gridTemplateColumns: '1fr 2.5fr'}}>
              
              <div className="glass-card">
                <div className="flex items-center gap-4 mb-6">
                  <Users color="var(--primary-color)" />
                  <h3 style={{margin:0}}>My Patients</h3>
                </div>
                <div className="flex-col gap-3">
                  {patients.map(p => (
                    <div key={p.id} onClick={() => handleSelectPatient(p)}
                      style={{
                        background: selectedPatient?.id === p.id ? 'rgba(0, 240, 255, 0.1)' : 'rgba(0,0,0,0.3)', 
                        padding: '16px', borderRadius: '12px', cursor: 'pointer',
                        border: selectedPatient?.id === p.id ? '1px solid var(--primary-color)' : '1px solid transparent',
                        transition: 'all 0.3s ease'
                      }}>
                      <p style={{fontWeight: 700, margin: 0, color: selectedPatient?.id === p.id ? 'var(--primary-color)' : 'white'}}>{p.name}</p>
                      {p.dob && <p className="text-sm mt-1" style={{color: 'var(--text-secondary)'}}>DOB: {new Date(p.dob).toLocaleDateString()}</p>}
                    </div>
                  ))}
                  {patients.length === 0 && <p className="text-sm text-center mt-4">No patients found in your network.</p>}
                </div>
              </div>

              {selectedPatient ? (
                <div className="flex-col gap-6">
                  
                  <div className="glass-card stagger-2" style={{border: '1px solid rgba(0, 240, 255, 0.3)', background: 'linear-gradient(180deg, rgba(26,26,58,0.8) 0%, rgba(10,10,30,0.9) 100%)'}}>
                    <div className="flex items-center gap-4 mb-4">
                      <BrainCircuit color="var(--primary-color)" size={32} className="glow-effect" />
                      <div>
                        <h3 style={{margin: 0, color: 'var(--primary-color)'}}>AI Memory Synthesis</h3>
                        <p className="text-sm mt-1">Contextualized for {user.specialty}</p>
                      </div>
                    </div>
                    {loadingAi ? (
                      <div className="text-sm flex items-center justify-center gap-2 py-8" style={{color: 'var(--primary-color)'}}>
                        <BrainCircuit className="glow-effect" size={20}/> Analyzing 30-year longitudinal records...
                      </div>
                    ) : (
                      <div style={{lineHeight: 1.8, whiteSpace: 'pre-wrap', fontSize: '1.05rem', color: '#e0e0f0'}}>{aiSummary}</div>
                    )}
                  </div>

                  <div className="grid grid-2 gap-6">
                    {/* Active Appointments for Prescribing */}
                    <div className="flex-col gap-6">
                      {appointments.filter(a => a.patientId === selectedPatient.id && a.status === 'ACCEPTED').map(a => (
                        <div key={a.id} className="glass-card stagger-3" style={{borderTop: '4px solid var(--secondary-color)'}}>
                          <h3 className="mb-4">Active Visit Prescription</h3>
                          <form onSubmit={(e) => handlePrescribe(e, a.id, a.patientId, a.hospitalId)} className="flex-col">
                            <input name="title" placeholder="Diagnosis / Title" required />
                            <select name="type" required>
                              <option value="NOTE">Clinical Note</option>
                              <option value="MEDICATION">Prescription</option>
                              <option value="LAB">Lab Report</option>
                            </select>
                            <textarea name="content" placeholder="Details (Dosage, instructions...)" rows="4" required></textarea>
                            <button type="submit" className="btn mt-4 w-full">Save to Memory Layer</button>
                          </form>
                        </div>
                      ))}
                    </div>

                    <div className="glass-card stagger-3">
                      <div className="flex items-center gap-4 mb-6">
                        <FileText color="var(--primary-color)" />
                        <h3 style={{margin:0}}>Accessible Raw Records</h3>
                      </div>
                      <div className="flex-col gap-4">
                        {records.length === 0 ? (
                          <div className="p-4" style={{background: 'rgba(239, 71, 111, 0.1)', border: '1px solid var(--danger)', borderRadius: '12px'}}>
                            <p className="text-sm" style={{color: 'var(--danger)', display:'flex', alignItems:'center', gap:'8px'}}>
                              <ShieldAlert size={18}/> Patient has revoked access to records.
                            </p>
                          </div>
                        ) : (
                          records.slice().reverse().map(r => (
                            <div key={r.id} style={{background: 'rgba(0,0,0,0.4)', padding: '16px', borderRadius: '12px', borderLeft: `2px solid ${r.type==='MEDICATION' ? 'var(--warning)' : 'var(--primary-color)'}`}}>
                              <div className="flex justify-between items-center mb-2">
                                <span style={{fontWeight: 600}}>{r.title}</span>
                                <span className="badge" style={{background: 'transparent', border: '1px solid var(--glass-border)', color: 'var(--text-secondary)'}}>{r.specialty}</span>
                              </div>
                              <p className="text-sm mb-3" style={{color: '#d0d0e0'}}>{r.content}</p>
                              <div className="flex justify-between text-sm" style={{fontSize: '0.75rem', color: 'var(--text-secondary)'}}>
                                <span>{new Date(r.date).toLocaleDateString()}</span>
                                <span style={{color: r.type==='MEDICATION' ? 'var(--warning)' : 'var(--primary-color)'}}>{r.type}</span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="glass-card flex items-center justify-center text-sm" style={{color: 'var(--text-secondary)', minHeight: '60vh'}}>
                  Select a patient to access Point of Care context.
                </div>
              )}
            </div>
          } />

          <Route path="/appointments" element={
            <div className="stagger-1">
              <h2 className="text-gradient">My Schedule</h2>
              <p className="text-sm mb-8">Manage patient appointment requests across all your affiliated hospitals.</p>
              <div className="grid grid-2 mt-4">
                {appointments.map(a => (
                  <div key={a.id} className="glass-card flex justify-between items-center" style={{borderLeft: a.status==='PENDING' ? '4px solid var(--warning)' : '4px solid var(--success)'}}>
                    <div>
                      <p style={{fontSize: '1.2rem', fontWeight: 700, marginBottom: '4px'}}>{a.patient.name}</p>
                      <p className="text-sm mb-2" style={{color: 'var(--text-secondary)'}}>{a.hospital.name}</p>
                      <div className="flex items-center gap-4 text-sm" style={{color: '#b0b0c0'}}>
                        <span className="flex items-center gap-1"><Calendar size={14} color="var(--primary-color)"/> {new Date(a.appointmentDate).toLocaleDateString()}</span>
                        <span className="flex items-center gap-1"><Clock size={14} color="var(--primary-color)"/> {a.timeSlot}</span>
                      </div>
                    </div>
                    {a.status === 'PENDING' ? (
                      <button className="btn glow-effect" onClick={() => handleAcceptAppointment(a.id)}>
                        <CheckCircle size={18} /> Accept
                      </button>
                    ) : (
                      <span className="badge" style={{background: 'rgba(6, 214, 160, 0.1)', color: 'var(--success)', border: '1px solid var(--success)', padding: '8px 16px', fontSize: '0.85rem'}}>
                        <CheckCircle size={14} className="inline mr-1" /> Accepted
                      </span>
                    )}
                  </div>
                ))}
                {appointments.length === 0 && <p className="text-sm">No appointments scheduled.</p>}
              </div>
            </div>
          } />
        </Routes>
      </div>
    </div>
  );
}

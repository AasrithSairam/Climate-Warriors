import { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import { Hospital, MapPin, Calendar, Clock, AlertCircle, ShieldCheck, ShieldAlert, FileText, Activity } from 'lucide-react';

export default function PatientDashboard({ user }) {
  const [profile, setProfile] = useState(null);
  const [allHospitals, setAllHospitals] = useState([]);
  const [otpModal, setOtpModal] = useState(null);
  const [otp, setOtp] = useState('');
  const loc = useLocation();

  const fetchData = async () => {
    const pRes = await axios.get(`http://localhost:3001/api/patients/${user.id}`);
    setProfile(pRes.data);
    const hRes = await axios.get('http://localhost:3001/api/hospitals');
    setAllHospitals(hRes.data);
  };

  useEffect(() => { fetchData(); }, [user.id]);

  const handleJoinSubmit = async (e) => {
    e.preventDefault();
    if (otp !== '1234') return alert('Invalid OTP. Use 1234 for mock verification.');
    try {
      await axios.post(`http://localhost:3001/api/patients/${user.id}/join`, { hospitalId: otpModal });
      setOtpModal(null); setOtp(''); fetchData();
    } catch (e) { alert('Failed to join.'); }
  };

  const handleToggleConsent = async (hospitalId, doctorId, currentVal) => {
    await axios.post(`http://localhost:3001/api/patients/${user.id}/consent`, {
      hospitalId, doctorId, isAllowed: !currentVal
    });
    fetchData();
  };

  const createAppointment = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    await axios.post('http://localhost:3001/api/appointments', {
      patientId: user.id,
      hospitalId: formData.get('hospitalId'),
      doctorId: formData.get('doctorId'),
      appointmentDate: formData.get('appointmentDate'),
      timeSlot: formData.get('timeSlot')
    });
    alert('Appointment requested!');
    fetchData();
    e.target.reset();
  };

  if (!profile) return <div className="flex justify-center items-center w-full"><Activity className="glow-effect" color="var(--primary-color)" size={48} /></div>;

  const joinedHospitalIds = profile.patientHospitals.map(ph => ph.hospitalId);
  const unjoinedHospitals = allHospitals.filter(h => !joinedHospitalIds.includes(h.id));

  const isDoctorDenied = (doctorId) => {
    const rule = profile.consents.slice().reverse().find(c => c.doctorId === doctorId);
    return rule ? !rule.isAllowed : false;
  };

  const navItem = (path, icon, label) => {
    const active = loc.pathname === path || (path === '/patient' && loc.pathname === '/patient/');
    return (
      <Link to={path} className={`sidebar-item ${active ? 'active' : ''}`} style={{textDecoration: 'none'}}>
        {icon} <span>{label}</span>
      </Link>
    );
  };

  // Sort records chronologically
  const sortedRecords = [...profile.medicalRecords].sort((a, b) => new Date(a.date) - new Date(b.date));

  return (
    <div className="dashboard-layout animate-fade-in">
      <div className="sidebar">
        {navItem('/patient', <Hospital size={20} />, 'My Hospitals')}
        {navItem('/patient/directory', <MapPin size={20} />, 'Hospitals Directory')}
        {navItem('/patient/appointments', <Calendar size={20} />, 'Appointments')}
        {navItem('/patient/timeline', <Activity size={20} />, 'Longitudinal Timeline')}
      </div>

      <div className="dashboard-content">
        <Routes>
          <Route path="/" element={
            <div className="stagger-1">
              <h2 className="text-gradient">My Medical Network</h2>
              {profile.patientHospitals.length === 0 && <p className="text-sm">You haven't joined any hospitals yet.</p>}
              <div className="grid grid-2 mt-4">
                {profile.patientHospitals.map(ph => (
                  <div key={ph.id} className="glass-card flex-col gap-4">
                    <h3 style={{color: 'var(--primary-color)'}}>{ph.hospital.name}</h3>
                    
                    <div style={{borderTop: '1px solid var(--glass-border)', paddingTop: '16px'}}>
                      <p className="mb-4" style={{color: 'var(--text-secondary)', fontWeight: 600}}>Manage Doctor Access</p>
                      {ph.hospital.doctors.map(d => (
                        <div key={d.user.id} className="flex justify-between items-center mb-3" style={{background: 'rgba(0,0,0,0.2)', padding: '8px 12px', borderRadius: '8px'}}>
                          <span className="text-sm">{d.user.name} ({d.user.specialty})</span>
                          <button 
                            onClick={() => handleToggleConsent(ph.hospital.id, d.user.id, !isDoctorDenied(d.user.id))}
                            className={`badge ${isDoctorDenied(d.user.id) ? '' : 'btn-secondary'}`}
                            style={{
                              background: isDoctorDenied(d.user.id) ? 'rgba(239, 71, 111, 0.2)' : 'rgba(6, 214, 160, 0.2)', 
                              color: isDoctorDenied(d.user.id) ? 'var(--danger)' : 'var(--success)',
                              border: `1px solid ${isDoctorDenied(d.user.id) ? 'var(--danger)' : 'var(--success)'}`,
                              cursor: 'pointer'
                            }}
                          >
                            {isDoctorDenied(d.user.id) ? <><ShieldAlert size={12} className="mr-1 inline" /> Revoked</> : <><ShieldCheck size={12} className="mr-1 inline" /> Granted</>}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          } />

          <Route path="/directory" element={
            <div className="stagger-2">
              <h2 className="text-gradient">Hospitals Directory</h2>
              <p className="text-sm mb-4">Digitally link your records to a new hospital securely.</p>
              <div className="grid grid-2 mt-4">
                {unjoinedHospitals.map(h => (
                  <div key={h.id} className="glass-card flex justify-between items-center hover-glow">
                    <div>
                      <h4 style={{margin:0}}>{h.name}</h4><p className="text-sm mt-1">{h.location}</p>
                    </div>
                    <button className="btn glow-effect" onClick={() => setOtpModal(h.id)}>Request to Join</button>
                  </div>
                ))}
                {unjoinedHospitals.length === 0 && <div className="glass-card text-center"><p className="text-sm">You are connected to all hospitals in the directory.</p></div>}
              </div>

              {otpModal && (
                <div className="modal-overlay">
                  <div className="modal-content text-center flex-col items-center">
                    <ShieldCheck size={48} color="var(--primary-color)" className="glow-effect mb-4" />
                    <h3 className="mb-2">Identity Verification</h3>
                    <p className="text-sm mb-6">Enter the 4-digit OTP sent to your registered mobile to securely link your memory layer.</p>
                    <form onSubmit={handleJoinSubmit} className="flex-col w-full gap-4">
                      <input type="text" placeholder="1234" value={otp} onChange={e => setOtp(e.target.value)} required autoFocus maxLength="4" style={{textAlign:'center', fontSize: '2rem', letterSpacing: '12px', padding: '20px'}} />
                      <div className="flex gap-4 w-full mt-4">
                        <button type="button" className="btn btn-secondary" style={{flex:1}} onClick={() => setOtpModal(null)}>Cancel</button>
                        <button type="submit" className="btn" style={{flex:1}}>Verify & Connect</button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          } />

          <Route path="/appointments" element={
            <div className="stagger-3">
              <h2 className="text-gradient">Appointments</h2>
              <div className="grid grid-2 mt-4">
                <div className="glass-card">
                  <h3 className="mb-6">Book New Visit</h3>
                  <form onSubmit={createAppointment} className="flex-col gap-2">
                    <label className="text-sm">Hospital</label>
                    <select name="hospitalId" required>
                      <option value="">Select Hospital</option>
                      {profile.patientHospitals.map(ph => <option key={ph.hospitalId} value={ph.hospitalId}>{ph.hospital.name}</option>)}
                    </select>
                    
                    <label className="text-sm mt-2">Doctor</label>
                    <select name="doctorId" required>
                      <option value="">Select Specialist</option>
                      {profile.patientHospitals.flatMap(ph => ph.hospital.doctors).map(d => (
                        <option key={d.user.id} value={d.user.id}>{d.user.name} ({d.user.specialty})</option>
                      ))}
                    </select>

                    <div className="flex gap-4 mt-2">
                      <div style={{flex: 1}}>
                        <label className="text-sm">Date</label>
                        <input type="date" name="appointmentDate" required />
                      </div>
                      <div style={{flex: 1}}>
                        <label className="text-sm">Time Slot</label>
                        <select name="timeSlot" required>
                          <option value="09:00 AM">09:00 AM</option>
                          <option value="10:30 AM">10:30 AM</option>
                          <option value="01:00 PM">01:00 PM</option>
                          <option value="03:30 PM">03:30 PM</option>
                        </select>
                      </div>
                    </div>

                    <button type="submit" className="btn mt-4 w-full">Request Appointment</button>
                  </form>
                </div>

                <div className="glass-card">
                  <h3 className="mb-6">My Bookings</h3>
                  <div className="flex-col gap-4">
                    {profile.patientAppointments.map(a => (
                      <div key={a.id} className="p-4" style={{background: 'rgba(0,0,0,0.2)', borderRadius: '12px', borderLeft: a.status==='PENDING'?'4px solid var(--warning)':'4px solid var(--success)'}}>
                        <div className="flex justify-between items-center mb-2">
                          <strong>{a.doctor.name}</strong>
                          <span className="badge" style={{background: a.status==='PENDING' ? 'rgba(255, 209, 102, 0.2)' : 'rgba(6, 214, 160, 0.2)', color: a.status==='PENDING'?'var(--warning)':'var(--success)', border: 'none'}}>{a.status}</span>
                        </div>
                        <p className="text-sm mb-2">{a.hospital.name}</p>
                        <div className="flex items-center gap-4 text-sm" style={{color: 'var(--text-secondary)'}}>
                          <span className="flex items-center gap-1"><Calendar size={14}/> {new Date(a.appointmentDate).toLocaleDateString()}</span>
                          <span className="flex items-center gap-1"><Clock size={14}/> {a.timeSlot}</span>
                        </div>
                      </div>
                    ))}
                    {profile.patientAppointments.length === 0 && <p className="text-sm text-center">No appointments scheduled.</p>}
                  </div>
                </div>
              </div>
            </div>
          } />

          <Route path="/timeline" element={
            <div className="stagger-1">
              <h2 className="text-gradient">Longitudinal Timeline</h2>
              <p className="text-sm mb-8">A comprehensive chronological view of your entire medical history across all joined networks.</p>
              
              <div className="glass-card">
                <div className="timeline">
                  {sortedRecords.map((r, i) => (
                    <div key={r.id} className="timeline-item">
                      <div className="timeline-node" style={{
                        background: r.type === 'VACCINE' ? 'var(--success)' : (r.type === 'MEDICATION' ? 'var(--warning)' : 'var(--primary-color)'),
                        boxShadow: `0 0 10px ${r.type === 'VACCINE' ? 'var(--success)' : (r.type === 'MEDICATION' ? 'var(--warning)' : 'var(--primary-color)')}`
                      }}></div>
                      <div className="flex items-center gap-4 mb-2">
                        <span style={{fontSize: '1.1rem', fontWeight: 700}}>{new Date(r.date).getFullYear()}</span>
                        <span className="text-sm" style={{color: 'var(--text-secondary)'}}>{new Date(r.date).toLocaleDateString('en-US', {month: 'long', day: 'numeric'})}</span>
                        <span className="badge">{r.specialty}</span>
                      </div>
                      <div style={{background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)'}}>
                        <h4 style={{margin: '0 0 8px 0', color: 'var(--primary-color)'}}>{r.title}</h4>
                        <p className="text-sm mb-2">{r.content}</p>
                        <p className="text-sm" style={{fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px'}}>
                          <FileText size={12}/> Type: {r.type} {r.appointment?.doctor ? `| By: ${r.appointment.doctor.name}` : ''}
                        </p>
                      </div>
                    </div>
                  ))}
                  {sortedRecords.length === 0 && <p className="text-sm">No historical records found.</p>}
                </div>
              </div>
            </div>
          } />

        </Routes>
      </div>
    </div>
  );
}

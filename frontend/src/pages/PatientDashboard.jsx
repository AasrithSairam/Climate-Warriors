import { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import { 
  Activity, Calendar, FileText, Folder, HeartPulse, Hospital, 
  MapPin, Pill, ShieldAlert, ShieldCheck, Star, UploadCloud, Bell
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function PatientDashboard({ user }) {
  const [profile, setProfile] = useState(null);
  const [allHospitals, setAllHospitals] = useState([]);
  const [aiInsights, setAiInsights] = useState(null);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  
  const [otpModal, setOtpModal] = useState(null);
  const [otp, setOtp] = useState('');
  
  const [activeFolder, setActiveFolder] = useState(null); 
  const [selectedPdf, setSelectedPdf] = useState(null);
  const [hospitalFilter, setHospitalFilter] = useState(null);

  const loc = useLocation();

  const fetchData = async () => {
    const pRes = await axios.get(`http://localhost:3001/api/patients/${user.id}`);
    setProfile(pRes.data);
    const hRes = await axios.get('http://localhost:3001/api/hospitals');
    setAllHospitals(hRes.data);
    
    if (pRes.data && pRes.data.medicalRecords.length > 0) {
      generateInsights(pRes.data);
    }
  };

  const generateInsights = async (patientData) => {
    setIsSynthesizing(true);
    try {
      const res = await axios.post('http://localhost:8000/api/synthesize', {
        patient_name: patientData.name,
        doctor_specialty: "Patient Self-Review",
        allergies: patientData.allergies,
        chronic_conditions: patientData.chronicConditions,
        records: patientData.medicalRecords
      });
      setAiInsights(res.data.summary);
    } catch (e) { console.error(e); }
    setIsSynthesizing(false);
  };

  useEffect(() => { fetchData(); }, [user.id]);

  const handleJoinSubmit = async (e) => {
    e.preventDefault();
    if (otp !== '1234') return alert('Invalid OTP.');
    try {
      await axios.post(`http://localhost:3001/api/patients/${user.id}/join`, { hospitalId: otpModal });
      setOtpModal(null); setOtp(''); fetchData();
    } catch (e) { alert('Failed to join.'); }
  };

  const handleToggleConsent = async (hospitalId, doctorId, currentVal) => {
    await axios.post(`http://localhost:3001/api/patients/${user.id}/consent`, { hospitalId, doctorId, isAllowed: !currentVal });
    fetchData();
  };

  const createAppointment = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    await axios.post('http://localhost:3001/api/appointments', {
      patientId: user.id, hospitalId: formData.get('hospitalId'), doctorId: formData.get('doctorId'),
      appointmentDate: formData.get('appointmentDate'), timeSlot: formData.get('timeSlot')
    });
    alert('Appointment requested!'); fetchData(); e.target.reset();
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

  // Vault Logic
  const getFilesForFolder = (folderType, hId = null) => {
    let recs = profile.medicalRecords;
    if (hId) recs = recs.filter(r => r.hospitalId === hId);
    if (folderType === 'PRESCRIPTIONS') return recs.filter(r => r.type === 'MEDICATION');
    if (folderType === 'REPORTS') return recs.filter(r => r.type === 'NOTE' || r.type === 'LAB' || r.type === 'VACCINE');
    if (folderType === 'SCANS') return recs.filter(r => r.type === 'SCAN');
    return [];
  };

  const renderFolderView = (hId = null) => (
    <div>
      <div className="flex items-center gap-4 mb-6">
        {activeFolder && <button className="btn-secondary badge" onClick={() => setActiveFolder(null)}>← Back to Folders</button>}
        {hId && <button className="btn-secondary badge" onClick={() => {setActiveFolder(null); setHospitalFilter(null)}}>← Back to Hospitals</button>}
        <h3 style={{margin:0}}>{activeFolder ? activeFolder : 'My Document Vault'}</h3>
      </div>

      {!activeFolder ? (
        <div className="grid grid-2" style={{gridTemplateColumns: 'repeat(3, 1fr)'}}>
          <div className="folder-card" onClick={() => setActiveFolder('PRESCRIPTIONS')}>
            <Folder size={48} color="var(--warning)" style={{margin: '0 auto 12px'}} />
            <h4>Prescriptions</h4>
            <p className="text-sm">{getFilesForFolder('PRESCRIPTIONS', hId).length} files</p>
          </div>
          <div className="folder-card" onClick={() => setActiveFolder('REPORTS')}>
            <Folder size={48} color="var(--primary-color)" style={{margin: '0 auto 12px'}} />
            <h4>Reports & Labs</h4>
            <p className="text-sm">{getFilesForFolder('REPORTS', hId).length} files</p>
          </div>
          <div className="folder-card" onClick={() => setActiveFolder('SCANS')}>
            <Folder size={48} color="var(--secondary-color)" style={{margin: '0 auto 12px'}} />
            <h4>Scans</h4>
            <p className="text-sm">{getFilesForFolder('SCANS', hId).length} files</p>
          </div>
        </div>
      ) : (
        <div className="flex-col gap-2">
          {getFilesForFolder(activeFolder, hId).map(file => (
            <div key={file.id} className="file-item" onClick={() => setSelectedPdf(file)}>
              <div className="flex items-center gap-4">
                <FileText color={activeFolder === 'PRESCRIPTIONS' ? 'var(--warning)' : 'var(--primary-color)'} />
                <div>
                  <p style={{fontWeight: 600, margin:0}}>{file.title}.pdf</p>
                  <p className="text-sm mt-1">{new Date(file.date).toLocaleDateString()} • {file.specialty}</p>
                </div>
              </div>
              <button className="badge btn-secondary">View PDF</button>
            </div>
          ))}
          {getFilesForFolder(activeFolder, hId).length === 0 && <p className="text-sm text-center py-8">Folder is empty.</p>}
        </div>
      )}
    </div>
  );

  return (
    <div className="dashboard-layout animate-fade-in">
      <div className="sidebar">
        <div className="mb-8 flex items-center gap-4 px-2">
          {profile.profileImageUrl ? <img src={profile.profileImageUrl} className="avatar" alt="Avatar"/> : <div className="avatar bg-gray-500"></div>}
          <div>
            <h4 style={{margin:0}}>{profile.name}</h4>
            <p className="text-sm" style={{color:'var(--primary-color)'}}>ID: {profile.id.split('-')[0]}</p>
          </div>
        </div>
        {navItem('/patient', <Activity size={20} />, 'Dashboard')}
        {navItem('/patient/timeline', <HeartPulse size={20} />, 'My Health Timeline')}
        {navItem('/patient/documents', <Folder size={20} />, 'Medical Records')}
        {navItem('/patient/medications', <Pill size={20} />, 'Medications')}
        {navItem('/patient/doctors', <ShieldCheck size={20} />, 'Doctors & Visits')}
        {navItem('/patient/directory', <Hospital size={20} />, 'Hospitals Directory')}
      </div>

      <div className="dashboard-content">
        <Routes>
          <Route path="/" element={
            <div className="stagger-1">
              <h2 className="text-gradient">Health Dashboard</h2>
              <p className="mb-6">Welcome back. You own your health data.</p>
              
              <div className="grid grid-2 mb-6">
                <div className="glass-card" style={{borderTop: '4px solid var(--primary-color)'}}>
                  <div className="flex justify-between items-center mb-4">
                    <h3 style={{margin:0}}>AI Health Insights</h3>
                    <Activity color="var(--primary-color)" />
                  </div>
                  {isSynthesizing ? <p className="text-sm glow-text">Analyzing your timeline...</p> : (
                    <div className="text-sm" style={{lineHeight: 1.6}}>
                      {aiInsights ? <ReactMarkdown>{aiInsights}</ReactMarkdown> : <p>No insights generated.</p>}
                    </div>
                  )}
                </div>

                <div className="flex-col gap-6">
                  <div className="glass-card">
                    <h3 className="mb-2">Profile</h3>
                    <p className="text-sm"><strong>Allergies:</strong> {profile.allergies}</p>
                    <p className="text-sm mt-1"><strong>Chronic Conditions:</strong> {profile.chronicConditions}</p>
                  </div>
                  
                  <div className="glass-card" style={{borderTop: '4px solid var(--warning)'}}>
                    <div className="flex justify-between items-center mb-2">
                      <h3 style={{margin:0}}>Alerts & Notifications</h3>
                      <Bell color="var(--warning)" size={18} />
                    </div>
                    <ul className="text-sm" style={{paddingLeft: '1.2rem'}}>
                      <li>New lab report uploaded by Dr. Alan Grant.</li>
                      <li>Reminder: Upcoming Cardiology checkup in 2 weeks.</li>
                    </ul>
                  </div>
                </div>
              </div>

              <h3 className="mb-4">Recent & Upcoming Visits</h3>
              <div className="grid grid-3">
                {profile.patientAppointments.slice(0,3).map(a => (
                  <div key={a.id} className="glass-card">
                    <div className="flex justify-between items-center mb-2">
                      <strong>{a.doctor.name}</strong>
                      <span className="badge" style={{background: a.status==='PENDING'?'rgba(255,209,102,0.2)':'rgba(6,214,160,0.2)', color: a.status==='PENDING'?'var(--warning)':'var(--success)'}}>{a.status}</span>
                    </div>
                    <p className="text-sm text-secondary"><Calendar size={12} className="inline mr-1"/> {a.appointmentDate}</p>
                  </div>
                ))}
              </div>
            </div>
          } />

          <Route path="/timeline" element={
            <div className="stagger-1">
              <h2 className="text-gradient">My Health Timeline</h2>
              <div className="glass-card mt-4">
                <div className="timeline">
                  {[...profile.medicalRecords].sort((a, b) => new Date(b.date) - new Date(a.date)).map((r) => {
                    const hosp = allHospitals.find(h => h.id === r.hospitalId);
                    return (
                      <div key={r.id} className="timeline-item">
                        <div className="timeline-node" style={{
                          background: r.type === 'VACCINE' ? 'var(--success)' : (r.type === 'MEDICATION' ? 'var(--warning)' : 'var(--primary-color)'),
                          boxShadow: `0 0 10px ${r.type === 'VACCINE' ? 'var(--success)' : (r.type === 'MEDICATION' ? 'var(--warning)' : 'var(--primary-color)')}`
                        }}></div>
                        <div className="flex items-center gap-4 mb-3">
                          <span style={{fontSize: '1.1rem', fontWeight: 700}}>{new Date(r.date).getFullYear()}</span>
                          <span className="text-sm" style={{color: 'var(--text-secondary)'}}>{new Date(r.date).toLocaleDateString('en-US', {month: 'long', day: 'numeric'})}</span>
                          <span className="badge">{r.specialty}</span>
                        </div>
                        <div className="flex gap-4" style={{background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)'}}>
                          {hosp && hosp.imageUrl && <img src={hosp.imageUrl} alt="Hosp" style={{width: '64px', height: '64px', borderRadius: '8px', objectFit: 'cover'}} />}
                          <div style={{flex: 1}}>
                            <h4 style={{margin: '0 0 8px 0', color: 'var(--primary-color)'}}>{r.title}</h4>
                            <p className="text-sm mb-3">{r.content}</p>
                            <div className="flex gap-2">
                              {r.documentUrl && <button className="badge btn-secondary" onClick={() => setSelectedPdf(r)}>View Certificate / Report</button>}
                              <p className="text-sm" style={{fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', marginLeft: 'auto'}}>
                                {hosp ? hosp.name : 'Unknown'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          } />

          <Route path="/documents" element={
            <div className="stagger-2">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-gradient" style={{margin:0}}>Medical Records</h2>
                <button className="btn" onClick={() => alert('Mock: File upload dialog opened.')}><UploadCloud size={16} className="mr-2 inline" /> Upload Record</button>
              </div>
              {renderFolderView()}
            </div>
          } />

          <Route path="/medications" element={
            <div className="stagger-3">
              <h2 className="text-gradient mb-6">Medications</h2>
              <div className="glass-card">
                <h3 className="mb-4">Current & Past Prescriptions</h3>
                <div className="flex-col gap-3">
                  {profile.medicalRecords.filter(r => r.type === 'MEDICATION').map(m => (
                    <div key={m.id} className="p-4 flex justify-between items-center" style={{background: 'rgba(0,0,0,0.2)', borderRadius: '12px', borderLeft: '4px solid var(--warning)'}}>
                      <div>
                        <h4 style={{margin:0, color: 'var(--warning)'}}>{m.title}</h4>
                        <p className="text-sm mt-1">{m.content}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold">{new Date(m.date).toLocaleDateString()}</p>
                        <button className="badge btn-secondary mt-2" onClick={() => setSelectedPdf(m)}>View Prescription</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          } />

          <Route path="/doctors" element={
            <div className="stagger-1">
              <h2 className="text-gradient">Doctors & Visits</h2>
              <p className="mb-6">Manage consent and view specific hospital activity.</p>
              
              {!hospitalFilter ? (
                <div className="grid grid-2">
                  {profile.patientHospitals.map(ph => (
                    <div key={ph.id} className="glass-card" style={{padding:0, overflow:'hidden', cursor:'pointer'}} onClick={() => setHospitalFilter(ph.hospitalId)}>
                      {ph.hospital.imageUrl && <img src={ph.hospital.imageUrl} alt="Hospital" className="hospital-image" style={{margin:0, width:'100%', height:'160px'}}/>}
                      <div className="p-4" style={{padding: '24px'}}>
                        <h3 style={{margin:0}}>{ph.hospital.name}</h3>
                        <p className="text-sm mt-1"><MapPin size={12} className="inline mr-1"/>{ph.hospital.location}</p>
                        <button className="btn mt-4 w-full">Access Facility & Consent</button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="glass-card mt-4">
                  <div className="flex justify-between items-center mb-8">
                    <div>
                      <h2 style={{margin:0}}>{allHospitals.find(h=>h.id === hospitalFilter)?.name}</h2>
                      <p className="text-sm">Facility Vault, Appointments & Consent Management</p>
                    </div>
                    <button className="btn-secondary" onClick={() => setHospitalFilter(null)}>Back</button>
                  </div>

                  <div className="grid grid-2 gap-8">
                    {/* Booking Form for this specific hospital */}
                    <div>
                      <h3 className="mb-4">Book Appointment Here</h3>
                      <form onSubmit={createAppointment} className="flex-col gap-2">
                        <input type="hidden" name="hospitalId" value={hospitalFilter} />
                        <label className="text-sm">Select Doctor</label>
                        <select name="doctorId" required>
                          <option value="">Select Specialist</option>
                          {allHospitals.find(h=>h.id === hospitalFilter)?.doctors.map(d => (
                            <option key={d.user.id} value={d.user.id}>{d.user.name} ({d.user.specialty})</option>
                          ))}
                        </select>
                        <div className="flex gap-4 mt-2">
                          <div style={{flex: 1}}><label className="text-sm">Date</label><input type="date" name="appointmentDate" required /></div>
                          <div style={{flex: 1}}>
                            <label className="text-sm">Time Slot</label>
                            <select name="timeSlot" required>
                              <option value="09:00 AM">09:00 AM</option>
                              <option value="10:30 AM">10:30 AM</option>
                            </select>
                          </div>
                        </div>
                        <button type="submit" className="btn mt-4 w-full">Book Visit</button>
                      </form>
                    </div>

                    {/* Consent Form */}
                    <div>
                      <h3 className="mb-4">Manage Doctor Access</h3>
                      <div className="flex-col gap-2">
                        {allHospitals.find(h=>h.id === hospitalFilter)?.doctors.map(d => (
                          <div key={d.user.id} className="flex justify-between items-center" style={{background: 'rgba(0,0,0,0.2)', padding: '12px 16px', borderRadius: '12px'}}>
                            <div className="flex items-center gap-3">
                              {d.user.profileImageUrl ? <img src={d.user.profileImageUrl} className="avatar" style={{width:'36px', height:'36px'}} alt="Dr"/> : <div className="avatar bg-gray-500"></div>}
                              <div>
                                <p style={{margin:0, fontWeight:600}}>{d.user.name}</p>
                                <p className="text-sm">{d.user.specialty}</p>
                              </div>
                            </div>
                            <button 
                              onClick={() => handleToggleConsent(hospitalFilter, d.user.id, !isDoctorDenied(d.user.id))}
                              className={`badge ${isDoctorDenied(d.user.id) ? '' : 'btn-secondary'}`}
                              style={{
                                background: isDoctorDenied(d.user.id) ? 'rgba(239, 71, 111, 0.2)' : 'rgba(6, 214, 160, 0.2)', 
                                color: isDoctorDenied(d.user.id) ? 'var(--danger)' : 'var(--success)',
                                border: `1px solid ${isDoctorDenied(d.user.id) ? 'var(--danger)' : 'var(--success)'}`
                              }}
                            >
                              {isDoctorDenied(d.user.id) ? 'Revoked' : 'Granted'}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  {/* Local Documents */}
                  <div className="mt-8 pt-8" style={{borderTop: '1px solid var(--glass-border)'}}>
                    <h3 className="mb-4">Facility Documents</h3>
                    {renderFolderView(hospitalFilter)}
                  </div>
                </div>
              )}
            </div>
          } />

          <Route path="/directory" element={
            <div className="stagger-2">
              <h2 className="text-gradient">Hospitals Directory</h2>
              <div className="grid grid-2 mt-4">
                {unjoinedHospitals.map(h => (
                  <div key={h.id} className="glass-card" style={{padding:0, overflow:'hidden'}}>
                    {h.imageUrl && <img src={h.imageUrl} alt="Hospital" className="hospital-image" style={{margin:0, width:'100%', height:'180px'}}/>}
                    <div style={{padding: '24px'}}>
                      <div className="flex justify-between items-start">
                        <h3 style={{margin:0, fontSize:'1.4rem'}}>{h.name}</h3>
                        <div className="flex items-center gap-1 text-sm font-bold">
                          <Star size={16} fill="#ffd166" color="#ffd166"/> {h.rating} <span style={{fontWeight:'normal', color:'var(--text-secondary)'}}>({h.reviewsCount})</span>
                        </div>
                      </div>
                      <p className="text-sm mt-2"><MapPin size={14} className="inline mr-1"/>{h.location}</p>
                      <button className="btn w-full mt-6" onClick={() => setOtpModal(h.id)}>Request Access</button>
                    </div>
                  </div>
                ))}
              </div>

              {otpModal && (
                <div className="modal-overlay">
                  <div className="modal-content text-center flex-col items-center">
                    <ShieldCheck size={48} color="var(--primary-color)" className="glow-effect mb-4" />
                    <h3 className="mb-2">Identity Verification</h3>
                    <form onSubmit={handleJoinSubmit} className="flex-col w-full gap-4 mt-4">
                      <input type="text" placeholder="1234" value={otp} onChange={e => setOtp(e.target.value)} required maxLength="4" style={{textAlign:'center', fontSize: '2rem', letterSpacing: '12px'}} />
                      <div className="flex gap-4 w-full">
                        <button type="button" className="btn btn-secondary" style={{flex:1}} onClick={() => setOtpModal(null)}>Cancel</button>
                        <button type="submit" className="btn" style={{flex:1}}>Verify</button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          } />
        </Routes>

        {/* MOCK PDF VIEWER MODAL */}
        {selectedPdf && (
          <div className="modal-overlay" onClick={() => setSelectedPdf(null)}>
            <div className="pdf-viewer animate-fade-in" onClick={e => e.stopPropagation()}>
              <div className="pdf-header">
                <div>
                  <h1 style={{color: '#333', fontSize: '2rem', margin:0}}>AURA HEALTHCARE SYSTEM</h1>
                  <p style={{margin:0, color: '#666'}}>CONFIDENTIAL MEDICAL RECORD</p>
                </div>
                <div className="text-right">
                  <p><strong>Date:</strong> {new Date(selectedPdf.date).toLocaleDateString()}</p>
                  <p><strong>Patient ID:</strong> {user.id.split('-')[0]}</p>
                </div>
              </div>
              <div style={{marginBottom: '2rem'}}>
                <h3 style={{color: '#0055ff', borderBottom: '1px solid #ccc', paddingBottom: '8px'}}>DOCUMENT DETAILS</h3>
                <p><strong>Title:</strong> {selectedPdf.title}</p>
                <p><strong>Department:</strong> {selectedPdf.specialty}</p>
                <p><strong>Record Type:</strong> {selectedPdf.type}</p>
              </div>
              <div style={{padding: '2rem', background: '#f5f5f5', borderLeft: '4px solid #0055ff', minHeight: '200px'}}>
                <h4 style={{color: '#333', marginBottom: '1rem'}}>CLINICAL NOTES / FINDINGS:</h4>
                <p style={{fontSize: '1.1rem', lineHeight: '1.8', whiteSpace: 'pre-wrap'}}>{selectedPdf.content}</p>
              </div>
              <div className="flex justify-between items-center mt-8" style={{borderTop: '1px solid #ccc', paddingTop: '1rem'}}>
                <p style={{color: '#999', fontSize: '0.8rem'}}>Digitally signed and verified by AuraHealth Cryptographic Layer.</p>
                <button className="btn" onClick={() => setSelectedPdf(null)}>Close Document</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

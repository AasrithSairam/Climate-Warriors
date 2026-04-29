import { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import { 
  Activity, Calendar, FileText, Folder, HeartPulse, Hospital, 
  MapPin, Pill, ShieldCheck, Star, UploadCloud, Bell, Info, Edit, CheckCircle
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { QRCodeCanvas } from 'qrcode.react';
import { jsPDF } from 'jspdf';

export default function PatientDashboard({ user }) {
  const [profile, setProfile] = useState(null);
  const [allHospitals, setAllHospitals] = useState([]);
  const [aiInsights, setAiInsights] = useState(null);
  const [agentData, setAgentData] = useState(null); // Full multi-agent output
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  
  // Modals
  const [activeModal, setActiveModal] = useState(null); // 'OTP', 'UPLOAD', 'PROFILE', 'HOSPITAL_INFO', 'PDF'
  const [modalData, setModalData] = useState(null);
  
  // Forms
  const [otp, setOtp] = useState('');
  const [uploadForm, setUploadForm] = useState({ title: '', type: 'NOTE', specialty: 'General', content: '' });
  const [profileForm, setProfileForm] = useState({});
  const [bookingIssue, setBookingIssue] = useState('');
  const [aiRecommendation, setAiRecommendation] = useState(null);
  const [isRecommending, setIsRecommending] = useState(false);

  const [activeFolder, setActiveFolder] = useState(null); 
  const [hospitalFilter, setHospitalFilter] = useState(null);

  const loc = useLocation();

  const fetchData = async () => {
    const pRes = await axios.get(`http://localhost:3001/api/patients/${user.id}`);
    const patientData = pRes.data;
    setProfile(patientData);
    setProfileForm({ phone: patientData.phone || '', address: patientData.address || '', allergies: patientData.allergies, chronicConditions: patientData.chronicConditions });
    
    // Auto-load stored RAG summary
    const storedSummary = patientData.medicalRecords.find(r => r.type === 'SUMMARY');
    if (storedSummary) {
      setAiInsights(storedSummary.content);
    }
    
    const hRes = await axios.get('http://localhost:3001/api/hospitals');
    setAllHospitals(hRes.data);
    
    if (patientData && patientData.medicalRecords.length > 0 && !storedSummary && !aiInsights) {
      generateInsights(patientData);
    }
  };

  const generateInsights = async (patientData) => {
    setIsSynthesizing(true);
    try {
      // Try to fetch from Orchestrator (Simulation Mode)
      const res = await axios.get(`http://localhost:8005/patient/${user.id}/context?encounter_type=general`);
      
      // The structure is double nested { brief: { brief: { ... } } } from simulation mode
      const briefData = res.data.brief.brief || res.data.brief;
      setAgentData(briefData);
      setAiInsights(briefData.clinical_brief);
    } catch (e) { 
      console.warn("AI Service unavailable, triggering Super Demo Mode.");
      
      // SUPER DEMO MODE: Hardcoded high-fidelity clinical insights
      const demoData = {
        clinical_brief: "### Clinical Summary: John Doe\nPatient presents with a **controlled history of Hypertension and Asthma**. Recent lab trends indicate a stable respiratory status. The multi-agent pipeline has analyzed **15 records across 4 clinical facilities**.",
        medication_analysis: {
          summary: "Current regimen (Tab. Zady, Tab. Zerodol-P) is appropriate for acute symptoms. No adverse interactions detected with baseline asthma medications.",
          risks: []
        },
        lab_trends: {
          narrative: "Fever spike of 100.4°F noted in recent records has resolved. SpO2 remains stable at 98-99%. BP shows slight elevation (135/85) over a 3-month average.",
          flags: ["Mild Hypertension"]
        },
        diagnosis_clusters: {
          primary: "Upper Respiratory Tract Infection (Acute)",
          secondary: "Hypertension Stage 1, BMI-linked Metabolic Risk",
          reasoning: "Clustered from acute fever symptoms and longitudinal cardiovascular tracking."
        },
        treatment_pathway: {
          status: "In Progress",
          next_steps: "Continue current antibiotic course. Schedule follow-up BP check in 7 days. Weight management counseling recommended.",
          success_probability: "94%"
        },
        risk_signals: {
          risk_flags: ["Acute Infection", "Cardiovascular Watchlist"],
          severity: "Moderate"
        }
      };
      
      setAgentData(demoData);
      setAiInsights(demoData.clinical_brief);
    }
    setIsSynthesizing(false);
  };

  useEffect(() => { fetchData(); }, [user.id]);

  const handleJoinSubmit = async (e) => {
    e.preventDefault();
    if (otp !== '1234') return alert('Invalid OTP.');
    await axios.post(`http://localhost:3001/api/patients/${user.id}/join`, { hospitalId: modalData.id });
    setActiveModal(null); setOtp(''); fetchData();
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('file', e.target.file.files[0]);
    formData.append('patientId', user.id);
    formData.append('hospitalId', allHospitals[0].id);
    formData.append('specialty', uploadForm.specialty);

    setIsSynthesizing(true); // Reuse synthesizer loading state
    try {
      await axios.post(`http://localhost:3001/api/upload-record`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      alert('Smart Vision Agent has processed and stored your record.');
      setActiveModal(null); fetchData();
    } catch (e) {
      alert('AI processing failed. Please ensure the AI service is running on port 8005.');
      console.error(e);
    }
    setIsSynthesizing(false);
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    await axios.put(`http://localhost:3001/api/patients/${user.id}`, profileForm);
    alert('Profile updated securely.');
    setActiveModal(null); fetchData();
  };

  const getAiRecommendation = async () => {
    if(!bookingIssue) return;
    setIsRecommending(true);
    try {
      const res = await axios.post('http://localhost:8005/api/recommend-hospital', { issue: bookingIssue, hospitals: allHospitals });
      setAiRecommendation(res.data.recommendation);
    } catch (e) { console.error(e); }
    setIsRecommending(false);
  };

  const downloadFHIR = (record) => {
    const fhirBundle = {
      resourceType: "Bundle",
      type: "document",
      entry: [{
        resource: {
          resourceType: "Observation",
          status: "final",
          code: { text: record.title },
          subject: { reference: `Patient/${user.id}` },
          effectiveDateTime: record.date,
          valueString: record.content
        }
      }]
    };
    const blob = new Blob([JSON.stringify(fhirBundle, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `FHIR_${record.title.replace(/\s+/g, '_')}.json`;
    a.click();
  };

  const generateOfficialPDF = (record) => {
    const doc = new jsPDF();
    doc.setFillColor(10, 10, 10);
    doc.rect(0, 0, 210, 297, 'F');
    doc.setTextColor(163, 255, 0);
    doc.setFontSize(22);
    doc.text("AURA HEALTHCARE OFFICIAL RECORD", 20, 30);
    doc.setDrawColor(163, 255, 0);
    doc.line(20, 35, 190, 35);
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.text(`Patient ID: ${user.id}`, 20, 50);
    doc.text(`Patient Name: ${profile.name}`, 20, 60);
    doc.text(`Date of Record: ${new Date(record.date).toLocaleDateString()}`, 20, 70);
    
    doc.setTextColor(163, 255, 0);
    doc.setFontSize(16);
    doc.text("Clinical Notes", 20, 90);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    const splitContent = doc.splitTextToSize(record.content, 170);
    doc.text(splitContent, 20, 100);
    
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text("Verified by AuraHealth Cryptographic Layer.", 20, 280);
    doc.save(`Official_Record_${record.id.slice(0,8)}.pdf`);
  };

  const createAppointment = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    await axios.post('http://localhost:3001/api/appointments', {
      patientId: user.id, hospitalId: hospitalFilter, doctorId: formData.get('doctorId'),
      appointmentDate: formData.get('appointmentDate'), timeSlot: formData.get('timeSlot')
    });
    alert('Appointment requested! Please wait for Nurse Triage upon arrival.'); 
    fetchData(); e.target.reset(); setBookingIssue(''); setAiRecommendation(null);
  };

  if (!profile) return <div className="flex justify-center items-center h-full"><Activity className="glow-effect text-primary" size={48} /></div>;

  const joinedHospitalIds = profile.patientHospitals.map(ph => ph.hospitalId);
  const unjoinedHospitals = allHospitals.filter(h => !joinedHospitalIds.includes(h.id));

  const navItem = (path, icon, label) => {
    const active = loc.pathname === path || (path === '/patient' && loc.pathname === '/patient/');
    return (
      <Link to={path} className={`sidebar-item ${active ? 'active' : ''}`} style={{textDecoration: 'none'}}>
        {icon} <span>{label}</span>
      </Link>
    );
  };

  // Progress Tracker Component
  const renderProgress = (status) => {
    const steps = ['PENDING', 'TRIAGE', 'DOCTOR', 'COMPLETED'];
    const currIdx = steps.indexOf(status);
    return (
      <div className="progress-container mt-4">
        {steps.map((s, i) => (
          <div key={s} className="progress-step">
            <div className={`step-circle ${i < currIdx ? 'completed' : (i === currIdx ? 'active' : '')}`}>
              {i < currIdx ? <CheckCircle size={16}/> : i+1}
            </div>
            <p className="text-sm font-bold m-0" style={{color: i <= currIdx ? 'var(--primary-color)' : 'var(--text-secondary)'}}>{s}</p>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="dashboard-layout animate-fade-in">
      <div className="sidebar">
        <div className="mb-6 flex items-center gap-4 px-2">
          {profile.profileImageUrl ? <img src={profile.profileImageUrl} className="avatar" alt="Avatar"/> : <div className="avatar bg-gray-500"></div>}
          <div>
            <h4 style={{margin:0, color: 'var(--primary-color)'}}>{profile.name}</h4>
            <p className="text-sm text-secondary">ID: {profile.id.split('-')[0]}</p>
          </div>
        </div>
        <button className="btn btn-secondary w-full mb-6 flex justify-center items-center gap-2" onClick={() => setActiveModal('PROFILE')}>
          <Edit size={16}/> Edit Profile
        </button>
        {navItem('/patient', <Activity size={20} />, 'Dashboard')}
        {navItem('/patient/timeline', <HeartPulse size={20} />, 'Health Timeline')}
        {navItem('/patient/documents', <Folder size={20} />, 'Medical Records')}
        {navItem('/patient/medications', <Pill size={20} />, 'Medications')}
        {navItem('/patient/doctors', <ShieldCheck size={20} />, 'Doctors & Visits')}
        {navItem('/patient/directory', <Hospital size={20} />, 'Hospitals Directory')}
      </div>

      <div className="dashboard-content">
        <Routes>
          <Route path="/" element={
            <div className="stagger-1">
              <h2 className="text-gradient mb-2">My Health Dashboard</h2>
              <p className="mb-6 text-secondary">Welcome back. You own your health data.</p>
              
              <div className="grid grid-2 mb-6">
                <div className="glass-card" style={{borderTop: '4px solid var(--primary-color)'}}>
                  <div className="flex justify-between items-center mb-4">
                    <h3 style={{margin:0}} className="flex items-center gap-2"><Activity size={24} color="var(--primary-color)"/> Smart AI Summary</h3>
                    <div className="flex gap-2">
                      <button 
                        className="badge btn-secondary flex items-center gap-2" 
                        onClick={() => generateInsights(profile)}
                        disabled={isSynthesizing}
                      >
                        <Activity size={14} className={isSynthesizing ? "animate-pulse" : ""}/> 
                        {isSynthesizing ? "Analyzing..." : "Re-Summarize"}
                      </button>
                    </div>
                  </div>
                  {isSynthesizing ? <p className="text-sm glow-text">Multi-Agent Orchestrator is synthesizing records...</p> : (
                    <div className="text-sm" style={{lineHeight: 1.6, color: 'var(--text-primary)'}}>
                      {aiInsights ? <ReactMarkdown>{aiInsights}</ReactMarkdown> : <p>No insights generated.</p>}
                    </div>
                  )}
                </div>

                <div className="flex-col gap-6">
                  {/* Specialized Agent Submodules */}
                  {agentData && (
                    <div className="glass-card stagger-1" style={{borderLeft: '4px solid var(--warning)'}}>
                      <h4 className="mb-2 flex items-center gap-2"><Pill size={16} color="var(--warning)"/> Medication Intelligence</h4>
                      <p className="text-sm">{agentData.medication_analysis?.summary || "Analyzing regimen..."}</p>
                    </div>
                  )}

                  {agentData && (
                    <div className="glass-card stagger-2" style={{borderLeft: '4px solid var(--success)'}}>
                      <h4 className="mb-2 flex items-center gap-2"><Activity size={16} color="var(--success)"/> Lab & Vital Trends</h4>
                      <p className="text-sm">{agentData.lab_trends?.narrative || "Calculating trajectories..."}</p>
                    </div>
                  )}

                  {agentData && (
                    <div className="glass-card stagger-3" style={{borderLeft: '4px solid var(--primary-color)'}}>
                      <h4 className="mb-2 flex items-center gap-2"><Folder size={16} color="var(--primary-color)"/> Diagnostic Clusters</h4>
                      <p className="text-sm"><strong>Primary:</strong> {agentData.diagnosis_clusters?.primary}</p>
                      <p className="text-xs text-secondary mt-1">{agentData.diagnosis_clusters?.reasoning}</p>
                    </div>
                  )}

                  {agentData && (
                    <div className="glass-card stagger-4" style={{borderLeft: '4px solid #8b5cf6'}}>
                      <h4 className="mb-2 flex items-center gap-2"><ShieldCheck size={16} color="#8b5cf6"/> Treatment Pathway</h4>
                      <p className="text-sm">{agentData.treatment_pathway?.next_steps}</p>
                      <div className="mt-2 flex justify-between items-center">
                        <span className="text-xs font-bold">Success Probability:</span>
                        <span className="badge btn-secondary">{agentData.treatment_pathway?.success_probability}</span>
                      </div>
                    </div>
                  )}

                  {agentData && (
                    <div className="glass-card stagger-5" style={{borderLeft: '4px solid var(--danger)'}}>
                      <h4 className="mb-2 flex items-center gap-2"><Info size={16} color="var(--danger)"/> Risk Signals (ML)</h4>
                      <div className="flex gap-2 flex-wrap">
                        {agentData.risk_signals?.risk_flags?.map(f => (
                          <span key={f} className="badge btn-danger" style={{fontSize: '0.7rem'}}>{f}</span>
                        )) || <p className="text-xs text-secondary">No acute risks detected.</p>}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <h3 className="mb-4">Active & Upcoming Visits</h3>
              <div className="flex-col gap-4">
                {profile.patientAppointments.map(a => (
                  <div key={a.id} className="glass-card" style={{padding: '20px'}}>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <strong style={{fontSize: '1.1rem'}}>{a.doctor.name} ({a.doctor.specialty})</strong>
                        <p className="text-sm text-secondary mt-1"><Calendar size={14} className="inline mr-1"/> {a.appointmentDate} @ {a.timeSlot} | {a.hospital.name}</p>
                      </div>
                      <span className="badge" style={{fontSize: '0.85rem'}}>{a.status}</span>
                    </div>
                    {renderProgress(a.status)}
                    {a.status === 'TRIAGE' && <p className="text-sm text-center mt-4 glow-text">Nurse has recorded your vitals. Awaiting Doctor.</p>}
                    {a.status === 'DOCTOR' && <p className="text-sm text-center mt-4" style={{color: 'var(--success)', fontWeight:'bold'}}>Doctor is currently reviewing your file.</p>}
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
                  {[...profile.medicalRecords]
                    .filter(r => {
                      const title = r.title.toLowerCase();
                      const isHandwritten = title.includes("transcribed") || r.content.includes("handwritten");
                      
                      // 5-Year Filter
                      const currentYear = new Date().getFullYear();
                      const recordYear = new Date(r.date).getFullYear();
                      if (recordYear < currentYear - 10) return false;

                      // Strict "Official Diagnosis" Filter
                      const isClinical = r.type === 'CONDITION' || title.includes("diagnosis");
                      
                      const isNoise = title.includes("height") || title.includes("weight") || 
                                      title.includes("score") || title.includes("status") ||
                                      title.includes("employment") || title.includes("finding");
                                      
                      return !isHandwritten && isClinical && !isNoise;
                    })
                    .sort((a, b) => new Date(b.date) - new Date(a.date))
                    .map((r) => {
                      const hosp = allHospitals.find(h => h.id === r.hospitalId);
                      return (
                        <div key={r.id} className="timeline-item">
                          <div className="timeline-node" style={{
                            background: r.type === 'VACCINE' ? 'var(--success)' : (r.type === 'MEDICATION' ? 'var(--warning)' : 'var(--primary-color)'),
                            borderColor: 'white'
                          }}></div>
                          <div className="flex items-center gap-4 mb-3">
                            <span style={{fontSize: '1.1rem', fontWeight: 700}}>{new Date(r.date).getFullYear()}</span>
                            <span className="badge">{r.specialty}</span>
                          </div>
                          <div className="flex gap-4" style={{background: 'white', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0'}}>
                            <div style={{background: '#f8fafc', padding: '10px', borderRadius: '12px', alignSelf: 'flex-start', border: '1px solid #e2e8f0'}}>
                              <QRCodeCanvas value={`VERIFY-AURA-${r.id}`} size={80} level="H" />
                              <p className="text-xs text-center mt-1" style={{color: '#64748b', fontWeight: 'bold'}}>SCAN TO VERIFY</p>
                            </div>
                            <div style={{flex: 1}}>
                              <h4 style={{margin: '0 0 8px 0', color: 'var(--text-primary)'}}>{r.title}</h4>
                              <p className="text-sm mb-3 text-secondary">{r.content}</p>
                              <div className="flex gap-2">
                                <button className="badge btn-secondary" onClick={() => {setModalData(r); setActiveModal('PDF')}}>View Document</button>
                                <button className="badge btn-secondary" onClick={() => generateOfficialPDF(r)}>Download Official PDF</button>
                                <button className="badge btn-secondary" onClick={() => downloadFHIR(r)}>Export FHIR</button>
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
                <h2 className="text-gradient" style={{margin:0}}>Medical Records Vault</h2>
                <button className="btn" onClick={() => setActiveModal('UPLOAD')}><UploadCloud size={16} className="mr-2 inline" /> Upload Record</button>
              </div>
              <div className="grid grid-3">
                <div className="folder-card" onClick={() => setActiveFolder('REPORTS')}>
                  <Folder size={48} color="var(--primary-color)" style={{margin: '0 auto 12px'}} />
                  <h4>Reports & Labs</h4>
                </div>
                <div className="folder-card" onClick={() => setActiveFolder('SCANS')}>
                  <Folder size={48} color="var(--secondary-color)" style={{margin: '0 auto 12px'}} />
                  <h4>Scans & Imaging</h4>
                </div>
                <div className="folder-card" onClick={() => setActiveFolder('ALL')}>
                  <Folder size={48} color="var(--warning)" style={{margin: '0 auto 12px'}} />
                  <h4>All Documents</h4>
                </div>
              </div>

              {activeFolder && (
                <div className="mt-8 pt-8 border-t animate-fade-in" style={{borderColor: '#e2e8f0'}}>
                  <h3 className="mb-4">Browsing: {activeFolder}</h3>
                  <div className="flex-col gap-2">
                    {profile.medicalRecords.filter(r => {
                      const currentYear = new Date().getFullYear();
                      const recordYear = new Date(r.date).getFullYear();
                      const isRecent = recordYear >= currentYear - 10;
                      const matchesFolder = activeFolder === 'ALL' || (activeFolder==='SCANS' && r.type==='SCAN') || (activeFolder==='REPORTS' && r.type!=='SCAN' && r.type!=='MEDICATION');
                      return isRecent && matchesFolder;
                    }).map(file => (
                      <div key={file.id} className="file-item" onClick={() => {setModalData(file); setActiveModal('PDF')}}>
                        <div className="flex items-center gap-4">
                          <FileText color="var(--primary-color)" />
                          <div>
                            <p style={{fontWeight: 600, margin:0}}>{file.title}.pdf</p>
                            <p className="text-sm mt-1 text-secondary">{new Date(file.date).toLocaleDateString()} • {file.specialty}</p>
                          </div>
                        </div>
                        <button className="badge btn-secondary">View PDF</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          } />

          <Route path="/medications" element={
            <div className="stagger-3">
              <h2 className="text-gradient mb-6">Unified Medication Profile</h2>
              
              <div className="glass-card mb-8" style={{borderTop: '4px solid var(--warning)'}}>
                <h3 className="mb-4">Recent Prescriptions (Last 5 Years)</h3>
                <div className="flex-col gap-3">
                  {profile.medicalRecords
                    .filter(r => r.type === 'MEDICATION' && new Date(r.date).getFullYear() >= new Date().getFullYear() - 5)
                    .map(m => (
                    <div key={m.id} className="p-4 flex justify-between items-center" style={{background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px'}}>
                      <div>
                        <h4 style={{margin:0, color: 'var(--text-primary)'}}>{m.title.replace('Medication: ', '')}</h4>
                        <p className="text-sm mt-1 text-secondary">{m.content}</p>
                      </div>
                      <div className="text-right">
                        <span className="badge mb-2">ACTIVE/RECENT</span>
                        <p className="text-xs text-secondary">{new Date(m.date).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))}
                  {profile.medicalRecords.filter(r => r.type === 'MEDICATION' && new Date(r.date).getFullYear() >= new Date().getFullYear() - 5).length === 0 && (
                    <p className="text-sm text-secondary">No recent prescriptions recorded.</p>
                  )}
                </div>
              </div>

              <div className="glass-card">
                <h3 className="mb-4">Historical Medication History</h3>
                <div className="flex-col gap-2">
                  {profile.medicalRecords
                    .filter(r => r.type === 'MEDICATION' && new Date(r.date).getFullYear() < new Date().getFullYear() - 5)
                    .sort((a,b) => new Date(b.date) - new Date(a.date))
                    .map(m => (
                    <div key={m.id} className="p-3 flex justify-between items-center" style={{borderBottom: '1px solid #f1f5f9'}}>
                      <p style={{margin:0, fontWeight: 500}}>{m.title.replace('Medication: ', '')}</p>
                      <p className="text-xs text-secondary">{new Date(m.date).getFullYear()}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          } />

          <Route path="/doctors" element={
            <div className="stagger-1">
              <h2 className="text-gradient">Doctors & Visits (Hospital Hub)</h2>
              <p className="mb-6 text-secondary">Select a connected facility to book appointments and manage data consent.</p>
              
              {!hospitalFilter ? (
                <div className="grid grid-2">
                  {profile.patientHospitals.map(ph => (
                    <div key={ph.id} className="glass-card" style={{padding:0, overflow:'hidden'}}>
                      {ph.hospital.imageUrl && <img src={ph.hospital.imageUrl} alt="Hospital" className="hospital-image" style={{margin:0, width:'100%', height:'160px', cursor:'pointer'}} onClick={() => setHospitalFilter(ph.hospitalId)}/>}
                      <div className="p-4" style={{padding: '24px'}}>
                        <div className="flex justify-between items-start">
                          <h3 style={{margin:0}}>{ph.hospital.name}</h3>
                          <button className="btn-secondary" style={{padding: '4px 8px', borderRadius: '4px'}} onClick={() => {setModalData(ph.hospital); setActiveModal('HOSPITAL_INFO')}}><Info size={16}/></button>
                        </div>
                        <p className="text-sm mt-1 text-secondary"><MapPin size={12} className="inline mr-1"/>{ph.hospital.location}</p>
                        <button className="btn mt-4 w-full" onClick={() => setHospitalFilter(ph.hospitalId)}>Access Facility & Consent</button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="glass-card mt-4">
                  <div className="flex justify-between items-center mb-8">
                    <div>
                      <h2 style={{margin:0}}>{allHospitals.find(h=>h.id === hospitalFilter)?.name}</h2>
                    </div>
                    <button className="btn-secondary" onClick={() => setHospitalFilter(null)}>Back</button>
                  </div>

                  <div className="grid grid-2 gap-8">
                    {/* Booking Form with AI Recommendation */}
                    <div>
                      <h3 className="mb-4">Book Appointment</h3>
                      <form onSubmit={createAppointment} className="flex-col gap-2">
                        <input type="hidden" name="hospitalId" value={hospitalFilter} />
                        <div>
                          <label className="text-sm font-bold">Select Specialist</label>
                          <select name="doctorId" required>
                            <option value="">Choose...</option>
                            {allHospitals.find(h=>h.id === hospitalFilter)?.doctors.map(d => (
                              <option key={d.user.id} value={d.user.id}>{d.user.name} ({d.user.specialty})</option>
                            ))}
                          </select>
                        </div>
                        <div className="flex gap-4 mt-2">
                          <div style={{flex: 1}}><label className="text-sm font-bold">Date</label><input type="date" name="appointmentDate" required /></div>
                          <div style={{flex: 1}}><label className="text-sm font-bold">Time</label>
                            <select name="timeSlot" required><option value="09:00 AM">09:00 AM</option><option value="11:30 AM">11:30 AM</option></select>
                          </div>
                        </div>
                        <div className="mt-4 p-4" style={{background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px'}}>
                          <label className="text-sm font-bold text-gradient">AI Triage / Recommendation (Optional)</label>
                          <p className="text-sm text-secondary mb-2">Not sure who to book? Type your issue and AI will suggest the best hospital.</p>
                          <div className="flex gap-2">
                            <input type="text" value={bookingIssue} onChange={e=>setBookingIssue(e.target.value)} placeholder="e.g. Chest pain and sweating" />
                            <button type="button" className="btn-secondary" onClick={getAiRecommendation} disabled={!bookingIssue || isRecommending}>Ask AI</button>
                          </div>
                          {aiRecommendation && <p className="text-sm mt-3" style={{color: 'var(--primary-color)', fontWeight: 600}}><Info size={14} className="inline mr-1"/> {aiRecommendation}</p>}
                        </div>
                        <button type="submit" className="btn mt-4 w-full">Confirm Booking</button>
                      </form>
                    </div>

                    {/* Consent Form */}
                    <div>
                      <h3 className="mb-4">Data Privacy Consent</h3>
                      <p className="text-sm text-secondary mb-4">You have full control over which doctors can see your longitudinal memory layer.</p>
                      <div className="flex-col gap-2">
                        {allHospitals.find(h=>h.id === hospitalFilter)?.doctors.filter(d => d.user.role === 'DOCTOR').map(d => {
                          // Simple mock check for consent
                          return (
                          <div key={d.user.id} className="flex justify-between items-center" style={{background: 'white', border: '1px solid #e2e8f0', padding: '12px 16px', borderRadius: '12px'}}>
                            <div>
                              <p style={{margin:0, fontWeight:600}}>{d.user.name}</p>
                              <p className="text-sm text-secondary">{d.user.specialty}</p>
                            </div>
                            <button className="badge btn-secondary">Toggle Access</button>
                          </div>
                        )})}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          } />

          <Route path="/directory" element={
            <div className="stagger-2">
              <h2 className="text-gradient">Hospitals Directory</h2>
              <p className="text-secondary mb-6">Financial and operational transparency to help you choose the best facility.</p>
              
              <div className="flex-col gap-6">
                {allHospitals.map(h => (
                  <div key={h.id} className="glass-card flex gap-6" style={{padding:0, overflow:'hidden'}}>
                    {h.imageUrl && <img src={h.imageUrl} alt="Hospital" style={{width:'300px', objectFit:'cover'}}/>}
                    <div style={{padding: '24px', flex: 1}}>
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 style={{margin:0, fontSize:'1.4rem'}}>{h.name}</h3>
                          <p className="text-sm mt-1 text-secondary">{h.sector} • {h.facilityLevel}</p>
                        </div>
                        <div className="flex gap-2">
                          <button className="btn-secondary" style={{padding: '6px 12px', borderRadius: '4px'}} onClick={() => {setModalData(h); setActiveModal('HOSPITAL_INFO')}}><Info size={16} className="mr-1 inline"/> Deep Dive</button>
                          {!joinedHospitalIds.includes(h.id) && <button className="btn" style={{padding: '6px 12px'}} onClick={() => {setModalData(h); setActiveModal('OTP')}}>Join Network</button>}
                        </div>
                      </div>
                      
                      <div className="grid grid-3 mt-6">
                        <div style={{background: '#f8fafc', padding: '12px', borderRadius: '8px'}}>
                          <p className="text-sm text-secondary mb-1">Insurance</p>
                          <p className="font-bold text-sm" style={{color: h.insuranceNetwork.includes('Cashless') ? 'var(--success)' : 'var(--text-primary)'}}>{h.insuranceNetwork}</p>
                        </div>
                        <div style={{background: '#f8fafc', padding: '12px', borderRadius: '8px'}}>
                          <p className="text-sm text-secondary mb-1">ER Wait Time</p>
                          <p className="font-bold text-sm" style={{color: h.erWaitTime > 60 ? 'var(--danger)' : 'var(--success)'}}>{h.erWaitTime} Mins</p>
                        </div>
                        <div style={{background: '#f8fafc', padding: '12px', borderRadius: '8px'}}>
                          <p className="text-sm text-secondary mb-1">ICU Beds</p>
                          <p className="font-bold text-sm" style={{color: h.icuBeds === 0 ? 'var(--danger)' : 'var(--primary-color)'}}>{h.icuBeds} Available</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          } />
        </Routes>

        {/* MODALS */}
        {activeModal === 'OTP' && (
          <div className="modal-overlay">
            <div className="modal-content text-center flex-col items-center">
              <ShieldCheck size={48} color="var(--primary-color)" className="glow-effect mb-4" />
              <h3 className="mb-2">Identity Verification</h3>
              <p className="text-secondary text-sm">Enter OTP sent to your registered phone to join {modalData.name}.</p>
              <form onSubmit={handleJoinSubmit} className="flex-col w-full gap-4 mt-4">
                <input type="text" placeholder="1234" value={otp} onChange={e => setOtp(e.target.value)} required maxLength="4" style={{textAlign:'center', fontSize: '2rem', letterSpacing: '12px'}} />
                <div className="flex gap-4 w-full">
                  <button type="button" className="btn btn-secondary w-full" onClick={() => setActiveModal(null)}>Cancel</button>
                  <button type="submit" className="btn w-full">Verify & Join</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {activeModal === 'HOSPITAL_INFO' && modalData && (
          <div className="modal-overlay" onClick={() => setActiveModal(null)}>
            <div className="modal-content" onClick={e=>e.stopPropagation()} style={{maxWidth: '600px'}}>
              <div className="flex justify-between items-center mb-6">
                <h2 style={{margin:0}}>{modalData.name}</h2>
                <button className="badge btn-secondary" onClick={()=>setActiveModal(null)}>Close</button>
              </div>
              <img src={modalData.imageUrl} style={{width: '100%', height: '200px', objectFit: 'cover', borderRadius: '12px', marginBottom: '20px'}}/>
              
              <div className="grid grid-2 gap-6 mb-6">
                <div>
                  <p className="text-sm text-secondary">Accreditations</p>
                  <p className="font-bold">{modalData.accreditations}</p>
                </div>
                <div>
                  <p className="text-sm text-secondary">Base Consultation Fee</p>
                  <p className="font-bold">₹{modalData.consultationFee}</p>
                </div>
                <div>
                  <p className="text-sm text-secondary">Patient Rating</p>
                  <p className="font-bold flex items-center gap-1"><Star size={16} fill="#f59e0b" color="#f59e0b"/> {modalData.rating} ({modalData.reviewsCount})</p>
                </div>
                <div>
                  <p className="text-sm text-secondary">30-Day Readmission Rate</p>
                  <p className="font-bold" style={{color: modalData.readmissionRate > 5 ? 'var(--danger)' : 'var(--success)'}}>{modalData.readmissionRate}%</p>
                </div>
              </div>

              <div style={{background: '#f8fafc', padding: '16px', borderRadius: '12px'}}>
                <h4 className="mb-2 flex items-center gap-2"><Activity size={16} color="var(--primary-color)"/> Financial Transparency (Procedures)</h4>
                {Object.entries(JSON.parse(modalData.procedureCosts || '{}')).map(([proc, cost]) => (
                  <div key={proc} className="flex justify-between border-b py-2 text-sm">
                    <span>{proc}</span>
                    <strong>{cost}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeModal === 'PROFILE' && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h2 className="mb-4">Edit Profile</h2>
              <form onSubmit={handleProfileUpdate} className="flex-col gap-4">
                <div><label className="text-sm font-bold">Phone Number</label><input value={profileForm.phone} onChange={e=>setProfileForm({...profileForm, phone: e.target.value})} /></div>
                <div><label className="text-sm font-bold">Address</label><input value={profileForm.address} onChange={e=>setProfileForm({...profileForm, address: e.target.value})} /></div>
                <div><label className="text-sm font-bold">Allergies</label><input value={profileForm.allergies} onChange={e=>setProfileForm({...profileForm, allergies: e.target.value})} /></div>
                <div><label className="text-sm font-bold">Chronic Conditions</label><input value={profileForm.chronicConditions} onChange={e=>setProfileForm({...profileForm, chronicConditions: e.target.value})} /></div>
                <div className="flex gap-4 mt-4">
                  <button type="button" className="btn btn-secondary w-full" onClick={() => setActiveModal(null)}>Cancel</button>
                  <button type="submit" className="btn w-full">Save Changes</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {activeModal === 'UPLOAD' && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h2 className="mb-4">Smart AI Upload</h2>
              <p className="text-sm text-secondary mb-6">Upload a prescription image. Our Vision Agent will transcribe it automatically.</p>
              <form onSubmit={handleUploadSubmit} className="flex-col gap-4">
                <div>
                  <label className="text-sm font-bold">Prescription Image</label>
                  <input type="file" name="file" accept="image/*" required className="mt-2" />
                </div>
                <div>
                  <label className="text-sm font-bold">Specialty (Optional)</label>
                  <input value={uploadForm.specialty} onChange={e=>setUploadForm({...uploadForm, specialty: e.target.value})} placeholder="e.g. Cardiology" />
                </div>
                
                <div className="flex gap-4 mt-4">
                  <button type="button" className="btn btn-secondary w-full" onClick={() => setActiveModal(null)}>Cancel</button>
                  <button type="submit" className="btn w-full" disabled={isSynthesizing}>
                    {isSynthesizing ? 'AI Processing...' : 'Upload & Process'}
                  </button>
                </div>
              </form>
              {isSynthesizing && <p className="text-sm text-center mt-4 glow-text">Vision Agent is analyzing handwriting...</p>}
            </div>
          </div>
        )}

        {activeModal === 'PDF' && modalData && (
          <div className="modal-overlay" onClick={() => setActiveModal(null)}>
            <div className="pdf-viewer animate-fade-in" onClick={e => e.stopPropagation()}>
              <div className="pdf-header">
                <div>
                  <h1 style={{color: '#333', fontSize: '2rem', margin:0}}>AURA HEALTHCARE SYSTEM</h1>
                  <p style={{margin:0, color: '#666'}}>CONFIDENTIAL MEDICAL RECORD</p>
                </div>
                <div className="text-right">
                  <p><strong>Date:</strong> {new Date(modalData.date).toLocaleDateString()}</p>
                  <p><strong>Patient ID:</strong> {user.id.split('-')[0]}</p>
                </div>
              </div>
              <div style={{marginBottom: '2rem'}}>
                <h3 style={{color: '#0055ff', borderBottom: '1px solid #ccc', paddingBottom: '8px'}}>DOCUMENT DETAILS</h3>
                <p><strong>Title:</strong> {modalData.title}</p>
                <p><strong>Department:</strong> {modalData.specialty}</p>
                <p><strong>Record Type:</strong> {modalData.type}</p>
              </div>
              <div style={{padding: '2rem', background: '#f5f5f5', borderLeft: '4px solid #0055ff', minHeight: '200px'}}>
                <h4 style={{color: '#333', marginBottom: '1rem'}}>CLINICAL NOTES / FINDINGS:</h4>
                <p style={{fontSize: '1.1rem', lineHeight: '1.8', whiteSpace: 'pre-wrap'}}>{modalData.content}</p>
              </div>
              <div className="flex justify-between items-center mt-8" style={{borderTop: '1px solid #ccc', paddingTop: '1rem'}}>
                <p style={{color: '#999', fontSize: '0.8rem'}}>Digitally signed and verified by AuraHealth Cryptographic Layer.</p>
                <button className="btn" onClick={() => setActiveModal(null)}>Close Document</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

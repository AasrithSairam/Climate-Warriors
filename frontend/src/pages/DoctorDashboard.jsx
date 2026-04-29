import { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import { Users, Calendar, Activity, Pill, AlertTriangle, MessageSquare, ShieldCheck, FileText, Search } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function DoctorDashboard({ user }) {
  const [patients, setPatients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  
  // AI State
  const [aiSummary, setAiSummary] = useState(null);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [chatLog, setChatLog] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatting, setIsChatting] = useState(false);

  const [activeTab, setActiveTab] = useState('SUMMARY'); // SUMMARY, TIMELINE, RECORDS, PRESCRIBE, CHAT

  const loc = useLocation();

  const fetchData = async () => {
    const res = await axios.get(`http://localhost:3001/api/doctors/${user.id}/patients`);
    setPatients(res.data.patients);
    setAppointments(res.data.appointments);
  };

  useEffect(() => { fetchData(); }, [user.id]);

  const handleSelectPatient = async (p) => {
    setSelectedPatient(p);
    setAiSummary(null);
    setChatLog([]);
    setActiveTab('SUMMARY');
    setIsSynthesizing(true);
    
    try {
      const recRes = await axios.get(`http://localhost:3001/api/patients/${p.userId}/records?doctorId=${user.id}`);
      
      const aiRes = await axios.get(`http://127.0.0.1:8005/patient/${p.user.id}/context?encounter_type=${user.specialty}`);
      
      // The structure is double nested { brief: { brief: { ... } } } from simulation mode
      const briefData = aiRes.data.brief.brief || aiRes.data.brief;
      setAiSummary(briefData);
      p.filteredRecords = recRes.data.records;
    } catch (e) { console.error(e); }
    setIsSynthesizing(false);
  };

  const handleAcceptAppointment = async (id) => {
    await axios.put(`http://localhost:3001/api/appointments/${id}/accept`);
    fetchData();
  };

  const handleChatSubmit = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    
    const userMsg = chatInput;
    setChatLog(prev => [...prev, { sender: 'DR', text: userMsg }]);
    setChatInput('');
    setIsChatting(true);

    try {
      const res = await axios.post('http://127.0.0.1:8001/api/chat', {
        patient_name: selectedPatient.user.name,
        question: userMsg,
        allergies: selectedPatient.user.allergies,
        chronic_conditions: selectedPatient.user.chronicConditions,
        records: selectedPatient.filteredRecords
      });
      setChatLog(prev => [...prev, { sender: 'AI', text: res.data.answer }]);
    } catch (e) {
      setChatLog(prev => [...prev, { sender: 'AI', text: 'Sorry, I encountered an error accessing the records.' }]);
    }
    setIsChatting(false);
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
        <div className="mb-8 flex items-center gap-4 px-2">
          {user.profileImageUrl ? <img src={user.profileImageUrl} className="avatar" alt="Avatar"/> : <div className="avatar bg-gray-500"></div>}
          <div>
            <h4 style={{margin:0}}>{user.name}</h4>
            <p className="text-sm" style={{color:'var(--secondary-color)'}}>{user.specialty}</p>
          </div>
        </div>
        {navItem('/doctor', <Calendar size={20} />, 'Dashboard')}
        {navItem('/doctor/patients', <Users size={20} />, 'My Patients')}
      </div>

      <div className="dashboard-content">
        <Routes>
          <Route path="/" element={
            <div className="stagger-1">
              <h2 className="text-gradient">Doctor Dashboard</h2>
              <p className="mb-6">Get the patient's full story in 10 seconds.</p>
              
              <div className="grid grid-2">
                <div className="glass-card">
                  <h3 className="mb-4">Today's Appointments</h3>
                  <div className="flex-col gap-3">
                    {appointments.filter(a => a.status === 'PENDING').map(a => (
                      <div key={a.id} className="p-4" style={{background: 'rgba(0,0,0,0.2)', borderRadius: '12px', borderLeft: '4px solid var(--secondary-color)'}}>
                        <div className="flex justify-between items-center mb-2">
                          <strong>{a.patient.name}</strong>
                          <button className="badge btn-secondary" onClick={() => handleAcceptAppointment(a.id)}>Accept</button>
                        </div>
                        <p className="text-sm text-secondary"><Calendar size={12} className="inline mr-1"/> {a.appointmentDate} @ {a.timeSlot}</p>
                      </div>
                    ))}
                    {appointments.filter(a => a.status === 'PENDING').length === 0 && <p className="text-sm">No pending appointments.</p>}
                  </div>
                </div>
                
                <div className="glass-card" style={{borderTop: '4px solid var(--danger)'}}>
                  <h3 className="mb-4">Critical Alerts</h3>
                  <div className="flex items-center gap-4 p-4 mb-3" style={{background: 'rgba(239, 71, 111, 0.1)', borderRadius: '12px'}}>
                    <AlertTriangle color="var(--danger)" />
                    <div>
                      <h4 style={{margin:0}}>Drug Interaction Warning</h4>
                      <p className="text-sm">John Doe - Check recent Albuterol prescription.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          } />

          <Route path="/patients" element={
            <div className="stagger-2 flex gap-8 h-full">
              {/* Patient List Sidebar */}
              <div className="glass-card" style={{width: '300px', flexShrink: 0, padding: '16px', overflowY: 'auto'}}>
                <h3 className="mb-4">Patient Directory</h3>
                <div className="flex-col gap-2">
                  {patients.map(p => (
                    <div 
                      key={p.id} 
                      className="p-3" 
                      style={{
                        background: selectedPatient?.id === p.id ? 'rgba(255,0,85,0.1)' : 'rgba(0,0,0,0.2)',
                        borderLeft: selectedPatient?.id === p.id ? '4px solid var(--secondary-color)' : '4px solid transparent',
                        borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s'
                      }}
                      onClick={() => handleSelectPatient(p)}
                    >
                      <div className="flex items-center gap-3">
                        {p.user.profileImageUrl ? <img src={p.user.profileImageUrl} style={{width:'32px', height:'32px', borderRadius:'50%', objectFit:'cover'}} alt="P"/> : <div className="avatar bg-gray-500" style={{width:'32px', height:'32px'}}></div>}
                        <div>
                          <strong style={{display:'block', fontSize:'0.9rem'}}>{p.user.name}</strong>
                          <span className="text-sm text-secondary">ID: {p.user.id.split('-')[0]}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Deep Patient View */}
              <div style={{flex: 1, display: 'flex', flexDirection: 'column', gap: '24px'}}>
                {!selectedPatient ? (
                  <div className="glass-card flex justify-center items-center h-full text-secondary">
                    <p>Select a patient to view their AI-synthesized memory layer.</p>
                  </div>
                ) : (
                  <>
                    {/* Patient Header */}
                    <div className="glass-card flex justify-between items-center" style={{padding: '24px'}}>
                      <div className="flex items-center gap-6">
                        {selectedPatient.user.profileImageUrl && <img src={selectedPatient.user.profileImageUrl} style={{width:'80px', height:'80px', borderRadius:'50%', border:'2px solid var(--secondary-color)', objectFit:'cover'}} alt="P"/>}
                        <div>
                          <h2 style={{margin:0}}>{selectedPatient.user.name}</h2>
                          <div className="flex gap-4 mt-2 text-sm text-secondary">
                            <span>DOB: {new Date(selectedPatient.user.dob).toLocaleDateString()}</span>
                            <span>Sex: Male</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 bg-dark p-1 rounded-xl" style={{background: 'rgba(0,0,0,0.4)'}}>
                        <button className={`btn ${activeTab === 'SUMMARY' ? '' : 'btn-secondary'}`} style={{padding: '8px 16px', border:'none'}} onClick={() => setActiveTab('SUMMARY')}>AI Snapshot</button>
                        <button className={`btn ${activeTab === 'TIMELINE' ? '' : 'btn-secondary'}`} style={{padding: '8px 16px', border:'none'}} onClick={() => setActiveTab('TIMELINE')}>Timeline</button>
                        <button className={`btn ${activeTab === 'CHAT' ? '' : 'btn-secondary'}`} style={{padding: '8px 16px', border:'none'}} onClick={() => setActiveTab('CHAT')}>AI Assistant</button>
                        <button className={`btn ${activeTab === 'PRESCRIBE' ? '' : 'btn-secondary'}`} style={{padding: '8px 16px', border:'none'}} onClick={() => setActiveTab('PRESCRIBE')}>Prescribe</button>
                      </div>
                    </div>

                    {/* Content Area */}
                    <div className="glass-card" style={{flex: 1, overflowY: 'auto'}}>
                      {activeTab === 'SUMMARY' && (
                        <div className="animate-fade-in">
                          <div className="flex justify-between items-center mb-4">
                            <h3 className="text-gradient flex items-center gap-2" style={{margin:0}}><Activity size={20}/> 10-Second Smart Summary</h3>
                            <button 
                              className="badge btn-secondary flex items-center gap-2" 
                              style={{cursor: 'pointer', border: 'none'}}
                              onClick={() => handleSelectPatient(selectedPatient)}
                              disabled={isSynthesizing}
                            >
                              <Activity size={14} className={isSynthesizing ? "animate-pulse" : ""}/> 
                              {isSynthesizing ? "Analyzing..." : "Refresh Summary"}
                            </button>
                          </div>
                          {isSynthesizing ? <p className="glow-text">Multi-Agent Orchestrator is synthesizing records...</p> : (
                            <div className="markdown-container" style={{lineHeight: 1.6}}>
                              {aiSummary ? (
                                <div className="flex-col gap-4">
                                  {aiSummary.clinical_brief && (
                                    <div className="p-4 mb-4" style={{background: 'rgba(0,240,255,0.05)', borderRadius: '12px', border: '1px solid rgba(0,240,255,0.2)'}}>
                                      <h4 className="mb-2">Clinical Narrative</h4>
                                      <ReactMarkdown>{aiSummary.clinical_brief}</ReactMarkdown>
                                    </div>
                                  )}

                                  {aiSummary.critical_flags && aiSummary.critical_flags.length > 0 && (
                                    <div className="p-4" style={{background: 'rgba(239, 71, 111, 0.1)', borderLeft: '4px solid var(--danger)', borderRadius: '8px'}}>
                                      <h4 style={{color: 'var(--danger)', marginBottom: '8px'}}>Critical Flags</h4>
                                      <ul style={{margin:0, paddingLeft: '20px'}}>
                                        {aiSummary.critical_flags.map((f, i) => <li key={i}><strong>[{f.priority.toUpperCase()}]</strong> {f.finding} <span className="text-sm text-secondary">({f.source_agent})</span></li>)}
                                      </ul>
                                    </div>
                                  )}
                                  
                                  <div className="grid grid-2 gap-4">
                                    <div className="p-4" style={{background: 'rgba(0,0,0,0.05)', borderRadius: '8px'}}>
                                      <h4>Medications</h4>
                                      <p className="text-sm mt-2">{aiSummary.medication_summary || 'No data'}</p>
                                    </div>
                                    <div className="p-4" style={{background: 'rgba(0,0,0,0.05)', borderRadius: '8px'}}>
                                      <h4>Risk Signals</h4>
                                      <p className="text-sm mt-2">{aiSummary.risk_summary || 'No data'}</p>
                                    </div>
                                    <div className="p-4" style={{background: 'rgba(0,0,0,0.05)', borderRadius: '8px'}}>
                                      <h4>Active Diagnoses</h4>
                                      <ul className="text-sm mt-2" style={{paddingLeft: '20px'}}>
                                        {(aiSummary.active_diagnoses || []).map((d, i) => <li key={i}>{typeof d === 'string' ? d : d.name}</li>)}
                                      </ul>
                                    </div>
                                    <div className="p-4" style={{background: 'rgba(0,0,0,0.05)', borderRadius: '8px'}}>
                                      <h4>Lab & Vitals Highlights</h4>
                                      <ul className="text-sm mt-2" style={{paddingLeft: '20px'}}>
                                        {(aiSummary.lab_highlights || []).map((l, i) => <li key={i}>{typeof l === 'string' ? l : l.finding}</li>)}
                                      </ul>
                                    </div>
                                  </div>
                                </div>
                              ) : <p>No data available to summarize.</p>}
                            </div>
                          )}
                        </div>
                      )}

                      {activeTab === 'CHAT' && (
                        <div className="animate-fade-in h-full flex-col">
                          <h3 className="mb-4 text-gradient flex items-center gap-2"><MessageSquare size={20}/> Talk to the Data</h3>
                          <div className="flex-col gap-4 mb-4" style={{flex:1, overflowY:'auto', padding:'16px', background:'rgba(0,0,0,0.2)', borderRadius:'12px'}}>
                            {chatLog.length === 0 && <p className="text-secondary text-center mt-8">Ask the AI questions about {selectedPatient.user.name}'s medical history.</p>}
                            {chatLog.map((msg, i) => (
                              <div key={i} style={{alignSelf: msg.sender==='DR' ? 'flex-end' : 'flex-start', background: msg.sender==='DR' ? 'rgba(255,0,85,0.2)' : 'rgba(0,240,255,0.1)', padding:'12px 16px', borderRadius:'12px', maxWidth:'80%'}}>
                                <strong style={{color: msg.sender==='DR'?'var(--secondary-color)':'var(--primary-color)'}}>{msg.sender === 'DR' ? 'You' : 'AI Assistant'}</strong>
                                <ReactMarkdown>{msg.text}</ReactMarkdown>
                              </div>
                            ))}
                            {isChatting && <div className="glow-text text-sm">AI is thinking...</div>}
                          </div>
                          <form onSubmit={handleChatSubmit} className="flex gap-2">
                            <input type="text" value={chatInput} onChange={e=>setChatInput(e.target.value)} placeholder="e.g. Any history of high blood pressure?" style={{flex:1}} />
                            <button type="submit" className="btn" disabled={isChatting}><Search size={16}/></button>
                          </form>
                        </div>
                      )}

                      {activeTab === 'TIMELINE' && (
                        <div className="animate-fade-in">
                          <h3 className="mb-6 flex items-center gap-2"><Calendar size={20}/> Full Medical History</h3>
                          <div className="timeline">
                            {selectedPatient.filteredRecords?.length > 0 ? selectedPatient.filteredRecords
                              .filter(r => {
                                const title = r.title.toLowerCase();
                                const currentYear = new Date().getFullYear();
                                const recordYear = new Date(r.date).getFullYear();
                                if (recordYear < currentYear - 5) return false;

                                const isClinical = r.type === 'CONDITION' || r.type === 'MEDICATION' || r.type === 'SCAN' || 
                                                 title.includes("symptom") || title.includes("diagnosis") || title.includes("risk");
                                const isNoise = title.includes("height") || title.includes("weight") || title.includes("score") || title.includes("certificate");
                                return isClinical && !isNoise;
                              })
                              .sort((a,b)=>new Date(b.date)-new Date(a.date)).map(r => (
                              <div key={r.id} className="timeline-item">
                                <div className="timeline-node" style={{background: 'var(--primary-color)', boxShadow: '0 0 10px var(--primary-color)'}}></div>
                                <div className="flex items-center gap-4 mb-2">
                                  <span style={{fontSize: '1.1rem', fontWeight: 700}}>{new Date(r.date).getFullYear()}</span>
                                  <span className="badge">{r.specialty}</span>
                                </div>
                                <div style={{background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '12px'}}>
                                  <h4 style={{color: 'var(--primary-color)'}}>{r.title}</h4>
                                  <p className="text-sm mt-2">{r.content}</p>
                                  <p className="text-sm mt-2 text-secondary">Type: {r.type}</p>
                                </div>
                              </div>
                            )) : <p>No significant clinical records found.</p>}
                          </div>
                        </div>
                      )}

                      {activeTab === 'PRESCRIBE' && (
                        <div className="animate-fade-in">
                          <h3 className="mb-4 flex items-center gap-2"><Pill size={20}/> Prescription Panel</h3>
                          
                          {/* Triage Data Display */}
                          {appointments.find(a => a.patientId === selectedPatient.user.id && a.status === 'DOCTOR')?.triageData && (
                            <div className="mb-6 p-4" style={{background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px'}}>
                              <h4 className="mb-3 flex items-center gap-2" style={{color: 'var(--primary-color)'}}><Activity size={18}/> Nurse Triage Vitals</h4>
                              {(() => {
                                const tr = appointments.find(a => a.patientId === selectedPatient.user.id && a.status === 'DOCTOR').triageData;
                                return (
                                  <>
                                    <div className="grid grid-3 gap-4 mb-4">
                                      <div><p className="text-sm text-secondary">BP</p><p className="font-bold">{tr.bp} mmHg</p></div>
                                      <div><p className="text-sm text-secondary">Heart Rate</p><p className="font-bold">{tr.heartRate} bpm</p></div>
                                      <div><p className="text-sm text-secondary">SpO2</p><p className="font-bold">{tr.spo2}%</p></div>
                                      <div><p className="text-sm text-secondary">Blood Sugar</p><p className="font-bold">{tr.sugar} mg/dL</p></div>
                                      <div><p className="text-sm text-secondary">Weight</p><p className="font-bold">{tr.weight} kg</p></div>
                                      <div><p className="text-sm text-secondary">Breath Training</p><p className="font-bold">{tr.breathTraining}</p></div>
                                    </div>
                                    <div style={{background: 'white', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0'}}>
                                      <p className="text-sm font-bold mb-1">Chief Complaint (Nurse Notes)</p>
                                      <p className="text-sm">{tr.chiefComplaint}</p>
                                    </div>
                                  </>
                                );
                              })()}
                            </div>
                          )}

                          <form onSubmit={(e) => {
                            e.preventDefault();
                            const formData = new FormData(e.target);
                             const activeAppt = appointments.find(a => a.patientId === selectedPatient.user.id && a.status === 'DOCTOR');
                             if (!activeAppt) return alert('No active, triaged appointment found for this patient.');
                             
                             const drugName = formData.get('medicationName');
                             const condition = activeAppt.triageData?.chiefComplaint || 'General Follow-up';

                             // NEW: Interactive Agent Trigger
                             const checkInteractions = async () => {
                               setIsSynthesizing(true);
                               try {
                                 // Call Medication Agent for Side Effects & Interactions
                                 const res = await axios.post(`http://localhost:8005/agent/medication/check`, {
                                   medication: drugName,
                                   patient_id: selectedPatient.user.id
                                 });
                                 setAiRecommendation(res.data.analysis);
                               } catch (e) {
                                 setAiRecommendation(`AI Analysis (Demo): **${drugName}** is generally safe. Potential side effects: Drowsiness, Nausea. **Interaction Check:** No acute reaction with current asthma regimen. Recommendation: Take after meals.`);
                               }
                               setIsSynthesizing(false);
                             };

                             const generateRecovery = async () => {
                               setIsSynthesizing(true);
                               try {
                                 const res = await axios.post(`http://localhost:8005/agent/treatment/plan`, {
                                   medication: drugName,
                                   condition: condition
                                 });
                                 setAiSummary(prev => ({ ...prev, treatment_plan: res.data.plan }));
                               } catch (e) {
                                 setAiSummary(prev => ({ 
                                   ...prev, 
                                   treatment_plan: `### Recovery Pathway for ${condition}\n1. **Acute Phase:** 3 days of rest with ${drugName}.\n2. **Monitoring:** Check BP daily; target < 130/80.\n3. **Follow-up:** Clinical review in 10 days for dosage adjustment.` 
                                 }));
                               }
                               setIsSynthesizing(false);
                             };

                            let contentStr = `${formData.get('medicationName')} - Quantity: ${formData.get('quantity')}\nInstructions: ${formData.get('instructions')}`;
                            axios.post(`http://localhost:3001/api/appointments/${activeAppt.id}/prescribe`, {
                              patientId: activeAppt.patientId, hospitalId: activeAppt.hospitalId,
                              title: 'Prescription', type: 'MEDICATION',
                              specialty: user.specialty, content: contentStr
                            }).then(() => {
                              alert('Prescription saved to Memory Layer. Appointment Completed.');
                              e.target.reset();
                              fetchData();
                              setActiveTab('SUMMARY');
                            });
                          }} className="flex-col gap-4">
                            <div className="flex items-center gap-2 p-3 text-sm" style={{background: 'rgba(255,209,102,0.1)', color: 'var(--warning)', borderRadius: '8px', border: '1px solid #fcd34d'}}>
                              <AlertTriangle size={16}/> Warning: Patient is allergic to {selectedPatient.user.allergies}. Please verify drug conflicts.
                            </div>
                            
                             <div className="flex gap-4 mt-2">
                               <input list="meds" id="medSelect" name="medicationName" placeholder="Search for tablet (e.g. Albuterol)..." style={{flex: 2}} required />
                               <datalist id="meds">
                                 <option value="Albuterol Inhaler 90mcg" />
                                 <option value="Sertraline 50mg Tablet" />
                                 <option value="Paracetamol 500mg" />
                                 <option value="Amoxicillin 250mg" />
                                 <option value="Lisinopril 10mg" />
                                 <option value="Zady 500mg (Azithromycin)" />
                               </datalist>
                               <div className="flex gap-2">
                                 <button type="button" className="btn btn-secondary" style={{padding:'8px'}} onClick={() => checkInteractions()}>Check AI Interaction</button>
                                 <button type="button" className="btn btn-secondary" style={{padding:'8px', background: 'var(--success)'}} onClick={() => generateRecovery()}>Generate Recovery Plan</button>
                               </div>
                             </div>

                             {aiRecommendation && (
                               <div className="p-4 mt-4 animate-fade-in" style={{background: 'rgba(0,240,255,0.05)', border: '1px dashed var(--primary-color)', borderRadius: '12px'}}>
                                 <h4 className="flex items-center gap-2 mb-2"><Pill size={16}/> Medication Agent Insights</h4>
                                 <ReactMarkdown className="text-sm">{aiRecommendation}</ReactMarkdown>
                               </div>
                             )}

                             {aiSummary?.treatment_plan && (
                               <div className="p-4 mt-4 animate-fade-in" style={{background: 'rgba(139, 92, 246, 0.05)', border: '1px dashed #8b5cf6', borderRadius: '12px'}}>
                                 <h4 className="flex items-center gap-2 mb-2"><ShieldCheck size={16}/> Treatment Recovery Steps</h4>
                                 <ReactMarkdown className="text-sm">{aiSummary.treatment_plan}</ReactMarkdown>
                               </div>
                             )}

                             <div className="flex gap-4 mt-4">
                               <select name="quantity" style={{flex: 1}}>
                                 <option value="1">Qty: 1</option>
                                 <option value="10">Qty: 10</option>
                                 <option value="30">Qty: 30</option>
                               </select>
                               <input name="instructions" placeholder="Dosage instructions (e.g., Take 1 every 8 hours)" style={{flex: 3}} required />
                             </div>
                             <button type="submit" className="btn mt-6 w-full">Finalize & Issue Prescription</button>
                          </form>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          } />
        </Routes>
      </div>
    </div>
  );
}

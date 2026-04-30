import { useState, useEffect } from 'react';
import axios from 'axios';
import { Clipboard, UserCheck, Activity, Stethoscope } from 'lucide-react';

export default function NurseDashboard({ user }) {
  const [appointments, setAppointments] = useState([]);
  const [activeTriage, setActiveTriage] = useState(null);

  const fetchData = async () => {
    const res = await axios.get(`http://localhost:3001/api/nurses/${user.id}/appointments`);
    setAppointments(res.data);
  };

  useEffect(() => { fetchData(); }, [user.id]);

  const handleTriageSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    await axios.post(`http://localhost:3001/api/appointments/${activeTriage.id}/triage`, {
      bp: formData.get('bp'),
      sugar: formData.get('sugar'),
      weight: formData.get('weight'),
      spo2: formData.get('spo2'),
      heartRate: formData.get('heartRate'),
      breathTraining: formData.get('breathTraining'),
      chiefComplaint: formData.get('chiefComplaint')
    });
    alert('Triage data saved! Appointment routed to Doctor.');
    setActiveTriage(null);
    fetchData();
  };

  return (
    <div className="dashboard-layout animate-fade-in">
      <div className="sidebar">
        <div className="mb-8 flex items-center gap-4 px-2">
          {user.profileImageUrl ? <img src={user.profileImageUrl} className="avatar" alt="Avatar"/> : <div className="avatar bg-gray-500"></div>}
          <div>
            <h4 style={{margin:0}}>{user.name}</h4>
            <p className="text-sm" style={{color:'var(--warning)'}}>Triage Nurse</p>
          </div>
        </div>
        <div className="sidebar-item active"><Clipboard size={20}/> <span>Triage Queue</span></div>
      </div>

      <div className="dashboard-content">
        <h2 className="text-gradient mb-2">Triage & Pre-Consultation Queue</h2>
        <p className="mb-8 text-secondary">Record vitals and chief complaints before routing the patient to the specialist.</p>
        
        <div className="grid grid-2 gap-8">
          
          {/* Pending Queue */}
          <div className="glass-card">
            <h3 className="mb-4 flex items-center gap-2"><UserCheck size={20}/> Waiting Patients</h3>
            <div className="flex-col gap-3">
              {appointments.length === 0 && <p className="text-sm text-secondary">No pending patients in the queue.</p>}
              {appointments.map(a => (
                <div key={a.id} className="p-4 flex justify-between items-center" style={{background: 'white', borderRadius: '12px', borderLeft: '4px solid var(--warning)', border: '1px solid #e2e8f0'}}>
                  <div>
                    <h4 style={{margin:0}}>{a.patient.name}</h4>
                    <p className="text-sm mt-1 text-secondary">Dr. {a.doctor.name} • {a.timeSlot}</p>
                  </div>
                  <button className="btn" style={{padding: '8px 16px', background: 'var(--warning)'}} onClick={() => setActiveTriage(a)}>Start Triage</button>
                </div>
              ))}
            </div>
          </div>

          {/* Active Triage Form */}
          <div className="glass-card" style={{borderTop: '4px solid var(--primary-color)'}}>
            {!activeTriage ? (
              <div className="h-full flex-col justify-center items-center text-center text-secondary py-12">
                <Activity size={48} className="mb-4" color="#cbd5e1" />
                <h3>No Active Triage</h3>
                <p>Select a patient from the queue to begin recording vitals.</p>
              </div>
            ) : (
              <div className="animate-fade-in">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 style={{margin:0, color: 'var(--primary-color)'}}>{activeTriage.patient.name}</h3>
                    <p className="text-sm mt-1">Routing to: Dr. {activeTriage.doctor.name}</p>
                  </div>
                  <button className="badge btn-secondary" onClick={()=>setActiveTriage(null)}>Cancel</button>
                </div>

                <form onSubmit={handleTriageSubmit} className="flex-col gap-4">
                  <div className="grid grid-2" style={{gap: '16px'}}>
                    <div><label className="text-sm font-bold">Blood Pressure (mmHg)</label><input name="bp" placeholder="e.g. 120/80" required/></div>
                    <div><label className="text-sm font-bold">Heart Rate (bpm)</label><input name="heartRate" type="number" placeholder="e.g. 75" required/></div>
                    <div><label className="text-sm font-bold">SpO2 (%)</label><input name="spo2" type="number" placeholder="e.g. 98" required/></div>
                    <div><label className="text-sm font-bold">Blood Sugar (mg/dL)</label><input name="sugar" type="number" placeholder="e.g. 110" required/></div>
                    <div><label className="text-sm font-bold">Weight (kg)</label><input name="weight" type="number" step="0.1" placeholder="e.g. 70.5" required/></div>
                    <div>
                      <label className="text-sm font-bold">Breath Training?</label>
                      <select name="breathTraining" required>
                        <option value="Not Required">Not Required</option>
                        <option value="Completed">Completed</option>
                        <option value="Failed">Failed</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <label className="text-sm font-bold text-gradient flex items-center gap-1"><Stethoscope size={16}/> Chief Complaint / Issue</label>
                    <textarea name="chiefComplaint" rows="3" placeholder="Describe the symptoms exactly as reported by the patient..." style={{width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', marginTop: '8px', resize: 'vertical'}} required></textarea>
                  </div>

                  <button type="submit" className="btn w-full mt-4">Save Vitals & Route to Doctor</button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

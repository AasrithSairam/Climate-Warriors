import { Activity, ShieldCheck, Zap } from 'lucide-react';

export default function About() {
  return (
    <div className="container mt-8 animate-fade-in flex-col items-center">
      <div className="glass-card stagger-1" style={{maxWidth: '800px', margin: '0 auto', textAlign: 'center'}}>
        <Activity size={48} color="var(--primary-color)" className="glow-effect mb-4" style={{borderRadius: '50%'}} />
        <h1 className="text-gradient">Digitalizing Healthcare</h1>
        <p className="text-sm mb-8" style={{fontSize: '1.1rem', lineHeight: '1.8'}}>
          Just like how hard cash was revolutionized into UPI, we are transforming the medical field.
          AuraHealth establishes a persistent, privacy-preserving patient memory layer. It's a unified 
          health record that follows the patient, not the provider.
        </p>

        <div className="grid grid-2 text-left gap-4 mt-8">
          <div className="glass-card stagger-2" style={{background: 'rgba(0,0,0,0.2)'}}>
            <ShieldCheck color="var(--success)" className="mb-4" size={32} />
            <h3>Total Privacy Control</h3>
            <p className="text-sm">
              Patients have granular control over who sees what. You can revoke access for a specific doctor 
              instantly, and the AI memory layer will dynamically filter out restricted data.
            </p>
          </div>
          
          <div className="glass-card stagger-3" style={{background: 'rgba(0,0,0,0.2)'}}>
            <Zap color="var(--warning)" className="mb-4" size={32} />
            <h3>AI Point of Care</h3>
            <p className="text-sm">
              Doctors receive real-time, AI-synthesized summaries tailored to their specialty. It highlights 
              risks, history, and active prescriptions instantly, saving precious time.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

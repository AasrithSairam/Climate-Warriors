const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.triageData.deleteMany();
  await prisma.medicalRecord.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.issue.deleteMany();
  await prisma.consentRule.deleteMany();
  await prisma.hospitalPatient.deleteMany();
  await prisma.hospitalDoctor.deleteMany();
  await prisma.user.deleteMany();
  await prisma.hospital.deleteMany();

  const h1 = await prisma.hospital.create({ 
    data: { 
      name: 'Apollo Speciality Hospitals', location: 'Vanagaram, Chennai', 
      imageUrl: 'https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?q=80&w=600&auto=format&fit=crop',
      rating: 4.8, reviewsCount: 342, specialties: 'Cardiology, Orthopedics, General',
      sector: 'Private', facilityLevel: 'Multispeciality', consultationFee: 800,
      procedureCosts: JSON.stringify({ "Open-Heart Surgery": "₹2.8 Lakh", "Knee Replacement": "₹1.5 Lakh" }),
      insuranceNetwork: "Cashless, In-Network", readmissionRate: 2.1, accreditations: "NABH, JCI",
      erWaitTime: 12, icuBeds: 14, isDigitallyIntegrated: true
    } 
  });
  
  const h2 = await prisma.hospital.create({ 
    data: { 
      name: 'Medway Hospitals', location: 'Kodambakkam, Chennai',
      imageUrl: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?q=80&w=600&auto=format&fit=crop',
      rating: 4.6, reviewsCount: 128, specialties: 'Psychology, Pediatrics',
      sector: 'Private', facilityLevel: 'General', consultationFee: 500,
      procedureCosts: JSON.stringify({ "Appendectomy": "₹45,000" }),
      insuranceNetwork: "Cashless", readmissionRate: 4.5, accreditations: "NABH",
      erWaitTime: 25, icuBeds: 5, isDigitallyIntegrated: true
    } 
  });
  
  const h3 = await prisma.hospital.create({ 
    data: { 
      name: 'Rajiv Gandhi Government Hospital', location: 'Central, Chennai',
      imageUrl: 'https://images.unsplash.com/photo-1538108149393-fbbd81895907?q=80&w=600&auto=format&fit=crop',
      rating: 4.2, reviewsCount: 512, specialties: 'Neurology, Oncology, Surgery',
      sector: 'Government', facilityLevel: 'Multispeciality', consultationFee: 0,
      procedureCosts: JSON.stringify({ "Open-Heart Surgery": "₹0 - ₹95,000" }),
      insuranceNetwork: "Public Health Schemes", readmissionRate: 8.2, accreditations: "NABH",
      erWaitTime: 120, icuBeds: 0, isDigitallyIntegrated: false
    } 
  });

  const patient1 = await prisma.user.create({
    data: { 
      role: 'PATIENT', name: 'John Doe', email: 'john@example.com', password: 'password123', dob: new Date('1990-05-15'),
      profileImageUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200&auto=format&fit=crop',
      allergies: 'Penicillin, Peanuts', chronicConditions: 'Asthma, Mild Hypertension',
      phone: '+91 9876543210', address: '123 Anna Nagar, Chennai', language: 'EN'
    }
  });

  const doctor1 = await prisma.user.create({
    data: { 
      role: 'DOCTOR', name: 'Dr. Sarah Smith', email: 'sarah@example.com', password: 'password123', specialty: 'Psychology',
      profileImageUrl: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?q=80&w=200&auto=format&fit=crop'
    }
  });

  const doctor2 = await prisma.user.create({
    data: { 
      role: 'DOCTOR', name: 'Dr. Alan Grant', email: 'alan@example.com', password: 'password123', specialty: 'Cardiology',
      profileImageUrl: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?q=80&w=200&auto=format&fit=crop'
    }
  });

  // Nurse
  const nurse1 = await prisma.user.create({
    data: { 
      role: 'NURSE', name: 'Nurse Priya', email: 'priya@example.com', password: 'password123',
      profileImageUrl: 'https://images.unsplash.com/photo-1582750433449-648ed127c09e?q=80&w=200&auto=format&fit=crop'
    }
  });

  await prisma.hospitalDoctor.create({ data: { userId: doctor1.id, hospitalId: h1.id } });
  await prisma.hospitalDoctor.create({ data: { userId: doctor2.id, hospitalId: h1.id } });
  await prisma.hospitalDoctor.create({ data: { userId: nurse1.id, hospitalId: h1.id } }); // Nurse attached to hospital

  await prisma.hospitalPatient.create({ data: { userId: patient1.id, hospitalId: h1.id } });
  await prisma.hospitalPatient.create({ data: { userId: patient1.id, hospitalId: h3.id } });

  await prisma.medicalRecord.createMany({
    data: [
      { patientId: patient1.id, hospitalId: h1.id, title: 'Asthma Diagnosis', type: 'NOTE', specialty: 'Pulmonology', content: 'Patient exhibits mild sports-induced asthma.', date: new Date('2005-04-10'), documentUrl: 'mock_pdf' },
      { patientId: patient1.id, hospitalId: h1.id, title: 'Albuterol Inhaler', type: 'MEDICATION', specialty: 'Pulmonology', content: 'As needed before exercise. 90mcg per actuation.', date: new Date('2005-04-10'), documentUrl: 'mock_pdf' },
      { patientId: patient1.id, hospitalId: h1.id, title: 'ECG Results', type: 'SCAN', specialty: 'Cardiology', content: 'Slight arrhythmia detected. Monitor closely.', date: new Date('2024-02-10'), documentUrl: 'mock_pdf' },
    ]
  });

  // Pending Appointment for Nurse Triage Workflow
  await prisma.appointment.create({
    data: { patientId: patient1.id, doctorId: doctor2.id, hospitalId: h1.id, status: 'PENDING', appointmentDate: '2026-05-10', timeSlot: '10:00 AM' }
  });

  console.log('Database seeded with Triage Workflow, Advanced Hospital Metrics, and Nurse user!');
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());

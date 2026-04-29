const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
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
      name: 'City General Hospital', location: 'Downtown', 
      imageUrl: 'https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?q=80&w=600&auto=format&fit=crop',
      rating: 4.8, reviewsCount: 342, specialties: 'Cardiology, Orthopedics, General'
    } 
  });
  const h2 = await prisma.hospital.create({ 
    data: { 
      name: 'Mercy Clinic', location: 'Westside',
      imageUrl: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?q=80&w=600&auto=format&fit=crop',
      rating: 4.5, reviewsCount: 128, specialties: 'Psychology, Pediatrics'
    } 
  });
  const h3 = await prisma.hospital.create({ 
    data: { 
      name: 'St. Jude Specialist Center', location: 'Uptown',
      imageUrl: 'https://images.unsplash.com/photo-1538108149393-fbbd81895907?q=80&w=600&auto=format&fit=crop',
      rating: 4.9, reviewsCount: 512, specialties: 'Neurology, Oncology, Surgery'
    } 
  });

  const patient1 = await prisma.user.create({
    data: { 
      role: 'PATIENT', name: 'John Doe', email: 'john@example.com', password: 'password123', dob: new Date('1990-05-15'),
      profileImageUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200&auto=format&fit=crop',
      allergies: 'Penicillin, Peanuts', chronicConditions: 'Asthma, Mild Hypertension'
    }
  });
  
  const patient2 = await prisma.user.create({
    data: { 
      role: 'PATIENT', name: 'Alice Walker', email: 'alice@example.com', password: 'password123', dob: new Date('1985-08-22'),
      profileImageUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=200&auto=format&fit=crop',
      allergies: 'None', chronicConditions: 'Type 2 Diabetes'
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

  await prisma.hospitalDoctor.create({ data: { userId: doctor1.id, hospitalId: h1.id } });
  await prisma.hospitalDoctor.create({ data: { userId: doctor2.id, hospitalId: h1.id } });
  await prisma.hospitalDoctor.create({ data: { userId: doctor2.id, hospitalId: h2.id } });

  await prisma.hospitalPatient.create({ data: { userId: patient1.id, hospitalId: h1.id } });
  await prisma.hospitalPatient.create({ data: { userId: patient2.id, hospitalId: h1.id } });
  await prisma.hospitalPatient.create({ data: { userId: patient2.id, hospitalId: h2.id } });

  // 30-YEAR TIMELINE FOR JOHN DOE WITH MOCK PDFS
  await prisma.medicalRecord.createMany({
    data: [
      { patientId: patient1.id, hospitalId: h1.id, title: 'Birth Record', type: 'NOTE', specialty: 'Pediatrics', content: 'Healthy baby boy born, 7lbs 2oz.', date: new Date('1990-05-15'), documentUrl: 'mock_pdf' },
      { patientId: patient1.id, hospitalId: h1.id, title: 'MMR Vaccine', type: 'VACCINE', specialty: 'General', content: 'First dose administered.', date: new Date('1991-06-20'), documentUrl: 'mock_pdf' },
      { patientId: patient1.id, hospitalId: h1.id, title: 'Broken Arm', type: 'NOTE', specialty: 'Orthopedics', content: 'Fractured radius from bicycle fall. Cast applied.', date: new Date('2000-08-12'), documentUrl: 'mock_pdf' },
      { patientId: patient1.id, hospitalId: h1.id, title: 'Arm X-Ray', type: 'SCAN', specialty: 'Orthopedics', content: 'Scan of fractured radius.', date: new Date('2000-08-12'), documentUrl: 'mock_pdf' },
      { patientId: patient1.id, hospitalId: h1.id, title: 'Asthma Diagnosis', type: 'NOTE', specialty: 'Pulmonology', content: 'Patient exhibits mild sports-induced asthma.', date: new Date('2005-04-10'), documentUrl: 'mock_pdf' },
      { patientId: patient1.id, hospitalId: h1.id, title: 'Albuterol Inhaler', type: 'MEDICATION', specialty: 'Pulmonology', content: 'As needed before exercise. 90mcg per actuation.', date: new Date('2005-04-10'), documentUrl: 'mock_pdf' },
      { patientId: patient1.id, hospitalId: h1.id, title: 'Routine Bloodwork', type: 'LAB', specialty: 'General', content: 'Cholesterol slightly elevated. Recommended diet changes.', date: new Date('2018-09-05'), documentUrl: 'mock_pdf' },
      { patientId: patient1.id, hospitalId: h1.id, title: 'Therapy Session 1', type: 'NOTE', specialty: 'Psychology', content: 'Discussed work-related stress. Recommended CBT.', date: new Date('2023-01-15'), documentUrl: 'mock_pdf' },
      { patientId: patient1.id, hospitalId: h1.id, title: 'ECG Results', type: 'SCAN', specialty: 'Cardiology', content: 'Slight arrhythmia detected. Monitor closely.', date: new Date('2024-02-10'), documentUrl: 'mock_pdf' },
    ]
  });

  // TIMELINE FOR ALICE
  await prisma.medicalRecord.createMany({
    data: [
      { patientId: patient2.id, hospitalId: h2.id, title: 'Birth Record', type: 'NOTE', specialty: 'Pediatrics', content: 'Healthy.', date: new Date('1985-08-22'), documentUrl: 'mock_pdf' },
      { patientId: patient2.id, hospitalId: h2.id, title: 'Appendectomy', type: 'NOTE', specialty: 'Surgery', content: 'Emergency removal of appendix. No complications.', date: new Date('2005-11-03'), documentUrl: 'mock_pdf' },
      { patientId: patient2.id, hospitalId: h1.id, title: 'Cardiac Stress Test', type: 'LAB', specialty: 'Cardiology', content: 'Excellent cardiovascular health.', date: new Date('2023-07-21'), documentUrl: 'mock_pdf' },
    ]
  });

  // Pending Appointments
  await prisma.appointment.create({
    data: { patientId: patient1.id, doctorId: doctor2.id, hospitalId: h1.id, status: 'PENDING', appointmentDate: '2026-05-10', timeSlot: '10:00 AM' }
  });
  
  await prisma.appointment.create({
    data: { patientId: patient2.id, doctorId: doctor1.id, hospitalId: h1.id, status: 'PENDING', appointmentDate: '2026-05-12', timeSlot: '02:30 PM' }
  });

  console.log('Database seeded with enhanced media, ratings, and mock PDF records!');
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());

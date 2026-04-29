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

  const h1 = await prisma.hospital.create({ data: { name: 'City General Hospital', location: 'Downtown' } });
  const h2 = await prisma.hospital.create({ data: { name: 'Mercy Clinic', location: 'Westside' } });
  const h3 = await prisma.hospital.create({ data: { name: 'St. Jude Specialist Center', location: 'Uptown' } });

  const patient1 = await prisma.user.create({
    data: { role: 'PATIENT', name: 'John Doe', email: 'john@example.com', password: 'password123', dob: new Date('1990-05-15') }
  });
  
  const patient2 = await prisma.user.create({
    data: { role: 'PATIENT', name: 'Alice Walker', email: 'alice@example.com', password: 'password123', dob: new Date('1985-08-22') }
  });

  const doctor1 = await prisma.user.create({
    data: { role: 'DOCTOR', name: 'Dr. Sarah Smith', email: 'sarah@example.com', password: 'password123', specialty: 'Psychology' }
  });
  
  const doctor2 = await prisma.user.create({
    data: { role: 'DOCTOR', name: 'Dr. Alan Grant', email: 'alan@example.com', password: 'password123', specialty: 'Cardiology' }
  });

  await prisma.hospitalDoctor.create({ data: { userId: doctor1.id, hospitalId: h1.id } });
  await prisma.hospitalDoctor.create({ data: { userId: doctor2.id, hospitalId: h1.id } });
  await prisma.hospitalDoctor.create({ data: { userId: doctor2.id, hospitalId: h2.id } });

  await prisma.hospitalPatient.create({ data: { userId: patient1.id, hospitalId: h1.id } });
  await prisma.hospitalPatient.create({ data: { userId: patient2.id, hospitalId: h1.id } });
  await prisma.hospitalPatient.create({ data: { userId: patient2.id, hospitalId: h2.id } });

  // 30-YEAR TIMELINE FOR JOHN DOE
  await prisma.medicalRecord.createMany({
    data: [
      { patientId: patient1.id, hospitalId: h1.id, title: 'Birth Record', type: 'NOTE', specialty: 'Pediatrics', content: 'Healthy baby boy born, 7lbs 2oz.', date: new Date('1990-05-15') },
      { patientId: patient1.id, hospitalId: h1.id, title: 'MMR Vaccine', type: 'VACCINE', specialty: 'General', content: 'First dose administered.', date: new Date('1991-06-20') },
      { patientId: patient1.id, hospitalId: h1.id, title: 'Broken Arm', type: 'NOTE', specialty: 'Orthopedics', content: 'Fractured radius from bicycle fall. Cast applied.', date: new Date('2000-08-12') },
      { patientId: patient1.id, hospitalId: h1.id, title: 'Asthma Diagnosis', type: 'NOTE', specialty: 'Pulmonology', content: 'Patient exhibits mild sports-induced asthma.', date: new Date('2005-04-10') },
      { patientId: patient1.id, hospitalId: h1.id, title: 'Albuterol Inhaler', type: 'MEDICATION', specialty: 'Pulmonology', content: 'As needed before exercise.', date: new Date('2005-04-10') },
      { patientId: patient1.id, hospitalId: h1.id, title: 'Routine Bloodwork', type: 'LAB', specialty: 'General', content: 'Cholesterol slightly elevated. Recommended diet changes.', date: new Date('2018-09-05') },
      { patientId: patient1.id, hospitalId: h1.id, title: 'Therapy Session 1', type: 'NOTE', specialty: 'Psychology', content: 'Discussed work-related stress. Recommended CBT.', date: new Date('2023-01-15') },
      { patientId: patient1.id, hospitalId: h1.id, title: 'ECG Results', type: 'LAB', specialty: 'Cardiology', content: 'Slight arrhythmia detected. Monitor closely.', date: new Date('2024-02-10') },
    ]
  });

  // TIMELINE FOR ALICE
  await prisma.medicalRecord.createMany({
    data: [
      { patientId: patient2.id, hospitalId: h2.id, title: 'Birth Record', type: 'NOTE', specialty: 'Pediatrics', content: 'Healthy.', date: new Date('1985-08-22') },
      { patientId: patient2.id, hospitalId: h2.id, title: 'Appendectomy', type: 'NOTE', specialty: 'Surgery', content: 'Emergency removal of appendix. No complications.', date: new Date('2005-11-03') },
      { patientId: patient2.id, hospitalId: h1.id, title: 'Cardiac Stress Test', type: 'LAB', specialty: 'Cardiology', content: 'Excellent cardiovascular health.', date: new Date('2023-07-21') },
    ]
  });

  // Pending Appointments
  await prisma.appointment.create({
    data: { patientId: patient1.id, doctorId: doctor2.id, hospitalId: h1.id, status: 'PENDING', appointmentDate: '2026-05-10', timeSlot: '10:00 AM' }
  });
  
  await prisma.appointment.create({
    data: { patientId: patient2.id, doctorId: doctor1.id, hospitalId: h1.id, status: 'PENDING', appointmentDate: '2026-05-12', timeSlot: '02:30 PM' }
  });

  console.log('Database seeded with 30-year history for 2 patients and 2 doctors!');
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());

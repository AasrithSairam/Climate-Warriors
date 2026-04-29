const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const app = express();

app.use(cors());
app.use(express.json());

// Auth
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });
  if (user && user.password === password) {
    res.json(user);
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// Patients
app.get('/api/patients/:id', async (req, res) => {
  const patient = await prisma.user.findUnique({
    where: { id: req.params.id },
    include: {
      patientHospitals: { include: { hospital: { include: { doctors: { include: { user: true } } } } } },
      consents: true,
      patientAppointments: { include: { doctor: true, hospital: true, records: true, triageData: true } },
      medicalRecords: { include: { appointment: { include: { doctor: true } } } }
    }
  });
  res.json(patient);
});

// Update Profile
app.put('/api/patients/:id', async (req, res) => {
  const { phone, address, language, allergies, chronicConditions } = req.body;
  const updated = await prisma.user.update({
    where: { id: req.params.id },
    data: { phone, address, language, allergies, chronicConditions }
  });
  res.json(updated);
});

// Mock Document Upload
app.post('/api/patients/:id/upload', async (req, res) => {
  const { hospitalId, title, type, specialty, content } = req.body;
  const record = await prisma.medicalRecord.create({
    data: { patientId: req.params.id, hospitalId, title, type, specialty, content, documentUrl: 'mock_pdf_uploaded' }
  });
  res.json(record);
});

// Hospitals
app.get('/api/hospitals', async (req, res) => {
  const hospitals = await prisma.hospital.findMany({ include: { doctors: { include: { user: true } } } });
  res.json(hospitals);
});

app.post('/api/patients/:id/join', async (req, res) => {
  const { hospitalId } = req.body;
  try {
    const joined = await prisma.hospitalPatient.create({ data: { userId: req.params.id, hospitalId } });
    res.json(joined);
  } catch (err) { res.status(400).json({ error: 'Already joined or invalid' }); }
});

app.post('/api/patients/:id/consent', async (req, res) => {
  const { hospitalId, specialty, doctorId, isAllowed } = req.body;
  const consent = await prisma.consentRule.create({ data: { patientId: req.params.id, hospitalId, specialty, doctorId, isAllowed } });
  res.json(consent);
});

// Appointments
app.post('/api/appointments', async (req, res) => {
  const { patientId, doctorId, hospitalId, appointmentDate, timeSlot } = req.body;
  const appt = await prisma.appointment.create({
    data: { patientId, doctorId, hospitalId, status: 'PENDING', appointmentDate, timeSlot }
  });
  res.json(appt);
});

// Nurse Workflow
app.get('/api/nurses/:id/appointments', async (req, res) => {
  const nurseHospitals = await prisma.hospitalDoctor.findMany({ where: { userId: req.params.id } });
  const hospitalIds = nurseHospitals.map(nh => nh.hospitalId);

  const appointments = await prisma.appointment.findMany({
    where: { hospitalId: { in: hospitalIds }, status: 'PENDING' },
    include: { patient: true, doctor: true, hospital: true }
  });
  res.json(appointments);
});

// Nurse Triage Submit
app.post('/api/appointments/:id/triage', async (req, res) => {
  const { bp, sugar, weight, spo2, heartRate, breathTraining, chiefComplaint } = req.body;
  const triage = await prisma.triageData.create({
    data: { 
      appointmentId: req.params.id, 
      bp, sugar: parseInt(sugar), weight: parseFloat(weight), 
      spo2: parseInt(spo2), heartRate: parseInt(heartRate), 
      breathTraining, chiefComplaint 
    }
  });
  
  const appt = await prisma.appointment.update({
    where: { id: req.params.id },
    data: { status: 'DOCTOR', issueString: chiefComplaint }
  });
  
  res.json({ triage, appt });
});

// Doctor Dashboard
app.get('/api/doctors/:id/patients', async (req, res) => {
  const doctorHospitals = await prisma.hospitalDoctor.findMany({ where: { userId: req.params.id } });
  const hospitalIds = doctorHospitals.map(dh => dh.hospitalId);

  const patients = await prisma.hospitalPatient.findMany({
    where: { hospitalId: { in: hospitalIds } },
    include: { user: true, hospital: true }
  });
  
  const appointments = await prisma.appointment.findMany({
    where: { doctorId: req.params.id },
    include: { patient: true, hospital: true, triageData: true }
  });

  res.json({ patients, appointments });
});

// Doctor completes appointment / prescribes
app.post('/api/appointments/:id/prescribe', async (req, res) => {
  const { patientId, hospitalId, title, type, specialty, content } = req.body;
  const record = await prisma.medicalRecord.create({
    data: { patientId, hospitalId, appointmentId: req.params.id, title, type, specialty, content, documentUrl: 'mock_pdf' }
  });
  await prisma.appointment.update({ where: { id: req.params.id }, data: { status: 'COMPLETED' } });
  res.json(record);
});

// Filtered Records logic...
app.get('/api/patients/:id/records', async (req, res) => {
  const { doctorId } = req.query;
  const patientId = req.params.id;

  const doctor = await prisma.user.findUnique({
    where: { id: doctorId }, include: { doctorHospitals: true }
  });

  const allRecords = await prisma.medicalRecord.findMany({ where: { patientId } });
  const consents = await prisma.consentRule.findMany({ where: { patientId } });
  const doctorHospitalIds = doctor.doctorHospitals.map(dh => dh.hospitalId);
  
  const allowedRecords = allRecords.filter(record => {
    let allowed = true;
    for (const rule of consents) {
      if (rule.doctorId && rule.doctorId === doctorId) { allowed = rule.isAllowed; continue; }
      if (rule.hospitalId && !doctorHospitalIds.includes(rule.hospitalId)) continue;
      if (rule.specialty && rule.specialty !== doctor.specialty && !rule.doctorId) continue;
      if (!rule.isAllowed) allowed = false;
      if (rule.isAllowed) allowed = true;
    }
    return allowed;
  });

  res.json({ patientId, doctorSpecialty: doctor.specialty, records: allowedRecords });
});

app.listen(3001, () => console.log('Backend running on http://localhost:3001'));

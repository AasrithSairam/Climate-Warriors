const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const multer = require('multer');
const path = require('path');
const axios = require('axios');
const fs = require('fs');

const prisma = new PrismaClient();
const app = express();

const upload = multer({ dest: 'uploads/' });
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use(cors());
app.use(express.json());

// Auth
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  console.log(`Login attempt: email=${email}, password=${password}`);
  const user = await prisma.user.findUnique({ where: { email } });
  if (user) {
    console.log(`User found in DB: email=${user.email}, expected_password=${user.password}`);
    if (user.password === password) {
      console.log("Login successful");
      res.json(user);
    } else {
      console.log("Password mismatch");
      res.status(401).json({ error: 'Invalid credentials' });
    }
  } else {
    console.log("User not found");
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// Patients
app.get('/api/patients/:id', async (req, res) => {
  console.log(`Fetching data for patient: ${req.params.id}`);
  try {
    const patient = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: {
        patientHospitals: { include: { hospital: { include: { doctors: { include: { user: true } } } } } },
        consents: true,
        patientAppointments: { include: { doctor: true, hospital: true, records: true, triageData: true } },
        medicalRecords: true
      }
    });
    console.log(`Data found for ${req.params.id}, sending response...`);
    res.json(patient);
  } catch (error) {
    console.error(`Error fetching patient ${req.params.id}:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
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

// Smart Upload & Vision Processing
app.post('/api/upload-record', upload.single('file'), async (req, res) => {
  const { patientId, hospitalId, specialty } = req.body;
  const file = req.file;

  if (!file) return res.status(400).json({ error: 'No file uploaded' });

  try {
    // 1. Send to AI Vision Agent for processing
    // Note: We send the absolute path to the AI service
    const filePath = path.resolve(file.path);
    const aiResponse = await axios.post('http://localhost:8005/vision/process', {
      file_path: filePath,
      patient_id: patientId
    });

    const parsedData = aiResponse.data.records; // Array of structured records

    // 2. Save all parsed records to database
    const savedRecords = await Promise.all(parsedData.map(record => 
      prisma.medicalRecord.create({
        data: {
          patientId: patientId,
          hospitalId: hospitalId || "mock-h-1",
          title: record.title,
          type: record.type || 'MEDICATION',
          specialty: specialty || 'General Physician',
          content: record.content,
          date: record.date || new Date().toISOString().split('T')[0],
          documentUrl: `/uploads/${file.filename}`
        }
      })
    ));

    res.json({ message: 'Record processed successfully', records: savedRecords });
  } catch (error) {
    console.error('Upload Error:', error.message);
    res.status(500).json({ error: 'Failed to process medical record with AI' });
  }
});

// Admin Governance
app.get('/api/admins/:id/hospital', async (req, res) => {
  try {
    // Direct hospital lookup for admin
    const adminLink = await prisma.hospitalAdmin.findFirst({
      where: { userId: req.params.id },
      include: {
        hospital: {
          include: {
            doctors: { include: { user: true } },
            patients: { include: { user: true } },
            appointments: { include: { patient: true, doctor: true } }
          }
        }
      }
    });

    if (!adminLink) return res.status(404).json({ error: 'Hospital not found' });
    res.json(adminLink.hospital);
  } catch (error) {
    console.error('Admin Fetch Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(3001, () => console.log('Backend running on http://localhost:3001'));

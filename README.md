# AuraHealth: Privacy-Preserving Patient Memory Layer

![AuraHealth Banner](frontend/src/assets/hero.png) *(Note: Replace with actual banner if available)*

Healthcare data today is siloed, slow, and inaccessible. Patients leave fragments of their medical history across various dentists, primary doctors, emergency rooms, and pharmacies. When a patient visits a new specialist, that doctor only sees a tiny piece of the puzzle, leading to slow care, repeated tests, and potential medical errors.

**AuraHealth** is an AI-agent-powered platform that fixes this broken system by establishing a persistent, privacy-preserving patient memory layer. It acts as a highly secure, digital "health backpack" that contains a patient's entire longitudinal record—from birth to present day—and follows the patient, not the provider.

## 🚀 Key Features

### 1. Granular Privacy & Consent
Patients have total, precise control over their data. Through the intuitive consent matrix, a patient can allow a Psychologist to see their therapy notes but explicitly deny them access to their Cardiology records. Access can be revoked instantly at any time.

### 2. AI-Powered Point of Care (Memory Layer)
Instead of forcing doctors to sift through hundreds of scattered records, our Orchestrated Network of AI Agents (powered by Gemini) instantly synthesizes the patient's history. It dynamically generates a concise, clinically relevant summary tailored specifically for the doctor's specialty, highlighting critical cross-specialty risks (like allergies). **Crucially, the AI only synthesizes data the patient has explicitly consented to share.**

### 3. Longitudinal Medical Timeline
A beautiful, chronological visualization of a patient's entire medical history, spanning decades. From birth records and childhood vaccines to recent lab results, the timeline aggregates data across all connected hospital networks into one seamless view.

### 4. Seamless Digital Onboarding & Appointments
Patients can digitally join new hospital networks without standing in line, using a secure identity verification system (Mock OTP). Once connected, patients can seamlessly book appointments with specific time slots.

## 🛠️ Technology Stack

The platform is split into three highly decoupled microservices:

- **Frontend**: React, Vite, Vanilla CSS (Glassmorphism UI)
- **Backend (API & Auth)**: Node.js, Express.js, Prisma ORM, SQLite
- **AI Orchestration Layer**: Python, FastAPI, Google Gemini 

## 💻 How to Run Locally

### Prerequisites
- Node.js (v18+)
- Python (v3.10+)
- Gemini API Key

### 1. Start the Backend
```bash
cd backend
npm install
npx prisma db push
npx prisma generate
node seed.js    # Seeds the DB with a 30-year medical history for 2 patients
node index.js   # Runs on http://localhost:3001
```

### 2. Start the AI Layer
```bash
cd ai
python -m venv venv
.\venv\Scripts\activate   # Or source venv/bin/activate on Mac/Linux
pip install -r requirements.txt # (fastapi, uvicorn, google-generativeai)
# Make sure to add your GEMINI_API_KEY to a .env file in the ai folder
uvicorn main:app --port 8000 --reload
```

### 3. Start the Frontend
```bash
cd frontend
npm install
npm run dev     # Runs on http://localhost:5173
```

### Demo Accounts
- **Patient**: `john@example.com` / `password123`
- **Psychologist**: `sarah@example.com` / `password123`
- **Cardiologist**: `alan@example.com` / `password123`

---

## 👥 Team Members
This project was proudly built by:
- **Ponguru Aasrith Sairam**
- **Akshaya Sree G**
- **Tarun S**
- **S Lalit Chandran**

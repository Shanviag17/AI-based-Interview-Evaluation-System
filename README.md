# InterviewIQ AI - Intelligent Interview Evaluation System

InterviewIQ AI is a state-of-the-art, full-stack mock interview platform designed to help candidates prepare for real-world job interviews. Using the power of LLMs (via Hugging Face), the system analyzes your resume and role requirements to provide a tailored, immersive, and evaluative experience.

---

## ✅ Core Features Checklist

- [x] **AI-Powered Question Generation**: Tailored questions based on your specific resume content and target job role.
- [x] **Voice Interaction (TTS)**: The AI "interviewer" reads questions aloud to simulate a real conversation.
- [x] **Speech-to-Text (STT) Answering**: Answer questions using your voice; the system transcribes your speech in real-time.
- [x] **Real-time Performance Evaluation**: Get immediate scores (0-100) and detailed feedback for every response.
- [x] **Side-by-Side Comparison**: Compare your answers directly against AI-generated "Model Answers" on the result page.
- [x] **Originality Check**: Integrated plagiarism detection to ensure answers aren't copied from common online resources.
- [x] **Dynamic Timer**: Controlled pacing with a 60-second limit per question.
- [x] **Session Recovery**: Progress is saved locally; refresh the page without losing your current interview state.
- [x] **Dark/Light Mode**: Fully responsive UI with high-quality Glassmorphism aesthetics.

---

## 🔄 User Workflow

1.  **Profile Setup**: 
    *   Set your name and upload a profile picture.
2.  **Configuration**: 
    *   Select your target **Role** (e.g., Backend Developer).
    *   Select **Interview Mode** (Technical, Behavioral, or HR).
    *   Select **Difficulty Level**.
3.  **Resume Upload**: 
    *   Upload your resume in PDF format. The system extracts your skills and experience using PyMuPDF.
4.  **The Interview**: 
    *   The AI generates 5 custom questions.
    *   Listen to the question (TTS) or read it on screen.
    *   Speak your answer using the microphone (STT) or type it manually.
5.  **Assessment**: 
    *   Submit your interview for a parallel AI evaluation and plagiarism check.
6.  **Results & Feedback**: 
    *   Review your **Performance Report**.
    *   Analyze the **Side-by-Side comparison** to see where you can improve.
    *   Download or Print your report for later review.

---

## 🛠️ Technology Stack

- **Frontend**: React 19, Vite, Axios, Chart.js.
- **Backend**: FastAPI (Python), PyMuPDF (fitz), scikit-learn.
- **AI Engine**: Hugging Face Inference API (Model: `Llama-3.3-70B`).
- **Voice Engine**: Web Speech API (Synthesis & Recognition).

---

## 🚀 Getting Started

### Prerequisites
- Python 3.x
- Node.js (v18+)
- Hugging Face API Token

### Setup
1.  **Clone the Repo**:
    ```bash
    git clone https://github.com/Shanviag17/AI-based-Interview-Evaluation-System.git
    ```
2.  **Backend Setup**:
    ```bash
    cd backend
    pip install -r requirements.txt # Or install: fastapi uvicorn pymupdf scikit-learn huggingface_hub python-dotenv
    # Create key.env and add: HF_TOKEN=your_token_here
    uvicorn main:app --reload
    ```
3.  **Frontend Setup**:
    ```bash
    cd frontend
    npm install
    npm run dev
    ```

---

## 📝 License
This project is open-source and available under the MIT License.

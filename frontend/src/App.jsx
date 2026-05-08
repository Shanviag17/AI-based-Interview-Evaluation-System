// Updated UI Version 2.0
import { useState, useRef, useEffect } from "react";
import axios from "axios";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";
import "./App.css";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

function App() {
  const fileInputRef = useRef(null);
  const [resume, setResume] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState(localStorage.getItem("role") || "Backend Developer");
  const [mode, setMode] = useState(localStorage.getItem("mode") || "Technical");
  const [difficulty, setDifficulty] = useState(localStorage.getItem("difficulty") || "Intermediate");
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(
    parseInt(localStorage.getItem("currentQuestionIndex")) || 0
  );
  const [timeLeft, setTimeLeft] = useState(
    parseInt(localStorage.getItem("timeLeft")) || 60
  );
  const [timerActive, setTimerActive] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "light");
  const [scoreHistory, setScoreHistory] = useState(
    JSON.parse(localStorage.getItem("scoreHistory")) || []
  );
  const [loadingMessage, setLoadingMessage] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  // Speech to Text Logic
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = "en-US";

      recognitionRef.current.onresult = (event) => {
        let transcript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        
        setAnswers(prev => ({
          ...prev,
          [currentQuestionIndex]: (prev[currentQuestionIndex] || "") + " " + transcript
        }));
      };

      recognitionRef.current.onend = () => setIsListening(false);
      recognitionRef.current.onerror = () => setIsListening(false);
    }
  }, [currentQuestionIndex]);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      if (!recognitionRef.current) {
        alert("Speech recognition is not supported in your browser. Please try Chrome.");
        return;
      }
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  // Text to Speech Function
  const speakQuestion = (text) => {
    window.speechSynthesis.cancel(); // Stop any current speech
    if (!text) return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => v.name.includes("Google US English") || v.name.includes("Female")) || voices[0];
    if (preferredVoice) utterance.voice = preferredVoice;

    utterance.rate = 0.95;
    window.speechSynthesis.speak(utterance);
  };

  // Auto-speak when question changes
  useEffect(() => {
    if (questions.length > 0 && !result && !loading && timerActive) {
      speakQuestion(questions[currentQuestionIndex]);
    }
    return () => window.speechSynthesis.cancel();
  }, [currentQuestionIndex, questions.length, result, loading, timerActive]);
  const [userName, setUserName] = useState(localStorage.getItem("userName") || "Student Profile");
  const [userImage, setUserImage] = useState(localStorage.getItem("userImage") || null);
  const profilePicInputRef = useRef(null);

  // Simulating loading progress for the UI bar
  useEffect(() => {
    let interval;
    if (loading) {
      let progress = 0;
      interval = setInterval(() => {
        progress += Math.random() * 15;
        if (progress > 95) progress = 95; // Cap at 95% until finished
        const bar = document.querySelector(".loading-bar-fill");
        if (bar) bar.style.width = `${progress}%`;
      }, 400);
    }
    return () => {
      if (interval) clearInterval(interval);
      // Reset bar when loading stops
      const bar = document.querySelector(".loading-bar-fill");
      if (bar) bar.style.width = "0%";
    };
  }, [loading]);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result;
        setUserImage(base64String);
        localStorage.setItem("userImage", base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleNameChange = () => {
    const newName = prompt("Enter your name:", userName);
    if (newName && newName.trim()) {
      setUserName(newName);
      localStorage.setItem("userName", newName);
    }
  };

  const TIME_PER_QUESTION = 60;

  // Persistence logic for interview state
  useEffect(() => {
    if (questions.length > 0) {
      localStorage.setItem("questions", JSON.stringify(questions));
      localStorage.setItem("answers", JSON.stringify(answers));
      localStorage.setItem("currentQuestionIndex", currentQuestionIndex);
      localStorage.setItem("role", role);
      localStorage.setItem("mode", mode);
      localStorage.setItem("difficulty", difficulty);
    }
  }, [questions, answers, currentQuestionIndex, role, mode, difficulty]);

  useEffect(() => {
    if (timerActive) {
      localStorage.setItem("timeLeft", timeLeft);
    }
  }, [timeLeft, timerActive]);

  // Restore session on mount
  useEffect(() => {
    const savedQuestions = localStorage.getItem("questions");
    const savedAnswers = localStorage.getItem("answers");
    if (savedQuestions) {
      setQuestions(JSON.parse(savedQuestions));
      if (savedAnswers) setAnswers(JSON.parse(savedAnswers));
      setTimerActive(true);
      
      // Auto-scroll to current state
      setTimeout(() => {
        window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
      }, 500);
    }
  }, []);

  const clearInterviewProgress = () => {
    localStorage.removeItem("questions");
    localStorage.removeItem("answers");
    localStorage.removeItem("currentQuestionIndex");
    localStorage.removeItem("timeLeft");
    // We keep role/mode/difficulty as preferences
  };

  // Theme logic
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  // Timer logic
  useEffect(() => {
    let timer;
    if (timerActive && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      handleNextQuestion();
    }
    return () => clearInterval(timer);
  }, [timerActive, timeLeft]);

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
      setTimeLeft(TIME_PER_QUESTION);
    } else {
      setTimerActive(false);
      submitAnswers();
    }
  };

  const uploadResume = async () => {
    console.log("Generate Questions clicked");
    if (!resume) {
      alert("Upload resume first");
      return;
    }

    // Reset previous interview state
    setQuestions([]);
    setAnswers({});
    setResult(null);
    setCurrentQuestionIndex(0);
    setTimeLeft(TIME_PER_QUESTION);
    setTimerActive(false);
    clearInterviewProgress();

    console.log("Resume and Role:", resume.name, role);
    setLoadingMessage("Analyzing Profile & Generating Questions...");
    setLoading(true);

    // Auto-scroll down so the user sees the loading bar
    setTimeout(() => {
      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
    }, 100);

    let formData = new FormData();
    formData.append("file", resume);
    formData.append("role", role);
    formData.append("mode", mode);
    formData.append("difficulty", difficulty);

    try {
      console.log("Sending POST request to /upload...");
      const res = await axios.post("http://localhost:8000/upload", formData);
      console.log("Response received:", res.data);
      setQuestions(res.data.questions);
      setTimerActive(true);
      setResume(null); // Clear the file state
      if (fileInputRef.current) fileInputRef.current.value = ""; // Clear the file input visually
    } catch (err) {
      console.error("Upload error:", err);
      alert(`Question generation failed: ${err.message || 'Unknown error'}. Check if backend is running on port 8000.`);
    }

    setLoading(false);
  };

  const submitAnswers = async () => {
    setTimerActive(false);
    setLoadingMessage("Evaluating your Performance & Checking Originality...");
    setLoading(true);
    try {
      console.log("Submitting answers for evaluation...");
      const res = await axios.post("http://localhost:8000/evaluate", { questions, answers });
      console.log("Evaluation result:", res.data);
      setResult(res.data);
      
      // Update score history
      const newHistory = [...scoreHistory, {
        date: new Date().toLocaleDateString(),
        score: res.data.score,
        role: role,
        mode: mode
      }].slice(-10); // Keep last 10 attempts
      
      setScoreHistory(newHistory);
      localStorage.setItem("scoreHistory", JSON.stringify(newHistory));
      
      clearInterviewProgress();
    } catch (err) {
      console.error("Submission error:", err);
      alert("Submission failed");
    } finally {
      setLoading(false);
    }
  };

  const chartData = {
    labels: scoreHistory.map((h, i) => `Session ${i + 1}`),
    datasets: [
      {
        label: "Performance Score",
        data: scoreHistory.map((h) => h.score),
        fill: true,
        backgroundColor: "rgba(99, 102, 241, 0.1)",
        borderColor: "#6366f1",
        tension: 0.4,
        pointRadius: 6,
        pointBackgroundColor: "#ec4899",
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context) => `Score: ${context.raw}%`,
          footer: (items) => {
            const index = items[0].dataIndex;
            const session = scoreHistory[index];
            return `Role: ${session.role}\nMode: ${session.mode}`;
          }
        }
      }
    },
    scales: {
      y: { min: 0, max: 100, grid: { color: "rgba(0, 0, 0, 0.05)" } },
      x: { grid: { display: false } }
    }
  };

  const answered = Object.keys(answers).length;

  const getScoreColor = (score) => {
    if (score >= 80) return "#10B981"; // Emerald
    if (score >= 60) return "#3B82F6"; // Blue
    if (score >= 40) return "#F59E0B"; // Amber
    return "#EF4444"; // Red
  };

  return (
    <div className="app-wrapper">
      {/* Navbar */}
      <div className="navbar">
        <h1>InterviewIQ AI</h1>
        <div style={{ display: "flex", gap: "20px", alignItems: "center" }}>
          <button className="theme-toggle" onClick={toggleTheme} title={`Switch to ${theme === "light" ? "Dark" : "Light"} Mode`}>
            {theme === "light" ? "🌙" : "☀️"}
          </button>
          <div className="navbar-badge">Smart Interview Platform</div>
        </div>
      </div>

      {/* Hero */}
      {!questions.length && !result && (
        <div className="hero-section">
          <div className="hero-content">
            <p className="hero-badge">AI Powered Interview Evaluation</p>
            <h1 className="hero-title">Practice. Evaluate. Get Hired.</h1>
            <p className="hero-subtitle">
              Personalized mock interviews with scoring, feedback and progress tracking.
            </p>
          </div>
        </div>
      )}

      <div className="main-content" style={{ marginTop: (!questions.length && !result) ? "-100px" : "40px" }}>
            {/* ... (rest of main-content stays the same) */}
        {/* Profile Sidebar */}
        <div className="profile-sidebar">
          <div className="card" style={{ marginTop: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "15px", marginBottom: "25px" }}>
              <div 
                onClick={() => profilePicInputRef.current.click()}
                style={{ 
                  width: "60px", 
                  height: "60px", 
                  borderRadius: "50%", 
                  background: userImage ? `url(${userImage})` : "linear-gradient(135deg, #6366f1 0%, #ec4899 100%)",
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  color: "white", 
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "center",
                  fontSize: "24px",
                  cursor: "pointer",
                  position: "relative",
                  border: "2px solid var(--border-color)",
                  overflow: "hidden"
                }}
                title="Click to change picture"
              >
                {!userImage && "👨‍🎓"}
                <div style={{
                  position: "absolute",
                  bottom: 0,
                  width: "100%",
                  background: "rgba(0,0,0,0.4)",
                  fontSize: "10px",
                  padding: "2px 0",
                  opacity: 0,
                  transition: "opacity 0.2s"
                }} className="pic-edit-label">
                  Edit
                </div>
              </div>
              <input 
                type="file" 
                ref={profilePicInputRef} 
                onChange={handleImageUpload} 
                accept="image/*" 
                style={{ display: "none" }} 
              />
              <div>
                <h3 
                  onClick={handleNameChange}
                  style={{ 
                    margin: 0, 
                    fontSize: "20px", 
                    color: "var(--text-primary)", 
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "5px"
                  }}
                  title="Click to edit name"
                >
                  {userName} <span>✏️</span>
                </h3>
                <p style={{ margin: 0, fontSize: "14px", color: "var(--text-secondary)" }}>Candidate ID: #9821</p>
              </div>
            </div>

            <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "20px" }}>
              <h4 style={{ margin: "0 0 10px 0", color: "var(--text-primary)" }}>Preparation Progress</h4>
              {scoreHistory.length > 0 ? (
                <div className="chart-container">
                  <Line data={chartData} options={chartOptions} />
                </div>
              ) : (
                <p style={{ fontSize: "14px", color: "var(--text-muted)", fontStyle: "italic" }}>
                  Complete your first interview to see progress tracking.
                </p>
              )}
            </div>

            <div style={{ marginTop: "30px", borderTop: "1px solid var(--border-color)", paddingTop: "20px" }}>
              <h4 style={{ margin: "0 0 15px 0", color: "var(--text-primary)" }}>Quick Stats</h4>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
                <span style={{ color: "var(--text-secondary)" }}>Interviews Taken</span>
                <span style={{ fontWeight: "700" }}>{scoreHistory.length}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
                <span style={{ color: "var(--text-secondary)" }}>Avg. Score</span>
                <span style={{ fontWeight: "700", color: "var(--accent)" }}>
                  {scoreHistory.length 
                    ? Math.round(scoreHistory.reduce((a, b) => a + b.score, 0) / scoreHistory.length) 
                    : 0}%
                </span>
              </div>
            </div>

            {scoreHistory.length > 0 && (
              <button 
                className="clear-history-btn" 
                onClick={() => {
                  if(confirm("Clear all session history?")) {
                    setScoreHistory([]);
                    localStorage.removeItem("scoreHistory");
                  }
                }}
              >
                🗑️ Clear History
              </button>
            )}
          </div>

          <div className="card">
            <h3 style={{ marginTop: 0, fontSize: "24px", color: "var(--text-primary)" }}>Active Session</h3>
            <div style={{ fontSize: "30px", fontWeight: "800", color: "#1D4ED8" }}>
              {answered}/{questions.length || 0}
            </div>
            <p style={{ color: "var(--text-secondary)" }}>Questions Completed</p>
            <div
              style={{
                marginTop: "20px",
                height: "10px",
                background: "var(--border-color)",
                borderRadius: "999px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${questions.length ? (answered / questions.length) * 100 : 0}%`,
                  background: "linear-gradient(90deg, var(--accent), var(--accent-secondary))",
                  transition: "width 0.3s ease",
                }}
              />
            </div>
            <div style={{ marginTop: "25px", fontSize: "14px" }}>
              <p style={{ margin: "5px 0" }}>
                <strong>Role:</strong> {role}
              </p>
              <p style={{ margin: "5px 0" }}>
                <strong>Mode:</strong> {mode}
              </p>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="content-area">
          <div className="dashboard-grid">
            {/* Left Card */}
            {!questions.length && !result && !loading && (
              <div className="card" style={{ marginTop: 0 }}>
                <h2 style={{ marginTop: 0, fontSize: "42px", fontWeight: "800", color: "var(--text-primary)" }}>
                  Start New Interview
                </h2>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "20px" }}>
                  <div>
                    <label className="form-label">Select Role</label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="form-select"
                    >
                      <option>Backend Developer</option>
                      <option>Frontend Developer</option>
                      <option>Fullstack Developer</option>
                      <option>Data Scientist</option>
                      <option>Product Manager</option>
                      <option>UX Designer</option>
                      <option>Data Analyst</option>
                    </select>
                  </div>

                  <div>
                    <label className="form-label">Select Mode</label>
                    <select
                      value={mode}
                      onChange={(e) => setMode(e.target.value)}
                      className="form-select"
                    >
                      <option>Technical</option>
                      <option>Behavioral</option>
                      <option>HR Round</option>
                      <option>System Design</option>
                    </select>
                  </div>

                  <div>
                    <label className="form-label">Difficulty</label>
                    <select
                      value={difficulty}
                      onChange={(e) => setDifficulty(e.target.value)}
                      className="form-select"
                    >
                      <option>Easy</option>
                      <option>Intermediate</option>
                      <option>Hard</option>
                    </select>
                  </div>
                </div>

                <div style={{ marginTop: "30px" }}>
                  <label className="form-label">Upload Resume</label>
                  <div className="upload-box">
                    <input
                      type="file"
                      id="resume-upload"
                      ref={fileInputRef}
                      style={{ display: "none" }}
                      onChange={(e) => setResume(e.target.files[0])}
                      accept=".pdf"
                    />
                    <label htmlFor="resume-upload" style={{ cursor: "pointer", display: "block" }}>
                      {resume ? (
                        <span style={{ color: "var(--text-primary)", fontWeight: "600", fontSize: "16px" }}>
                          📄 {resume.name}
                        </span>
                      ) : (
                        <span style={{ color: "#3b82f6", fontWeight: "600", fontSize: "16px" }}>
                          + Click to browse
                        </span>
                      )}
                    </label>
                  </div>
                </div>

                <div style={{ marginTop: "32px" }}>
                  <button 
                    className="primary-btn" 
                    onClick={uploadResume} 
                    disabled={loading}
                    style={{ opacity: loading ? 0.7 : 1, cursor: loading ? "not-allowed" : "pointer" }}
                  >
                    {loading ? "Processing..." : "Generate Questions"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {loading && (
            <div className="questions-container">
              <div className="card" style={{ textAlign: "center", padding: "50px 40px" }}>
                <h3 style={{ margin: 0, fontSize: "28px", color: "var(--text-primary)" }}>
                  {loadingMessage}
                </h3>
                <p style={{ color: "var(--text-secondary)", marginTop: "12px", fontSize: "16px" }}>
                  This process uses AI to provide the most accurate assessment and usually takes a few seconds.
                </p>
                <div className="loading-container">
                  <div className="loading-bar-bg">
                    <div className="loading-bar-fill"></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="questions-container">
            {questions.length > 0 && !result && !loading && (
              <div className="card">
                <div className="question-header">
                  <h3 style={{ margin: 0, fontSize: "30px" }}>Question {currentQuestionIndex + 1}</h3>
                  <div style={{ display: "flex", gap: "15px", alignItems: "center" }}>
                    <button 
                      onClick={() => speakQuestion(questions[currentQuestionIndex])}
                      className="theme-toggle" 
                      style={{ 
                        width: "40px", 
                        height: "40px", 
                        fontSize: "18px",
                        background: isSpeaking ? "var(--accent)" : "var(--input-bg)",
                        color: isSpeaking ? "white" : "var(--text-primary)",
                        border: isSpeaking ? "none" : "1px solid var(--input-border)",
                        animation: isSpeaking ? "pulse 1.5s infinite" : "none"
                      }}
                      title="Read Question Aloud"
                    >
                      {isSpeaking ? "🔊" : "🔈"}
                    </button>
                    <div
                      className="question-badge"
                      style={{
                        background: timeLeft < 10 ? "#fee2e2" : "#DBEAFE",
                        color: timeLeft < 10 ? "#dc2626" : "#1E40AF",
                        minWidth: "120px",
                        textAlign: "center",
                      }}
                    >
                      Time Left: {timeLeft}s
                    </div>
                    <div className="question-badge">{mode} • {difficulty}</div>
                  </div>
                </div>
                <p style={{ fontSize: "22px", marginTop: "24px", fontWeight: "500" }}>
                  {questions[currentQuestionIndex]}
                </p>
                <div style={{ position: "relative" }}>
                  <textarea
                    rows="6"
                    placeholder="Type or speak your response here... (Min 10 characters)"
                    value={answers[currentQuestionIndex] || ""}
                    onChange={(e) =>
                      setAnswers({
                        ...answers,
                        [currentQuestionIndex]: e.target.value,
                      })
                    }
                    className="answer-textarea"
                  />
                  <button
                    onClick={toggleListening}
                    style={{
                      position: "absolute",
                      bottom: "20px",
                      right: "20px",
                      width: "50px",
                      height: "50px",
                      borderRadius: "50%",
                      background: isListening ? "#ef4444" : "var(--accent)",
                      color: "white",
                      border: "none",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "20px",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                      transition: "all 0.3s ease",
                      animation: isListening ? "pulse-red 1.5s infinite" : "none",
                      zIndex: 10
                    }}
                    title={isListening ? "Stop Listening" : "Start Speaking"}
                  >
                    {isListening ? "🛑" : "🎤"}
                  </button>
                </div>
                <div style={{ marginTop: "30px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <p style={{ margin: 0, fontSize: "14px", color: (answers[currentQuestionIndex]?.length || 0) < 10 ? "#dc2626" : "#16a34a" }}>
                    {(answers[currentQuestionIndex]?.length || 0) < 10 
                      ? `⚠️ Need ${10 - (answers[currentQuestionIndex]?.length || 0)} more characters` 
                      : "✅ Ready to proceed"}
                  </p>
                  <div style={{ display: "flex", gap: "10px" }}>
                    {currentQuestionIndex < questions.length - 1 ? (
                      <button 
                        className="primary-btn" 
                        onClick={handleNextQuestion}
                        disabled={(answers[currentQuestionIndex]?.length || 0) < 10 || loading}
                        style={{ opacity: ((answers[currentQuestionIndex]?.length || 0) < 10 || loading) ? 0.5 : 1 }}
                      >
                        {loading ? "Loading..." : "Next Question"}
                      </button>
                    ) : (
                      <button 
                        className="primary-btn" 
                        onClick={submitAnswers}
                        disabled={(answers[currentQuestionIndex]?.length || 0) < 10 || loading}
                        style={{ opacity: ((answers[currentQuestionIndex]?.length || 0) < 10 || loading) ? 0.5 : 1 }}
                      >
                        {loading ? "Submitting..." : "Submit Interview Assessment"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {result && (
            <div className="questions-container">
              <div className="card result-card">
                <h2 style={{ marginTop: 0, fontSize: "42px", color: "var(--text-primary)" }}>Performance Report</h2>
                <div className="result-grid">
                  <div className="score-box" style={{ border: "1px solid var(--border-card)" }}>
                    <p style={{ fontWeight: "700", color: "var(--text-secondary)" }}>Overall Score</p>
                    <h1 style={{ fontSize: "78px", margin: "10px 0", color: getScoreColor(result.score) }}>
                      {result.score}
                    </h1>
                  </div>
                  <div className="feedback-box">
                    <h3>Feedback</h3>
                    <p style={{ lineHeight: "1.6", color: "var(--text-muted)" }}>{result.feedback}</p>
                    
                    {result.per_question_eval && result.per_question_eval.length > 0 && (
                      <div style={{ marginTop: "24px" }}>
                        <h4 style={{ marginBottom: "12px" }}>Detailed Analysis</h4>
                        {result.per_question_eval.map((item, idx) => (
                          <div key={idx} style={{ 
                            padding: "20px", 
                            background: "var(--bg-app)", 
                            borderRadius: "20px", 
                            marginBottom: "20px",
                            borderLeft: `5px solid ${getScoreColor(item.score * 5)}`,
                            border: "1px solid var(--border-color)"
                          }}>
                            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "700", marginBottom: "10px" }}>
                              <span style={{ fontSize: "18px" }}>Question {item.question_index + 1}</span>
                              <span style={{ 
                                color: getScoreColor(item.score * 5),
                                background: "var(--bg-card)",
                                padding: "4px 12px",
                                borderRadius: "10px",
                                fontSize: "14px"
                              }}>{item.score}/20</span>
                            </div>
                            
                            <p style={{ fontSize: "15px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "15px" }}>
                              {questions[item.question_index]}
                            </p>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", marginTop: "15px" }}>
                              <div style={{ 
                                padding: "12px", 
                                background: "var(--bg-card)", 
                                borderRadius: "12px",
                                border: "1px solid var(--border-color)"
                              }}>
                                <strong style={{ color: "var(--accent)", fontSize: "12px", display: "block", marginBottom: "8px", textTransform: "uppercase" }}>Your Response</strong>
                                <p style={{ fontSize: "14px", color: "var(--text-primary)", fontStyle: "italic" }}>
                                  "{answers[item.question_index] || "No answer provided"}"
                                </p>
                              </div>
                              
                              <div style={{ 
                                padding: "12px", 
                                background: "var(--bg-card)", 
                                borderRadius: "12px",
                                border: "1px dashed var(--accent)"
                              }}>
                                <strong style={{ color: "#10B981", fontSize: "12px", display: "block", marginBottom: "8px", textTransform: "uppercase" }}>Model Answer</strong>
                                <p style={{ fontSize: "14px", color: "var(--text-primary)" }}>
                                  {item.model_answer || "N/A"}
                                </p>
                              </div>
                            </div>

                            <div style={{ 
                              marginTop: "15px", 
                              padding: "12px", 
                              background: "rgba(99, 102, 241, 0.05)", 
                              borderRadius: "10px",
                              borderLeft: "4px solid var(--accent)"
                            }}>
                              <strong style={{ fontSize: "13px", color: "var(--accent)" }}>AI Feedback:</strong>
                              <p style={{ fontSize: "14px", margin: "4px 0 0 0", color: "var(--text-secondary)" }}>
                                {item.feedback}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {result.plagiarism && (
                      <div style={{ 
                        marginTop: "20px", 
                        padding: "15px", 
                        borderRadius: "12px", 
                        background: result.plagiarism.is_plagiarized 
                          ? (theme === 'light' ? "#fff1f2" : "#451a1c") 
                          : (theme === 'light' ? "#f0fdf4" : "#064e3b"),
                        border: `1px solid ${result.plagiarism.is_plagiarized 
                          ? (theme === 'light' ? "#fecdd3" : "#7f1d1d") 
                          : (theme === 'light' ? "#bbf7d0" : "#065f46")}`
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <h4 style={{ margin: 0, color: result.plagiarism.is_plagiarized 
                            ? (theme === 'light' ? "#be123c" : "#fda4af") 
                            : (theme === 'light' ? "#15803d" : "#86efac") }}>
                            {result.plagiarism.is_plagiarized ? "⚠️ Plagiarism Detected" : "✅ Originality Check Passed"}
                          </h4>
                          <span style={{ fontWeight: "700", color: result.plagiarism.is_plagiarized 
                            ? (theme === 'light' ? "#e11d48" : "#fb7185") 
                            : (theme === 'light' ? "#16a34a" : "#4ade80") }}>
                            {result.plagiarism.score}% Match
                          </span>
                        </div>
                        <p style={{ fontSize: "14px", marginTop: "8px", color: "var(--text-muted)", margin: "8px 0 0 0" }}>
                          {result.plagiarism.reason}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ marginTop: "40px", display: "flex", gap: "20px", alignItems: "center" }}>
                  <button
                    onClick={() => {
                      setQuestions([]);
                      setAnswers({});
                      setResult(null);
                      setResume(null);
                      setCurrentQuestionIndex(0);
                      setTimeLeft(TIME_PER_QUESTION);
                      setTimerActive(false);
                      clearInterviewProgress();
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="primary-btn"
                  >
                    Retake Interview
                  </button>
                  <a 
                    href="http://localhost:8000/answers-view" 
                    target="_blank" 
                    rel="noreferrer"
                    style={{ 
                      color: "#2563EB", 
                      textDecoration: "none", 
                      fontSize: "16px",
                      fontWeight: "700",
                      padding: "16px 24px",
                      borderRadius: "16px",
                      border: "2px solid #2563EB",
                      transition: "all 0.2s ease"
                    }}
                  >
                    📖 View Model Answers
                  </a>
                  <button
                    onClick={() => window.print()}
                    className="primary-btn"
                    style={{ background: "linear-gradient(135deg, #10B981, #059669)" }}
                  >
                    🖨️ Download/Print Report
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;

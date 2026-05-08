from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
import fitz  # PyMuPDF
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import re
import os
import json
import asyncio
from dotenv import load_dotenv
from huggingface_hub import AsyncInferenceClient

# Load env variables
load_dotenv("key.env")

app = FastAPI()

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Hugging Face Client
HF_TOKEN = os.getenv("HF_TOKEN")
if not HF_TOKEN:
    print("⚠️ WARNING: HF_TOKEN not found in environment variables or key.env")
else:
    print(f"✅ HF_TOKEN loaded successfully (prefix: {HF_TOKEN[:5]}...)")

client = AsyncInferenceClient(api_key=HF_TOKEN)

# ---------------- HOME ----------------
@app.get("/")
def home():
    return {"status": "Backend Running"}


# ---------------- UPLOAD + QUESTIONS ----------------
@app.post("/upload")
async def upload_resume(
    file: UploadFile = File(...),
    role: str = Form(...),
    mode: str = Form(...),
    difficulty: str = Form(...)
):
    print(f"--- Received Upload Request ---")
    print(f"File: {file.filename}, Role: {role}, Mode: {mode}, Difficulty: {difficulty}")
    
    # 5MB Limit
    MAX_FILE_SIZE = 5 * 1024 * 1024
    
    try:
        contents = await file.read()
        
        if len(contents) > MAX_FILE_SIZE:
            print("❌ Error: File too large")
            raise HTTPException(status_code=413, detail="File too large. Max limit is 5MB.")

        with open("resume.pdf", "wb") as f:
            f.write(contents)
        print("✅ Resume saved to resume.pdf")

        # Use PyMuPDF for robust extraction
        try:
            doc = fitz.open("resume.pdf")
            text = ""
            for page in doc:
                t = page.get_text()
                if t:
                    text += t
            print(f"✅ PDF processed. Pages: {len(doc)}, Text length: {len(text)}")
        except Exception as pdf_err:
            print("❌ PDF Extraction Error:", pdf_err)
            text = ""

        # ❌ If resume empty
        if not text.strip():
            print("⚠️ Resume text is empty, using fallback context.")
            text = "No resume provided. Candidate is applying for " + role

        # ✅ Call Hugging Face for dynamic questions
        system_prompt = (
            f"You are an expert interviewer conducting a {difficulty} level {mode} interview. "
            f"Based on the candidate's resume and the role of '{role}', "
            f"generate 5 relevant and short {difficulty} level {mode} interview questions. "
            "Do not include any introductory text or metadata, just the questions. "
            "Return the output in a JSON object with a key 'questions' containing a list of strings."
        )
        
        user_input = f"Role: {role}\nInterview Mode: {mode}\nDifficulty Level: {difficulty}\n\nResume Content:\n{text}"

        print(f"--- Calling Hugging Face API (meta-llama/Llama-3.3-70B-Instruct:together) ---")
        try:
            response = await client.chat.completions.create(
                model="meta-llama/Llama-3.3-70B-Instruct:together",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_input}
                ],
                temperature=0.1,
                max_tokens=1000
            )

            ai_content = response.choices[0].message.content
            print(f"✅ AI Response Received. Length: {len(ai_content)}")
            print(f"RAW AI RESPONSE: {ai_content}")
            
            # Extract JSON if wrapped in code blocks or just text
            json_match = re.search(r"\{.*\}", ai_content, re.DOTALL)
            if json_match:
                json_str = json_match.group(0)
            else:
                json_str = ai_content

            try:
                # Clean up any potential markdown formatting
                json_str = re.sub(r"```json|```", "", json_str, flags=re.IGNORECASE).strip()
                parsed_data = json.loads(json_str)
                questions = parsed_data.get("questions", [])
                
                if not questions or not isinstance(questions, list):
                    print("⚠️ No questions list found in parsed JSON")
                    raise ValueError("Invalid questions format")

                print(f"✅ Successfully generated {len(questions)} questions")
                
                # Save questions for the /answers-view
                with open("questions.json", "w") as f:
                    json.dump({"questions": questions}, f)

                return {"questions": questions[:5]}

            except Exception as parse_err:
                print(f"❌ JSON Parsing Error: {parse_err}")
                print(f"Attempted to parse: {json_str[:100]}...")
                raise ValueError("Could not parse AI response as JSON")

        except Exception as ai_err:
            print(f"❌ AI ERROR: {ai_err}")
            # Fallback questions based on mode
            print("⚠️ Using fallback questions...")
            if mode == "Behavioral":
                fallback = [
                    "Tell me about a time you faced a conflict in a team.",
                    "Describe a situation where you had to meet a tight deadline.",
                    "Give an example of a mistake you made and how you handled it.",
                    "Tell me about a time you went above and beyond for a project.",
                    "How do you handle pressure and stressful situations?"
                ]
            elif mode == "HR Round":
                fallback = [
                    f"Why do you want to join our company as a {role}?",
                    "Where do you see yourself in five years?",
                    "What are your salary expectations?",
                    "What is your greatest professional achievement?",
                    "Why should we hire you over other candidates?"
                ]
            else:
                fallback = [
                    f"Tell me about your experience related to {role}.",
                    "Explain your most challenging project.",
                    "How do you stay updated with the latest technologies?",
                    "What are your strengths and weaknesses?",
                    f"What is the most complex technical problem you've solved in {role}?"
                ]
            return {"questions": fallback}

    except Exception as e:
        print(f"❌ UPLOAD ERROR: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ---------------- ANSWER MODEL ----------------
class EvaluationData(BaseModel):
    questions: list[str]
    answers: dict

class QuestionSet(BaseModel):
    questions: list[str]


# ---------------- ANSWERS VIEW (FOR TESTERS) ----------------
@app.get("/answers-view", response_class=HTMLResponse)
async def answers_view():
    if not os.path.exists("questions.json"):
        return """
        <html>
            <body style="font-family: sans-serif; text-align: center; padding-top: 50px;">
                <h1>No interview questions found.</h1>
                <p>Please generate questions in the app first.</p>
            </body>
        </html>
        """
    
    try:
        with open("questions.json", "r") as f:
            data = json.load(f)
            questions = data.get("questions", [])

        all_questions_text = "\n".join([f"Q{i}: {q}" for i, q in enumerate(questions)])
        prompt = (
            "You are an expert technical interviewer. For each of the following questions, "
            "provide a perfect, detailed, and professional model answer. "
            "Return a JSON object with a key 'answers' containing a list of strings."
        )
        
        response = await client.chat.completions.create(
            model="meta-llama/Llama-3.3-70B-Instruct:together",
            messages=[{"role": "system", "content": prompt}, {"role": "user", "content": all_questions_text}],
            temperature=0.1,
            max_tokens=2000
        )

        ai_content = response.choices[0].message.content
        
        # Extract JSON
        json_match = re.search(r"\{.*\}", ai_content, re.DOTALL)
        json_str = json_match.group(0) if json_match else ai_content
        model_answers = json.loads(re.sub(r"```json|```", "", json_str, flags=re.IGNORECASE).strip()).get("answers", [])

        # Generate HTML
        html_content = f"""
        <html>
            <head>
                <title>Model Answers - InterviewIQ AI</title>
                <style>
                    body {{ font-family: 'Inter', sans-serif; background: #F1F5F9; color: #0F172A; padding: 40px; line-height: 1.6; }}
                    .container {{ max-width: 900px; margin: auto; background: white; padding: 40px; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.05); }}
                    h1 {{ color: #1D4ED8; border-bottom: 2px solid #DBEAFE; padding-bottom: 10px; }}
                    .item {{ margin-bottom: 30px; padding: 20px; border-radius: 12px; background: #F8FAFC; border-left: 5px solid #3B82F6; }}
                    .q {{ font-weight: 800; font-size: 18px; color: #1E293B; margin-bottom: 10px; }}
                    .a {{ color: #334155; font-style: italic; background: white; padding: 15px; border-radius: 8px; border: 1px solid #E2E8F0; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>Interview Model Answers</h1>
                    <p>These answers are generated for the current session's questions for testing purposes.</p>
                    {"".join([f'<div class="item"><div class="q">Q{i+1}: {q}</div><div class="a"><strong>Model Answer:</strong><br>{model_answers[i] if i < len(model_answers) else "N/A"}</div></div>' for i, q in enumerate(questions)])}
                </div>
            </body>
        </html>
        """
        return html_content

    except Exception as e:
        return f"<html><body><h1>Error generating answers</h1><p>{str(e)}</p></body></html>"


# ---------------- EVALUATION (SEMANTIC AI) ----------------
@app.post("/evaluate")
async def evaluate(data: EvaluationData):

    try:
        total_questions = len(data.questions)
        overall_score = 0
        evaluation_results = []
        plagiarism_report = {"is_plagiarized": False, "score": 0, "reason": "No answers provided."}

        all_answers_text = "\n".join([f"Q{i}: {data.questions[int(i)]}\nA{i}: {ans}" for i, ans in data.answers.items() if ans.strip()])

        if all_answers_text:
            print("--- Performing Parallel AI Evaluation & Plagiarism Check ---")
            
            # Define tasks
            plag_prompt = (
                "You are a plagiarism detection expert. Analyze the following interview answers. "
                "Check if they look like they were copied from common online resources, "
                "textbooks, or generated by another AI. "
                "Return a JSON object with 'is_plagiarized' (boolean), 'score' (0-100), and 'reason'."
            )
            
            eval_prompt = (
                "You are an expert technical interviewer. Evaluate the following interview answers. "
                "For each answer, provide a score (0-20) based on correctness, technical depth, and relevance. "
                "Also provide a very brief feedback (1 sentence) per answer, AND provide a 'model_answer' (best possible answer). "
                "Return a JSON object with a key 'evaluations' containing a list of objects: "
                "{'question_index': int, 'score': int, 'feedback': str, 'model_answer': str}."
            )

            # Create Coroutines
            plag_coro = client.chat.completions.create(
                model="meta-llama/Llama-3.3-70B-Instruct:together",
                messages=[{"role": "system", "content": plag_prompt}, {"role": "user", "content": all_answers_text}],
                temperature=0.1
            )
            
            eval_coro = client.chat.completions.create(
                model="meta-llama/Llama-3.3-70B-Instruct:together",
                messages=[{"role": "system", "content": eval_prompt}, {"role": "user", "content": all_answers_text}],
                temperature=0.1, max_tokens=1000
            )

            # Run in parallel
            results = await asyncio.gather(plag_coro, eval_coro, return_exceptions=True)
            
            # Process Plagiarism
            if not isinstance(results[0], Exception):
                try:
                    p_content = results[0].choices[0].message.content
                    p_json_match = re.search(r"\{.*\}", p_content, re.DOTALL)
                    p_json_str = p_json_match.group(0) if p_json_match else p_content
                    plagiarism_report = json.loads(re.sub(r"```json|```", "", p_json_str, flags=re.IGNORECASE).strip())
                except:
                    plagiarism_report = {"is_plagiarized": False, "score": 0, "reason": "Parsing failed."}
            else:
                print("Plagiarism Task Error:", results[0])

            # Process Evaluation
            if not isinstance(results[1], Exception):
                try:
                    e_content = results[1].choices[0].message.content
                    e_json_match = re.search(r"\{.*\}", e_content, re.DOTALL)
                    e_json_str = e_json_match.group(0) if e_json_match else e_content
                    parsed_eval = json.loads(re.sub(r"```json|```", "", e_json_str, flags=re.IGNORECASE).strip())
                    evaluation_results = parsed_eval.get("evaluations", [])
                    for e in evaluation_results:
                        overall_score += e.get("score", 0)
                except:
                    print("Evaluation Parsing Error")
            else:
                print("Evaluation Task Error:", results[1])

        # Normalize score (out of 100)
        final_score = int((overall_score / (total_questions * 20)) * 100) if total_questions else 0

        # Penalty for plagiarism
        if plagiarism_report.get("is_plagiarized") and plagiarism_report.get("score", 0) > 70:
            final_score = max(0, final_score - 30)
            feedback_prefix = "⚠️ [Plagiarism Warning] "
        else:
            feedback_prefix = ""

        # Overall Feedback based on score
        if final_score >= 80:
            overall_feedback = "Excellent! You demonstrated deep technical knowledge and clarity."
        elif final_score >= 60:
            overall_feedback = "Good performance. Solid understanding, but some answers could use more depth."
        elif final_score >= 40:
            overall_feedback = "Average. Focus on providing more detailed and technically accurate responses."
        else:
            overall_feedback = "Needs improvement. Your answers lacked the required depth or accuracy."

        return {
            "score": final_score,
            "feedback": feedback_prefix + overall_feedback,
            "plagiarism": plagiarism_report,
            "per_question_eval": evaluation_results
        }

    except Exception as e:
        print(f"EVALUATION ERROR: {e}")
        return {"score": 0, "feedback": "Evaluation failed", "plagiarism": {}, "per_question_eval": []}

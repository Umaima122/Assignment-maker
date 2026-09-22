import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;

// Increase payload limits for screenshot analysis
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Initialize Gemini Client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

// API health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Route: Analyze questionnaire and/or screenshot evidence
app.post("/api/analyze-evidence", async (req, res) => {
  try {
    const {
      workflow, // 'assemble' | 'complete'
      questionnaireText,
      questionnaireImages = [], // base64 strings or { mimeType, data }
      evidenceItems = [], // array of { id, name, type, data, pageNumber, originalDocName }
    } = req.body;

    if (!evidenceItems.length && !questionnaireText && !questionnaireImages.length) {
      return res.status(400).json({ error: "No evidence or assignment provided for analysis." });
    }

    const parts: any[] = [];

    // Provide context prompt
    const instructions = `
You are an expert Academic Assignment & Practical File Analyzer.
Your task is to analyze the student's assignment questionnaire and uploaded screenshot evidence.

WORKFLOW: ${workflow === "assemble" ? "ASSEMBLE MY COMPLETED WORK (Organize existing screenshots without recreating student work)" : "COMPLETE MY ASSIGNMENT (Analyze requirements, identify missing work, group completed evidence)"}

CORE DIRECTIVES:
1. ASSIGNMENT REQUIREMENT EXTRACTION:
   - Read the questionnaire/assignment carefully and extract every required item.
   - For each item determine:
     * Question/task number (e.g., "Task 01", "Task 02", "Question 1")
     * Exact task/question title (preserve original task wording wherever possible, do NOT invent questions)
     * Requirements: what the student is required to do
     * Task type: "coding" (requires program/code), "written" (conceptual/theoretical question), or "mixed"
     * Which uploaded file/image corresponds to that task (mapped by Evidence Item ID)
     * For each matched image, determine if it shows "code", "output", or "general" evidence
   - If NO questionnaire is provided, infer the logical tasks directly from the screenshot evidence (window titles, code headers, terminal commands) without inventing unsupported claims.

2. MISSING ITEM DETECTION:
   - Compare the assignment requirements against the student's uploaded solutions.
   - Classify each task status:
     * "complete": All required code/answers and screenshots are present.
     * "partial": Some work is present (e.g., code provided but output screenshot missing, or only 1 of multiple required sub-tasks shown).
     * "missing": No student evidence or solution was provided for this requirement.
   - Provide a clear statusReason (e.g., "Complete", "Code provided but output screenshot missing", "Missing screenshot evidence", "Unanswered written question").

3. CODING & WRITTEN TASK FORMAT:
   - For coding tasks, provide an executionDescription of 1–2 lines explaining what the program does and what the evidence shows.
   - If written question, provide a concise explanation of the question's core objective.

4. ORIGINAL EVIDENCE PRESERVATION:
   - The student's uploaded screenshots are ORIGINAL EVIDENCE. Never claim to replace them. Group them accurately by Evidence Item ID in logical order.

Return strict JSON adhering to the schema.
`;

    parts.push({ text: instructions });

    if (questionnaireText) {
      parts.push({
        text: `--- ASSIGNMENT / LAB QUESTIONNAIRE TEXT ---\n${questionnaireText}\n--- END QUESTIONNAIRE ---`,
      });
    }

    // Include questionnaire images if any
    for (let i = 0; i < Math.min(questionnaireImages.length, 5); i++) {
      const qImg = questionnaireImages[i];
      const data = typeof qImg === "string" ? qImg : qImg.data;
      const mimeType = (typeof qImg === "object" && qImg.mimeType) || "image/jpeg";
      const base64Data = data.includes(",") ? data.split(",")[1] : data;
      parts.push({
        text: `Assignment Questionnaire Page ${i + 1}:`,
      });
      parts.push({
        inlineData: { mimeType, data: base64Data },
      });
    }

    // Include evidence items (sample up to 24 items)
    parts.push({
      text: `--- STUDENT EVIDENCE SCREENSHOTS (${evidenceItems.length} total items) ---`,
    });

    for (let i = 0; i < Math.min(evidenceItems.length, 24); i++) {
      const item = evidenceItems[i];
      parts.push({
        text: `Evidence Item ID: "${item.id}" (Item #${i + 1}, Name: "${item.name || `Screenshot ${i + 1}`}", Page: ${item.pageNumber || i + 1}):`,
      });
      if (item.data) {
        const base64Data = item.data.includes(",") ? item.data.split(",")[1] : item.data;
        parts.push({
          inlineData: {
            mimeType: item.mimeType || "image/jpeg",
            data: base64Data,
          },
        });
      }
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: { parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            detectedTitle: {
              type: Type.STRING,
              description: "Extracted or inferred assignment/practical file title",
            },
            detectedCourse: {
              type: Type.STRING,
              description: "Extracted course or lab subject name, if found",
            },
            summary: {
              type: Type.STRING,
              description: "High-level summary of tasks identified, completion status, and evidence mapped",
            },
            tasks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  taskNumber: {
                    type: Type.STRING,
                    description: "Task or Question number, e.g. 'Task 01' or 'Question 1'",
                  },
                  title: {
                    type: Type.STRING,
                    description: "Clear uppercase task title, e.g. 'TASK 01 — FACTORIAL CALCULATION PROGRAM'",
                  },
                  taskType: {
                    type: Type.STRING,
                    description: "'coding', 'written', or 'mixed'",
                  },
                  requirements: {
                    type: Type.STRING,
                    description: "Brief summary of what the student is required to do",
                  },
                  status: {
                    type: Type.STRING,
                    description: "'complete', 'partial', or 'missing'",
                  },
                  statusReason: {
                    type: Type.STRING,
                    description: "Brief explanation of status, e.g. 'Complete', 'Code provided but output screenshot missing', 'Missing screenshot'",
                  },
                  executionDescription: {
                    type: Type.STRING,
                    description: "Concise 1-2 sentences execution summary strictly based on visible evidence",
                  },
                  evidenceItemIds: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "List of Evidence Item IDs assigned to this task in logical sequence",
                  },
                  evidenceRoles: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        id: { type: Type.STRING },
                        role: { type: Type.STRING, description: "'code', 'output', or 'general'" },
                      },
                      required: ["id", "role"],
                    },
                    description: "Role of each matched screenshot (code vs output vs general)",
                  },
                },
                required: ["taskNumber", "title", "executionDescription", "evidenceItemIds", "status"],
              },
            },
          },
          required: ["detectedTitle", "tasks"],
        },
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    res.json({ success: true, result: parsed });
  } catch (error: any) {
    console.error("Analysis error:", error);
    res.status(500).json({
      error: "Failed to analyze evidence: " + (error?.message || "Unknown error"),
    });
  }
});

// Route: Generate missing task solution (For Option A - Complete My Assignment)
app.post("/api/generate-missing-solution", async (req, res) => {
  try {
    const { taskTitle, taskDescription, taskType = "coding", language = "Python" } = req.body;

    const isWritten = taskType === "written";

    const prompt = isWritten
      ? `
You are an academic instructor.
Generate a comprehensive, accurate academic answer for a missing assignment question:
Question/Task: ${taskTitle}
Requirements: ${taskDescription}

Provide:
1. Written Academic Answer (structured, concise, accurate)
2. Walkthrough / Explanation (1-2 sentences explaining the concept)

Output JSON strictly adhering to schema.
`
      : `
You are an academic programming instructor.
Generate a clean, professional solution for a missing coding lab task:
Task: ${taskTitle}
Description/Requirements: ${taskDescription}
Programming Language: ${language}

Provide:
1. Academic Code Implementation (clean, well-commented)
2. Execution Walkthrough (1-2 sentences explaining the test execution)
3. Simulated Terminal / Output text (realistic console output proving successful execution)

Output JSON strictly adhering to schema.
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            code: { type: Type.STRING, description: "Complete functional source code if coding task" },
            language: { type: Type.STRING, description: "Language identifier" },
            executionDescription: {
              type: Type.STRING,
              description: "1-2 sentences explaining execution and output or answer summary",
            },
            simulatedOutput: {
              type: Type.STRING,
              description: "Realistic terminal or console output demonstration if coding task",
            },
            writtenAnswer: {
              type: Type.STRING,
              description: "Written answer text if written question",
            },
          },
          required: ["executionDescription"],
        },
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    res.json({ success: true, result: { ...parsed, isGenerated: true } });
  } catch (error: any) {
    console.error("Missing solution error:", error);
    res.status(500).json({
      error: "Failed to generate solution: " + (error?.message || "Unknown error"),
    });
  }
});

// Route: Refine or rewrite 1-3 sentence execution description
app.post("/api/refine-description", async (req, res) => {
  try {
    const { taskTitle, currentDescription, feedback } = req.body;

    const prompt = `
Task Title: ${taskTitle}
Current Execution Description: "${currentDescription}"
User Feedback / Adjustments: "${feedback || "Make it concise, academic, and exactly 1-3 sentences describing what was executed and shown."}"

Rule: Keep it to 1–3 concise sentences explaining:
- What task was performed
- What the implementation demonstrates
- What the screenshot/evidence shows
Do NOT claim anything not shown. Return JSON with { "executionDescription": string }.
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            executionDescription: { type: Type.STRING },
          },
          required: ["executionDescription"],
        },
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    res.json({ success: true, executionDescription: parsed.executionDescription });
  } catch (error: any) {
    console.error("Refine error:", error);
    res.status(500).json({ error: error?.message || "Failed to refine description" });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();

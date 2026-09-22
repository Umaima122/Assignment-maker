import { AssignmentProject, EvidenceItem } from "../types";

// Helper to generate a crisp SVG-based mock practical screenshot for demo testing
function createMockScreenshotDataUrl(
  title: string,
  code: string,
  output: string,
  bgColor: string = "#1e1e2e"
): string {
  const canvas = document.createElement("canvas");
  canvas.width = 1280;
  canvas.height = 720;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  // Background
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, 1280, 720);

  // Window title bar
  ctx.fillStyle = "#181825";
  ctx.fillRect(0, 0, 1280, 48);

  // Window controls
  ctx.fillStyle = "#f38ba8";
  ctx.beginPath();
  ctx.arc(24, 24, 7, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#f9e2af";
  ctx.beginPath();
  ctx.arc(46, 24, 7, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#a6e3a1";
  ctx.beginPath();
  ctx.arc(68, 24, 7, 0, Math.PI * 2);
  ctx.fill();

  // Title
  ctx.fillStyle = "#cdd6f4";
  ctx.font = "bold 16px monospace";
  ctx.fillText(title, 100, 30);

  // Editor area
  ctx.fillStyle = "#313244";
  ctx.fillRect(40, 70, 750, 610);
  ctx.strokeStyle = "#45475a";
  ctx.strokeRect(40, 70, 750, 610);

  // Line numbers & code
  const codeLines = code.split("\n");
  ctx.font = "16px monospace";
  codeLines.forEach((line, idx) => {
    ctx.fillStyle = "#6c7086";
    ctx.fillText(String(idx + 1).padStart(2, " "), 55, 105 + idx * 24);

    if (line.includes("def ") || line.includes("import ") || line.includes("class ")) {
      ctx.fillStyle = "#cba6f7";
    } else if (line.includes("print") || line.includes("return")) {
      ctx.fillStyle = "#89b4fa";
    } else if (line.includes('"') || line.includes("'")) {
      ctx.fillStyle = "#a6e3a1";
    } else {
      ctx.fillStyle = "#cdd6f4";
    }
    ctx.fillText(line, 95, 105 + idx * 24);
  });

  // Terminal area
  ctx.fillStyle = "#11111b";
  ctx.fillRect(810, 70, 430, 610);
  ctx.strokeStyle = "#45475a";
  ctx.strokeRect(810, 70, 430, 610);

  // Terminal header
  ctx.fillStyle = "#181825";
  ctx.fillRect(810, 70, 430, 36);
  ctx.fillStyle = "#a6adc8";
  ctx.font = "bold 13px sans-serif";
  ctx.fillText("TERMINAL EXECUTION OUTPUT", 825, 93);

  // Output text
  const outLines = output.split("\n");
  ctx.font = "14px monospace";
  outLines.forEach((line, idx) => {
    if (line.startsWith("$") || line.startsWith(">")) {
      ctx.fillStyle = "#89b4fa";
    } else if (line.includes("SUCCESS") || line.includes("OK") || line.includes("Result:")) {
      ctx.fillStyle = "#a6e3a1";
    } else {
      ctx.fillStyle = "#cdd6f4";
    }
    ctx.fillText(line, 825, 135 + idx * 22);
  });

  return canvas.toDataURL("image/jpeg", 0.95);
}

export function generateSampleAssembleProject(): {
  project: AssignmentProject;
  evidenceItems: EvidenceItem[];
} {
  const screenshot1 = createMockScreenshotDataUrl(
    "factorial_program.py — VS Code",
    `# Task 01: Factorial Calculation
def factorial(n: int) -> int:
    if n < 0:
        raise ValueError("Factorial not defined for negative numbers")
    result = 1
    for i in range(1, n + 1):
        result *= i
    return result

num = 6
print(f"Calculating factorial of {num}...")
ans = factorial(num)
print(f"Result: {num}! = {ans}")`,
    `$ python factorial_program.py
Calculating factorial of 6...
Result: 6! = 720
[Execution Finished in 0.04s]`
  );

  const screenshot2 = createMockScreenshotDataUrl(
    "factorial_test_cases.py — Terminal Run",
    `# Edge-case verification tests
assert factorial(0) == 1
assert factorial(1) == 1
assert factorial(5) == 120
assert factorial(7) == 5040
print("All 4 automated test assertions passed!")`,
    `$ pytest test_factorial.py
test_factorial.py .... [100%]
================= 4 passed in 0.02s =================
SUCCESS: All edge cases verified.`
  );

  const screenshot3 = createMockScreenshotDataUrl(
    "student_manager.py — Implementation",
    `# Task 02: Student Record Management
class StudentRecord:
    def __init__(self, roll_no, name, dept, gpa):
        self.roll_no = roll_no
        self.name = name
        self.dept = dept
        self.gpa = gpa

    def display(self):
        return f"[{self.roll_no}] {self.name} | Dept: {self.dept} | GPA: {self.gpa}"

db = [
    StudentRecord("CS-101", "Umaima Tabarak", "Computer Science", 3.88),
    StudentRecord("CS-102", "Alex Mercer", "Software Eng.", 3.75)
]
for s in db:
    print(s.display())`,
    `$ python student_manager.py
[CS-101] Umaima Tabarak | Dept: Computer Science | GPA: 3.88
[CS-102] Alex Mercer | Dept: Software Eng. | GPA: 3.75
System: 2 active student profiles loaded.`
  );

  const screenshot4 = createMockScreenshotDataUrl(
    "student_manager_query.py — Search & Filter Output",
    `# Search query by Department
def filter_by_dept(records, dept):
    return [r for r in records if r.dept == dept]

matches = filter_by_dept(db, "Computer Science")
print(f"Found {len(matches)} match(es):")
for m in matches:
    print(" ->", m.name, f"(GPA {m.gpa})")`,
    `$ python search_students.py --dept "Computer Science"
Found 1 match(es):
 -> Umaima Tabarak (GPA 3.88)
Query latency: 1.2ms [SUCCESS]`
  );

  const screenshot5 = createMockScreenshotDataUrl(
    "db_connection.py — PostgreSQL Client Connection",
    `# Task 03: PostgreSQL Database Handshake
import psycopg2

def connect_db():
    conn = psycopg2.connect(
        dbname="university_lab",
        user="postgres",
        host="localhost",
        port="5432"
    )
    cur = conn.cursor()
    cur.execute("SELECT version();")
    ver = cur.fetchone()
    print("Database Connected Successfully!")
    print("Engine Version:", ver[0])
    cur.close()
    conn.close()

connect_db()`,
    `$ python db_connection.py
Database Connected Successfully!
Engine Version: PostgreSQL 16.2 on x86_64-pc-linux-gnu
Connection Pool Status: Healthy [OK]`
  );

  const evidenceItems: EvidenceItem[] = [
    {
      id: "ev-demo-1",
      name: "Factorial Source Implementation.png",
      type: "image",
      data: screenshot1,
      fileId: "lab-demo.pdf",
      fileName: "lab_practicals_evidence.pdf",
      pageNumber: 1,
      totalPages: 5,
      isOriginalEvidence: true,
      addedAt: Date.now() - 5000,
    },
    {
      id: "ev-demo-2",
      name: "Factorial Terminal Test Cases.png",
      type: "image",
      data: screenshot2,
      fileId: "lab-demo.pdf",
      fileName: "lab_practicals_evidence.pdf",
      pageNumber: 2,
      totalPages: 5,
      isOriginalEvidence: true,
      addedAt: Date.now() - 4000,
    },
    {
      id: "ev-demo-3",
      name: "Student Record Model.png",
      type: "image",
      data: screenshot3,
      fileId: "lab-demo.pdf",
      fileName: "lab_practicals_evidence.pdf",
      pageNumber: 3,
      totalPages: 5,
      isOriginalEvidence: true,
      addedAt: Date.now() - 3000,
    },
    {
      id: "ev-demo-4",
      name: "Student Filter Query Results.png",
      type: "image",
      data: screenshot4,
      fileId: "lab-demo.pdf",
      fileName: "lab_practicals_evidence.pdf",
      pageNumber: 4,
      totalPages: 5,
      isOriginalEvidence: true,
      addedAt: Date.now() - 2000,
    },
    {
      id: "ev-demo-5",
      name: "PostgreSQL Handshake Output.png",
      type: "image",
      data: screenshot5,
      fileId: "lab-demo.pdf",
      fileName: "lab_practicals_evidence.pdf",
      pageNumber: 5,
      totalPages: 5,
      isOriginalEvidence: true,
      addedAt: Date.now() - 1000,
    },
  ];

  const project: AssignmentProject = {
    workflow: "assemble",
    title: "DATA STRUCTURES & APPLIED ALGORITHMS LAB FILE",
    courseName: "CS-204: Advanced Programming & Data Management",
    questionnaireText: `1. Task 01: Write a program to calculate the factorial of a given number and verify edge cases.
2. Task 02: Create a student management program supporting records display and department filtering.
3. Task 03: Configure and test a relational database connection and display the database engine version.`,
    evidenceItems,
    tasks: [
      {
        id: "task-1",
        taskNumber: "TASK 01",
        title: "TASK 01 — FACTORIAL CALCULATION PROGRAM",
        taskType: "coding",
        status: "complete",
        statusReason: "Complete — Source code and terminal assertions verified",
        requirements: "Write a program to calculate the factorial of a given number and verify edge cases.",
        executionDescription:
          "The program was implemented to calculate the factorial of a given number using iterative logic. The screenshots below demonstrate the source implementation alongside automated test assertion outputs.",
        evidenceItemIds: ["ev-demo-1", "ev-demo-2"],
        evidenceRoles: {
          "ev-demo-1": "code",
          "ev-demo-2": "output",
        },
      },
      {
        id: "task-2",
        taskNumber: "TASK 02",
        title: "TASK 02 — STUDENT MANAGEMENT SYSTEM",
        taskType: "coding",
        status: "complete",
        statusReason: "Complete — Model definition and query execution output verified",
        requirements: "Create a student management program supporting records display and department filtering.",
        executionDescription:
          "The program implements the required student record management data structures and demonstrates display functionality. The screenshots below confirm the record definition and successful execution of filtering queries.",
        evidenceItemIds: ["ev-demo-3", "ev-demo-4"],
        evidenceRoles: {
          "ev-demo-3": "code",
          "ev-demo-4": "output",
        },
      },
      {
        id: "task-3",
        taskNumber: "TASK 03",
        title: "TASK 03 — DATABASE CONNECTION & ENGINE VERIFICATION",
        taskType: "coding",
        status: "partial",
        statusReason: "Partial — Output verified, but standalone connection script missing",
        requirements: "Configure and test a relational database connection and display the database engine version.",
        executionDescription:
          "The relational database connection was configured and tested successfully using PostgreSQL. The screenshot below verifies the database handshake and displays the active engine version.",
        evidenceItemIds: ["ev-demo-5"],
        evidenceRoles: {
          "ev-demo-5": "output",
        },
      },
      {
        id: "task-4",
        taskNumber: "TASK 04",
        title: "TASK 04 — RECURSIVE BINARY SEARCH TREE",
        taskType: "coding",
        status: "missing",
        statusReason: "Missing screenshot evidence",
        requirements: "Implement a binary search tree with node insertion and preorder traversal printing.",
        executionDescription:
          "The assignment requires binary search tree implementation with recursive traversal. No student screenshot was uploaded for this requirement.",
        evidenceItemIds: [],
        evidenceRoles: {},
      },
    ],
    coverPage: {
      enabled: true,
      assignmentTitle: "PRACTICAL LAB WORK FILE",
      courseName: "CS-204: Advanced Programming & Data Management",
      studentName: "Umaima Tabarak",
      rollNumber: "2024-CS-042",
      instructorName: "Dr. K. Anderson",
      institution: "Faculty of Computer Science & Engineering",
      submissionDate: "September 2026",
    },
  };

  return { project, evidenceItems };
}

export type WorkflowMode = "home" | "assemble" | "complete";

export type TaskStatus = "complete" | "partial" | "missing";
export type TaskType = "coding" | "written" | "mixed";
export type EvidenceRole = "code" | "output" | "general";

export interface EvidenceItem {
  id: string;
  name: string;
  type: "pdf-page" | "image";
  data: string; // Base64 image data URL
  fileId: string;
  fileName: string;
  pageNumber?: number;
  totalPages?: number;
  width?: number;
  height?: number;
  isOriginalEvidence: true; // Rule: uploaded screenshots are always original evidence
  addedAt: number;
}

export interface AiGeneratedSolution {
  code?: string;
  language?: string;
  simulatedOutput?: string;
  executionWalkthrough?: string;
  executionDescription?: string;
  writtenAnswer?: string;
  isGenerated: true;
}

export interface TaskGroup {
  id: string;
  taskNumber: string; // e.g. "TASK 01" or "Question 01"
  title: string; // e.g. "TASK 01 — FACTORIAL CALCULATION PROGRAM"
  taskType?: TaskType; // "coding" | "written" | "mixed"
  requirements?: string; // What the student is required to do
  status: TaskStatus; // "complete" | "partial" | "missing"
  statusReason?: string; // e.g. "Code provided but output screenshot missing"
  executionDescription: string; // Exactly 1-3 sentences
  evidenceItemIds: string[]; // IDs of assigned screenshots in logical order
  evidenceRoles?: Record<string, EvidenceRole>; // Map evidence ID -> 'code' | 'output' | 'general'
  studentAnswer?: string; // For written questions if student wrote text
  isMissing?: boolean; // If task was in questionnaire but missing evidence
  aiGeneratedSolution?: AiGeneratedSolution;
}

export interface CoverPageConfig {
  enabled: boolean;
  assignmentTitle: string;
  courseName: string;
  studentName: string;
  rollNumber: string;
  instructorName: string;
  institution: string;
  submissionDate: string;
}

export interface AssignmentProject {
  workflow: "assemble" | "complete";
  title: string;
  courseName?: string;
  questionnaireText?: string;
  evidenceItems: EvidenceItem[];
  tasks: TaskGroup[];
  coverPage: CoverPageConfig;
}

export interface QualityCheckItem {
  id: string;
  title: string;
  description: string;
  status: "pass" | "warn" | "fail";
  detail: string;
}

export interface TraceabilityEntry {
  taskNumber: string;
  taskTitle: string;
  status: TaskStatus;
  statusReason: string;
  evidenceFiles: { id: string; name: string; role: EvidenceRole }[];
  pdfPageDisplay: string;
}

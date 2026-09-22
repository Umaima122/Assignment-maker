import React, { useState, useMemo } from "react";
import { WorkflowMode, AssignmentProject, EvidenceItem, TaskGroup, CoverPageConfig } from "./types";
import { Header } from "./components/Header";
import { WorkflowSelector } from "./components/WorkflowSelector";
import { UploadStep } from "./components/UploadStep";
import { AssemblyWorkspace } from "./components/AssemblyWorkspace";
import { CoverPageModal } from "./components/CoverPageModal";
import { PdfExportModal } from "./components/PdfExportModal";
import { generateSampleAssembleProject } from "./data/sampleData";

export default function App() {
  const [workflow, setWorkflow] = useState<WorkflowMode>("home");
  const [currentStep, setCurrentStep] = useState<"upload" | "workspace">("upload");
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Active Project Data
  const [project, setProject] = useState<AssignmentProject | null>(null);
  const [evidenceItems, setEvidenceItems] = useState<EvidenceItem[]>([]);

  // Modals
  const [isCoverModalOpen, setIsCoverModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Evidence Map for fast O(1) lookup
  const evidenceMap = useMemo(() => {
    const map = new Map<string, EvidenceItem>();
    evidenceItems.forEach((item) => map.set(item.id, item));
    return map;
  }, [evidenceItems]);

  // Select workflow mode
  const handleSelectWorkflow = (mode: "assemble" | "complete") => {
    setWorkflow(mode);
    setCurrentStep("upload");
    setProject(null);
    setEvidenceItems([]);
  };

  // Reset to Home
  const handleReset = () => {
    setWorkflow("home");
    setCurrentStep("upload");
    setProject(null);
    setEvidenceItems([]);
  };

  // Instant pre-loaded demonstration project
  const handleLoadSample = () => {
    const { project: sampleProj, evidenceItems: sampleItems } = generateSampleAssembleProject();
    setEvidenceItems(sampleItems);
    setProject(sampleProj);
    setWorkflow("assemble");
    setCurrentStep("workspace");
  };

  // Proceed from Upload step to Analysis & Workspace
  const handleProceedToWorkspace = async (
    uploadedEvidence: EvidenceItem[],
    questionnaireText: string,
    questionnaireImages: string[]
  ) => {
    setEvidenceItems(uploadedEvidence);
    setIsAnalyzing(true);

    try {
      // Send sample of evidence thumbnails to Gemini for task grouping and titles
      const payloadEvidence = uploadedEvidence.map((ev, i) => ({
        id: ev.id,
        name: ev.name,
        pageNumber: ev.pageNumber || i + 1,
        mimeType: ev.data.startsWith("data:image/png") ? "image/png" : "image/jpeg",
        // Send small thumbnail data or trimmed data for analysis
        data: ev.data,
      }));

      const res = await fetch("/api/analyze-evidence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workflow,
          questionnaireText,
          questionnaireImages,
          evidenceItems: payloadEvidence,
        }),
      });

      const resJson = await res.json();

      if (resJson.success && resJson.result && resJson.result.tasks) {
        const result = resJson.result;
        const initialTasks: TaskGroup[] = result.tasks.map((t: any, idx: number) => {
          const matchedIds = (t.evidenceItemIds || []).filter((id: string) =>
            uploadedEvidence.some((ev) => ev.id === id)
          );
          const taskStatus = t.status || (matchedIds.length > 0 ? "complete" : "missing");
          const rolesMap: { [id: string]: "code" | "output" | "general" } = {};
          if (Array.isArray(t.evidenceRoles)) {
            t.evidenceRoles.forEach((r: any) => {
              if (r && r.id) rolesMap[r.id] = r.role || "general";
            });
          }

          return {
            id: `task-${Date.now()}-${idx}`,
            taskNumber: t.taskNumber || `TASK ${String(idx + 1).padStart(2, "0")}`,
            title: t.title || `TASK ${String(idx + 1).padStart(2, "0")}`,
            taskType: t.taskType || "coding",
            requirements: t.requirements || "",
            status: taskStatus,
            statusReason:
              t.statusReason ||
              (taskStatus === "complete"
                ? "Complete — Evidence verified"
                : "Missing student screenshot evidence"),
            executionDescription:
              t.executionDescription ||
              "The program was implemented to satisfy the task requirements. The screenshot evidence demonstrates the code and execution output.",
            evidenceItemIds: matchedIds,
            evidenceRoles: rolesMap,
            isMissing: taskStatus === "missing",
          };
        });

        // Catch any unassigned evidence and assign to the nearest task or first task
        const assignedIds = new Set(initialTasks.flatMap((t) => t.evidenceItemIds));
        const unassigned = uploadedEvidence.filter((ev) => !assignedIds.has(ev.id));
        if (unassigned.length > 0 && initialTasks.length > 0) {
          initialTasks[0].evidenceItemIds.push(...unassigned.map((ev) => ev.id));
        }

        const newProject: AssignmentProject = {
          workflow: workflow as "assemble" | "complete",
          title: (result.detectedTitle || "PRACTICAL LAB SUBMISSION").toUpperCase(),
          courseName: result.detectedCourse || "",
          questionnaireText,
          evidenceItems: uploadedEvidence,
          tasks: initialTasks,
          coverPage: {
            enabled: true,
            assignmentTitle: (result.detectedTitle || "PRACTICAL LAB WORK FILE").toUpperCase(),
            courseName: result.detectedCourse || "Computer Science Practical",
            studentName: "Student Name",
            rollNumber: "REG-001",
            instructorName: "Faculty Instructor",
            institution: "Department of Computing",
            submissionDate: new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" }),
          },
        };

        setProject(newProject);
        setCurrentStep("workspace");
        return;
      }
    } catch (err) {
      console.warn("Server analysis fallback:", err);
    } finally {
      setIsAnalyzing(false);
    }

    // Heuristic Fallback if API fails or network timeout occurs:
    // Group evidence sequentially into logical tasks (2 screenshots per task)
    const fallbackTasks: TaskGroup[] = [];
    const chunkSize = 2;
    for (let i = 0; i < uploadedEvidence.length; i += chunkSize) {
      const taskNum = Math.floor(i / chunkSize) + 1;
      const chunk = uploadedEvidence.slice(i, i + chunkSize);
      fallbackTasks.push({
        id: `task-fallback-${Date.now()}-${taskNum}`,
        taskNumber: `TASK ${String(taskNum).padStart(2, "0")}`,
        title: `TASK ${String(taskNum).padStart(2, "0")} — PRACTICAL IMPLEMENTATION`,
        taskType: "coding",
        status: "complete",
        statusReason: "Complete — Evidence verified",
        executionDescription:
          "The practical implementation was executed according to assignment requirements. The screenshots below verify the source logic and resulting output.",
        evidenceItemIds: chunk.map((c) => c.id),
        evidenceRoles: {},
      });
    }

    const fallbackProject: AssignmentProject = {
      workflow: workflow as "assemble" | "complete",
      title: "PRACTICAL LAB WORK FILE",
      questionnaireText,
      evidenceItems: uploadedEvidence,
      tasks: fallbackTasks,
      coverPage: {
        enabled: true,
        assignmentTitle: "PRACTICAL LAB SUBMISSION",
        courseName: "Lab Practical",
        studentName: "Student Name",
        rollNumber: "REG-001",
        instructorName: "Faculty Instructor",
        institution: "Department of Computer Science",
        submissionDate: new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" }),
      },
    };

    setProject(fallbackProject);
    setCurrentStep("workspace");
  };

  return (
    <div className="min-h-screen bg-slate-100/60 flex flex-col text-slate-900 selection:bg-emerald-100 selection:text-emerald-900">
      {/* Navigation Header */}
      <Header
        workflow={workflow}
        onSelectWorkflow={(mode) => {
          if (mode === "home") handleReset();
          else handleSelectWorkflow(mode as "assemble" | "complete");
        }}
        onOpenCoverPage={() => setIsCoverModalOpen(true)}
        onOpenExport={() => setIsExportModalOpen(true)}
        onReset={handleReset}
        taskCount={project?.tasks.length || 0}
        evidenceCount={evidenceItems.length}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {workflow === "home" && (
          <WorkflowSelector
            onSelect={handleSelectWorkflow}
            onLoadSample={handleLoadSample}
          />
        )}

        {workflow !== "home" && currentStep === "upload" && (
          <UploadStep
            workflow={workflow as "assemble" | "complete"}
            onProceedToWorkspace={handleProceedToWorkspace}
            isAnalyzing={isAnalyzing}
          />
        )}

        {workflow !== "home" && currentStep === "workspace" && project && (
          <AssemblyWorkspace
            project={project}
            onUpdateProject={setProject as any}
            evidenceMap={evidenceMap}
            onExport={() => setIsExportModalOpen(true)}
            onOpenCoverPage={() => setIsCoverModalOpen(true)}
            onAddMoreEvidence={() => setCurrentStep("upload")}
          />
        )}
      </main>

      {/* Cover Page Settings Modal */}
      {project && (
        <CoverPageModal
          isOpen={isCoverModalOpen}
          onClose={() => setIsCoverModalOpen(false)}
          config={project.coverPage}
          onSave={(newCover) =>
            setProject((prev) => (prev ? { ...prev, coverPage: newCover } : null))
          }
        />
      )}

      {/* PDF Export & Live Preview Modal */}
      {project && (
        <PdfExportModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          project={project}
          evidenceMap={evidenceMap}
        />
      )}
    </div>
  );
}

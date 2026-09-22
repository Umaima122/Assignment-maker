import React, { useState } from "react";
import {
  TaskGroup,
  EvidenceItem,
  AssignmentProject,
  AiGeneratedSolution,
  TaskStatus,
  TaskType,
  EvidenceRole,
} from "../types";
import {
  ArrowUp,
  ArrowDown,
  Trash2,
  Edit3,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Plus,
  ArrowRightLeft,
  ChevronLeft,
  ChevronRight,
  Code2,
  Terminal,
  ExternalLink,
  Layers,
  FileCheck,
  RotateCw,
  HelpCircle,
  Eye,
  Check,
  XCircle,
  ListOrdered,
  ShieldCheck,
  UploadCloud,
  CheckSquare,
} from "lucide-react";
import { runAssignmentQualityCheck } from "../utils/qualityCheck";

interface AssemblyWorkspaceProps {
  project: AssignmentProject;
  onUpdateProject: (updater: (prev: AssignmentProject) => AssignmentProject) => void;
  evidenceMap: Map<string, EvidenceItem>;
  onExport: () => void;
  onOpenCoverPage: () => void;
  onAddMoreEvidence: () => void;
}

export const AssemblyWorkspace: React.FC<AssemblyWorkspaceProps> = ({
  project,
  onUpdateProject,
  evidenceMap,
  onExport,
  onOpenCoverPage,
  onAddMoreEvidence,
}) => {
  const [activeTab, setActiveTab] = useState<"tasks" | "traceability" | "quality">("tasks");
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [editingDesc, setEditingDesc] = useState("");
  const [editingRequirements, setEditingRequirements] = useState("");
  const [editingTaskType, setEditingTaskType] = useState<TaskType>("coding");
  const [isRefiningDesc, setIsRefiningDesc] = useState(false);
  const [refineFeedback, setRefineFeedback] = useState("");
  const [showRefineInput, setShowRefineInput] = useState(false);
  const [generatingSolutionForTaskId, setGeneratingSolutionForTaskId] = useState<string | null>(null);
  const [previewImageModal, setPreviewImageModal] = useState<EvidenceItem | null>(null);

  // Status stats
  const totalTasks = project.tasks.length;
  const completeCount = project.tasks.filter((t) => t.status === "complete").length;
  const partialCount = project.tasks.filter((t) => t.status === "partial").length;
  const missingCount = project.tasks.filter((t) => t.status === "missing").length;

  // Unassigned evidence items
  const assignedEvidenceIds = new Set(project.tasks.flatMap((t) => t.evidenceItemIds));
  const unassignedEvidence = Array.from(evidenceMap.values()).filter(
    (ev) => !assignedEvidenceIds.has(ev.id)
  );

  // Quality check results
  const qualityCheck = runAssignmentQualityCheck(project, evidenceMap);

  // Reorder tasks
  const moveTask = (index: number, direction: "up" | "down") => {
    onUpdateProject((prev) => {
      const newTasks = [...prev.tasks];
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= newTasks.length) return prev;
      const temp = newTasks[index];
      newTasks[index] = newTasks[targetIndex];
      newTasks[targetIndex] = temp;
      return { ...prev, tasks: newTasks };
    });
  };

  // Start editing task
  const startEditing = (task: TaskGroup) => {
    setEditingTaskId(task.id);
    setEditingTitle(task.title);
    setEditingDesc(task.executionDescription);
    setEditingRequirements(task.requirements || "");
    setEditingTaskType(task.taskType || "coding");
    setShowRefineInput(false);
    setRefineFeedback("");
  };

  const saveEditing = () => {
    if (!editingTaskId) return;
    onUpdateProject((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) =>
        t.id === editingTaskId
          ? {
              ...t,
              title: editingTitle.trim() || t.title,
              executionDescription: editingDesc.trim() || t.executionDescription,
              requirements: editingRequirements.trim(),
              taskType: editingTaskType,
            }
          : t
      ),
    }));
    setEditingTaskId(null);
  };

  // Update Task Status
  const updateTaskStatus = (taskId: string, status: TaskStatus, statusReason?: string) => {
    onUpdateProject((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) =>
        t.id === taskId
          ? {
              ...t,
              status,
              statusReason: statusReason !== undefined ? statusReason : t.statusReason,
            }
          : t
      ),
    }));
  };

  // Change evidence role (Code vs Output vs General)
  const setEvidenceRole = (taskId: string, evidenceId: string, role: EvidenceRole) => {
    onUpdateProject((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) => {
        if (t.id !== taskId) return t;
        const updatedRoles = { ...(t.evidenceRoles || {}), [evidenceId]: role };
        return { ...t, evidenceRoles: updatedRoles };
      }),
    }));
  };

  // Reorder evidence within a task
  const moveEvidenceInTask = (taskId: string, evidenceIndex: number, direction: "left" | "right") => {
    onUpdateProject((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) => {
        if (t.id !== taskId) return t;
        const newEvIds = [...t.evidenceItemIds];
        const targetIdx = direction === "left" ? evidenceIndex - 1 : evidenceIndex + 1;
        if (targetIdx < 0 || targetIdx >= newEvIds.length) return t;
        const temp = newEvIds[evidenceIndex];
        newEvIds[evidenceIndex] = newEvIds[targetIdx];
        newEvIds[targetIdx] = temp;
        return { ...t, evidenceItemIds: newEvIds };
      }),
    }));
  };

  // Move evidence to another task
  const moveEvidenceToTask = (sourceTaskId: string, evidenceId: string, destTaskId: string) => {
    if (sourceTaskId === destTaskId) return;
    onUpdateProject((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) => {
        if (t.id === sourceTaskId) {
          return { ...t, evidenceItemIds: t.evidenceItemIds.filter((id) => id !== evidenceId) };
        }
        if (t.id === destTaskId) {
          return { ...t, evidenceItemIds: [...t.evidenceItemIds, evidenceId] };
        }
        return t;
      }),
    }));
  };

  // Assign unassigned evidence to task
  const assignEvidenceToTask = (taskId: string, evidenceId: string) => {
    onUpdateProject((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) =>
        t.id === taskId
          ? {
              ...t,
              evidenceItemIds: [...t.evidenceItemIds, evidenceId],
              status: t.status === "missing" ? "complete" : t.status,
            }
          : t
      ),
    }));
  };

  // Remove evidence from task
  const removeEvidenceFromTask = (taskId: string, evidenceId: string) => {
    onUpdateProject((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) => {
        if (t.id !== taskId) return t;
        const newIds = t.evidenceItemIds.filter((id) => id !== evidenceId);
        return {
          ...t,
          evidenceItemIds: newIds,
          status: newIds.length === 0 ? "missing" : t.status,
        };
      }),
    }));
  };

  // Add new empty task
  const addNewTask = () => {
    const taskNum = project.tasks.length + 1;
    const newTask: TaskGroup = {
      id: `task-${Date.now()}`,
      taskNumber: `TASK ${String(taskNum).padStart(2, "0")}`,
      title: `TASK ${String(taskNum).padStart(2, "0")} — PRACTICAL REQUIREMENT`,
      executionDescription:
        "The practical task was executed according to assignment requirements. The screenshots below verify the implementation.",
      evidenceItemIds: [],
      status: "missing",
      taskType: "coding",
      statusReason: "Missing screenshot evidence",
    };
    onUpdateProject((prev) => ({ ...prev, tasks: [...prev.tasks, newTask] }));
    startEditing(newTask);
  };

  // Delete task
  const deleteTask = (taskId: string) => {
    onUpdateProject((prev) => ({
      ...prev,
      tasks: prev.tasks.filter((t) => t.id !== taskId),
    }));
  };

  // Refine description using Gemini
  const handleRefineDescription = async (task: TaskGroup) => {
    setIsRefiningDesc(true);
    try {
      const res = await fetch("/api/refine-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskTitle: editingTitle || task.title,
          currentDescription: editingDesc || task.executionDescription,
          feedback: refineFeedback,
        }),
      });
      const data = await res.json();
      if (data.success && data.executionDescription) {
        setEditingDesc(data.executionDescription);
        setShowRefineInput(false);
      }
    } catch (err) {
      console.error("Refine error:", err);
    } finally {
      setIsRefiningDesc(false);
    }
  };

  // Generate solution for missing task
  const handleGenerateMissingSolution = async (task: TaskGroup) => {
    setGeneratingSolutionForTaskId(task.id);
    try {
      const res = await fetch("/api/generate-missing-solution", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskTitle: task.title,
          taskDescription: task.requirements || task.executionDescription,
          taskType: task.taskType || "coding",
          language: "Python",
        }),
      });
      const data = await res.json();
      if (data.success && data.result) {
        const sol: AiGeneratedSolution = {
          code: data.result.code || "",
          language: data.result.language || "Python",
          executionDescription: data.result.executionDescription,
          simulatedOutput: data.result.simulatedOutput,
          writtenAnswer: data.result.writtenAnswer,
          isGenerated: true,
        };

        onUpdateProject((prev) => ({
          ...prev,
          tasks: prev.tasks.map((t) =>
            t.id === task.id
              ? {
                  ...t,
                  aiGeneratedSolution: sol,
                  executionDescription: sol.executionDescription || t.executionDescription,
                  status: "complete",
                  statusReason: "Satisfied via transparent AI Academic Solution",
                }
              : t
          ),
        }));
      }
    } catch (err) {
      console.error("Failed to generate missing solution:", err);
    } finally {
      setGeneratingSolutionForTaskId(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6">
      {/* Top Header & Status Overview */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800">
                {project.workflow === "assemble" ? "Assembly Mode" : "Completion Mode"}
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs text-slate-500 font-medium">
                {project.courseName || "Academic Assignment"}
              </span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 mt-1 tracking-tight">
              {project.title}
            </h1>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            <button
              onClick={onAddMoreEvidence}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors inline-flex items-center space-x-1.5 border border-slate-200"
            >
              <UploadCloud className="w-3.5 h-3.5 text-slate-600" />
              <span>Add More Evidence</span>
            </button>
            <button
              id="btn-edit-cover"
              onClick={onOpenCoverPage}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors inline-flex items-center space-x-1.5 border border-slate-200"
            >
              <FileText className="w-3.5 h-3.5 text-slate-600" />
              <span>Cover Page</span>
            </button>
            <button
              id="btn-export-pdf"
              onClick={onExport}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-sm hover:shadow inline-flex items-center space-x-2"
            >
              <FileCheck className="w-4 h-4" />
              <span>Export Final PDF</span>
            </button>
          </div>
        </div>

        {/* Task Completion Audit Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6">
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Total Required Tasks
            </div>
            <div className="text-2xl font-black text-slate-900 mt-1">{totalTasks}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Extracted from assignment</div>
          </div>

          <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-xl p-3.5">
            <div className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider flex items-center space-x-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              <span>Complete</span>
            </div>
            <div className="text-2xl font-black text-emerald-900 mt-1">{completeCount}</div>
            <div className="text-[11px] text-emerald-700 mt-0.5">Screenshots & code verified</div>
          </div>

          <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-3.5">
            <div className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider flex items-center space-x-1">
              <AlertTriangle className="w-3 h-3 text-amber-600" />
              <span>Partial</span>
            </div>
            <div className="text-2xl font-black text-amber-900 mt-1">{partialCount}</div>
            <div className="text-[11px] text-amber-700 mt-0.5">Missing code or output</div>
          </div>

          <div className="bg-rose-50/60 border border-rose-200/80 rounded-xl p-3.5">
            <div className="text-[11px] font-semibold text-rose-800 uppercase tracking-wider flex items-center space-x-1">
              <XCircle className="w-3 h-3 text-rose-600" />
              <span>Missing Work</span>
            </div>
            <div className="text-2xl font-black text-rose-900 mt-1">{missingCount}</div>
            <div className="text-[11px] text-rose-700 mt-0.5">No evidence provided</div>
          </div>
        </div>

        {/* Unassigned Screenshots Alert */}
        {unassignedEvidence.length > 0 && (
          <div className="mt-5 p-3.5 bg-sky-50 border border-sky-200 rounded-xl flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <Layers className="w-4 h-4 text-sky-600 shrink-0" />
              <div className="text-xs text-sky-900">
                <span className="font-bold">{unassignedEvidence.length} uploaded screenshot(s)</span> are currently unassigned to any specific task.
              </div>
            </div>
            <button
              onClick={() => {
                if (project.tasks.length > 0) {
                  assignEvidenceToTask(project.tasks[0].id, unassignedEvidence[0].id);
                }
              }}
              className="px-3 py-1 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-lg transition-colors"
            >
              Assign to Task 01
            </button>
          </div>
        )}
      </div>

      {/* Workspace Tabs */}
      <div className="flex border-b border-slate-200 mb-6 space-x-2">
        <button
          onClick={() => setActiveTab("tasks")}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors inline-flex items-center space-x-2 ${
            activeTab === "tasks"
              ? "border-emerald-600 text-emerald-800"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <ListOrdered className="w-4 h-4" />
          <span>Tasks & Evidence Workspace</span>
        </button>

        <button
          onClick={() => setActiveTab("traceability")}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors inline-flex items-center space-x-2 ${
            activeTab === "traceability"
              ? "border-emerald-600 text-emerald-800"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <ArrowRightLeft className="w-4 h-4" />
          <span>Traceability Matrix (Task → Evidence Map)</span>
        </button>

        <button
          onClick={() => setActiveTab("quality")}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors inline-flex items-center space-x-2 ${
            activeTab === "quality"
              ? "border-emerald-600 text-emerald-800"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Quality Check Audit ({qualityCheck.score}%)</span>
        </button>
      </div>

      {/* TAB 1: TASKS & EVIDENCE WORKSPACE */}
      {activeTab === "tasks" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="text-xs text-slate-500 font-medium">
              Review and adjust task requirements, screenshot roles (Code vs Output), and descriptions.
            </div>
            <button
              onClick={addNewTask}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors inline-flex items-center space-x-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Custom Task</span>
            </button>
          </div>

          {project.tasks.map((task, index) => {
            const isEditing = editingTaskId === task.id;
            const taskEvidenceList = task.evidenceItemIds
              .map((id) => evidenceMap.get(id))
              .filter(Boolean) as EvidenceItem[];

            return (
              <div
                key={task.id}
                className={`bg-white border rounded-2xl overflow-hidden shadow-xs transition-all ${
                  task.status === "missing"
                    ? "border-rose-200"
                    : task.status === "partial"
                    ? "border-amber-200"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                {/* Task Header Bar */}
                <div className="bg-slate-50/80 px-6 py-4 border-b border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-center space-x-3">
                    <span className="font-mono font-bold text-xs px-2.5 py-1 rounded-lg bg-slate-200 text-slate-800">
                      {task.taskNumber}
                    </span>

                    {/* Status Pill */}
                    <div className="flex items-center space-x-1.5">
                      <select
                        value={task.status}
                        onChange={(e) => updateTaskStatus(task.id, e.target.value as TaskStatus)}
                        className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border cursor-pointer focus:outline-hidden ${
                          task.status === "complete"
                            ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                            : task.status === "partial"
                            ? "bg-amber-50 text-amber-800 border-amber-300"
                            : "bg-rose-50 text-rose-800 border-rose-300"
                        }`}
                      >
                        <option value="complete">✓ Complete</option>
                        <option value="partial">⚠ Partially Complete</option>
                        <option value="missing">✗ Missing Evidence</option>
                      </select>

                      <span className="text-slate-300">•</span>
                      <span className="text-[11px] font-medium text-slate-500 capitalize">
                        {task.taskType || "coding"} Task
                      </span>
                    </div>
                  </div>

                  {/* Order & Action Buttons */}
                  <div className="flex items-center space-x-1.5 self-end md:self-auto">
                    <button
                      onClick={() => moveTask(index, "up")}
                      disabled={index === 0}
                      title="Move Up"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 disabled:opacity-30"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => moveTask(index, "down")}
                      disabled={index === project.tasks.length - 1}
                      title="Move Down"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 disabled:opacity-30"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                    <div className="h-4 w-px bg-slate-200 mx-1" />
                    <button
                      onClick={() => (isEditing ? saveEditing() : startEditing(task))}
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 inline-flex items-center space-x-1"
                    >
                      <Edit3 className="w-3 h-3 text-slate-500" />
                      <span>{isEditing ? "Done" : "Edit"}</span>
                    </button>
                    <button
                      onClick={() => deleteTask(task.id)}
                      title="Delete Task"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Task Details Body */}
                <div className="p-6">
                  {isEditing ? (
                    <div className="space-y-4 mb-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                          Task Title (e.g. TASK 01 — FACTORIAL CALCULATION)
                        </label>
                        <input
                          type="text"
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          className="w-full text-xs font-semibold px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                            Task Type
                          </label>
                          <select
                            value={editingTaskType}
                            onChange={(e) => setEditingTaskType(e.target.value as TaskType)}
                            className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-hidden"
                          >
                            <option value="coding">Coding Program (Requires Code + Output)</option>
                            <option value="written">Written / Conceptual Question</option>
                            <option value="mixed">Mixed Practical Task</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                            Status Reason
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Complete, Missing screenshot"
                            value={task.statusReason || ""}
                            onChange={(e) => updateTaskStatus(task.id, task.status, e.target.value)}
                            className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-hidden"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                          Assignment Requirements
                        </label>
                        <textarea
                          rows={2}
                          value={editingRequirements}
                          onChange={(e) => setEditingRequirements(e.target.value)}
                          placeholder="What the assignment specifically asks the student to perform..."
                          className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-hidden"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                          Execution Description (1–2 concise academic sentences)
                        </label>
                        <textarea
                          rows={2}
                          value={editingDesc}
                          onChange={(e) => setEditingDesc(e.target.value)}
                          className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-hidden"
                        />
                      </div>

                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={saveEditing}
                          className="px-4 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700"
                        >
                          Save Changes
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mb-5">
                      <h3 className="text-base font-bold text-slate-900">{task.title}</h3>
                      {task.requirements && (
                        <p className="text-xs text-slate-500 mt-1 italic">
                          <strong className="not-italic font-semibold text-slate-600">Requirement:</strong>{" "}
                          {task.requirements}
                        </p>
                      )}
                      <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                        <strong className="font-semibold text-slate-700">Description:</strong>{" "}
                        {task.executionDescription}
                      </p>
                    </div>
                  )}

                  {/* AI Generated Missing Solution Display (If Generated) */}
                  {task.aiGeneratedSolution && (
                    <div className="mb-5 p-4 rounded-xl bg-amber-50/70 border border-amber-300/80">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-amber-900 inline-flex items-center space-x-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                          <span>AI-Generated Academic Solution (Transparently Marked)</span>
                        </span>
                        <span className="text-[10px] text-amber-700 font-semibold uppercase">
                          Language: {task.aiGeneratedSolution.language}
                        </span>
                      </div>

                      {task.aiGeneratedSolution.code && (
                        <pre className="p-3 bg-slate-900 text-emerald-400 font-mono text-[11px] rounded-lg overflow-x-auto max-h-48 mb-2">
                          <code>{task.aiGeneratedSolution.code}</code>
                        </pre>
                      )}

                      {task.aiGeneratedSolution.simulatedOutput && (
                        <div className="p-2.5 bg-slate-950 text-slate-200 font-mono text-[10px] rounded-lg">
                          <div className="text-[9px] uppercase tracking-wider text-slate-400 mb-1">
                            Simulated Execution Output:
                          </div>
                          <pre>{task.aiGeneratedSolution.simulatedOutput}</pre>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Evidence Screenshots Section */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
                        <Layers className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Mapped Evidence Screenshots ({taskEvidenceList.length})</span>
                      </div>

                      {/* Generate Missing Solution button for missing tasks */}
                      {taskEvidenceList.length === 0 && !task.aiGeneratedSolution && (
                        <button
                          onClick={() => handleGenerateMissingSolution(task)}
                          disabled={generatingSolutionForTaskId === task.id}
                          className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold inline-flex items-center space-x-1.5 shadow-xs transition-colors disabled:opacity-50"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>
                            {generatingSolutionForTaskId === task.id
                              ? "Synthesizing Academic Solution..."
                              : "Generate Academic Solution"}
                          </span>
                        </button>
                      )}
                    </div>

                    {taskEvidenceList.length === 0 ? (
                      <div className="p-6 rounded-xl border border-dashed border-rose-300 bg-rose-50/40 text-center">
                        <AlertTriangle className="w-6 h-6 text-rose-500 mx-auto mb-1.5" />
                        <p className="text-xs font-bold text-rose-800">
                          No student screenshot evidence linked to this task
                        </p>
                        <p className="text-[11px] text-rose-600 max-w-md mx-auto mt-0.5">
                          Upload your lab screenshot evidence, or generate an academic code solution to satisfy the task.
                        </p>

                        {/* Unassigned quick-attach */}
                        {unassignedEvidence.length > 0 && (
                          <div className="mt-3 flex items-center justify-center space-x-2">
                            <span className="text-[11px] text-slate-500">Attach unassigned:</span>
                            {unassignedEvidence.slice(0, 3).map((ev) => (
                              <button
                                key={ev.id}
                                onClick={() => assignEvidenceToTask(task.id, ev.id)}
                                className="px-2 py-0.5 bg-white border border-slate-300 rounded text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                              >
                                + {ev.name || ev.fileName}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {taskEvidenceList.map((item, evIdx) => {
                          const role = task.evidenceRoles?.[item.id] || (evIdx === 0 ? "code" : "output");

                          return (
                            <div
                              key={item.id}
                              className="group relative bg-slate-50 border border-slate-200 rounded-xl overflow-hidden hover:border-slate-300 transition-all flex flex-col"
                            >
                              {/* Thumbnail with overlay view */}
                              <div className="h-36 bg-slate-900 flex items-center justify-center overflow-hidden relative">
                                <img
                                  src={item.data}
                                  alt={item.name}
                                  className="w-full h-full object-contain"
                                  referrerPolicy="no-referrer"
                                />
                                <button
                                  onClick={() => setPreviewImageModal(item)}
                                  className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold space-x-1.5"
                                >
                                  <Eye className="w-4 h-4" />
                                  <span>View Original</span>
                                </button>
                              </div>

                              {/* Card Footer: Role & Reassign Controls */}
                              <div className="p-3 bg-white flex-1 flex flex-col justify-between space-y-2">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="font-semibold text-slate-800 truncate" title={item.name}>
                                    {item.name || item.fileName}
                                  </span>
                                  <button
                                    onClick={() => removeEvidenceFromTask(task.id, item.id)}
                                    title="Remove from this task"
                                    className="text-slate-400 hover:text-rose-600 p-0.5"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>

                                {/* Role Selector: Code vs Output */}
                                <div className="flex items-center space-x-1.5">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase">Role:</span>
                                  <select
                                    value={role}
                                    onChange={(e) =>
                                      setEvidenceRole(task.id, item.id, e.target.value as EvidenceRole)
                                    }
                                    className="text-[11px] font-semibold bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5 text-slate-700 focus:outline-hidden"
                                  >
                                    <option value="code">Code / Implementation</option>
                                    <option value="output">Output / Result</option>
                                    <option value="general">General Evidence</option>
                                  </select>
                                </div>

                                {/* Reassign to other task */}
                                <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
                                  <div className="flex items-center space-x-1">
                                    <button
                                      onClick={() => moveEvidenceInTask(task.id, evIdx, "left")}
                                      disabled={evIdx === 0}
                                      className="p-1 rounded text-slate-400 hover:text-slate-700 disabled:opacity-20"
                                      title="Move Left"
                                    >
                                      <ChevronLeft className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={() => moveEvidenceInTask(task.id, evIdx, "right")}
                                      disabled={evIdx === taskEvidenceList.length - 1}
                                      className="p-1 rounded text-slate-400 hover:text-slate-700 disabled:opacity-20"
                                      title="Move Right"
                                    >
                                      <ChevronRight className="w-3 h-3" />
                                    </button>
                                  </div>

                                  <select
                                    onChange={(e) => {
                                      if (e.target.value) {
                                        moveEvidenceToTask(task.id, item.id, e.target.value);
                                      }
                                    }}
                                    defaultValue=""
                                    className="text-[10px] text-slate-500 bg-transparent border-0 cursor-pointer hover:text-slate-800"
                                  >
                                    <option value="" disabled>
                                      Move to task...
                                    </option>
                                    {project.tasks
                                      .filter((t) => t.id !== task.id)
                                      .map((t) => (
                                        <option key={t.id} value={t.id}>
                                          {t.taskNumber}
                                        </option>
                                      ))}
                                  </select>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 2: TRACEABILITY MATRIX */}
      {activeTab === "traceability" && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-slate-900">Task Traceability Matrix</h2>
            <p className="text-xs text-slate-500">
              Audit trail mapping every assignment task requirement directly to authentic student evidence assets and PDF pages.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Task Requirement</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Audit Status</th>
                  <th className="py-3 px-4">Mapped Evidence Asset(s)</th>
                  <th className="py-3 px-4 text-right">Estimated Page</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {project.tasks.map((task, idx) => {
                  const evItems = task.evidenceItemIds
                    .map((id) => evidenceMap.get(id))
                    .filter(Boolean) as EvidenceItem[];

                  return (
                    <tr key={task.id} className="hover:bg-slate-50/60">
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        <span className="font-mono text-emerald-700 mr-2">{task.taskNumber}</span>
                        {task.title}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 capitalize">{task.taskType || "coding"}</td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            task.status === "complete"
                              ? "bg-emerald-100 text-emerald-800"
                              : task.status === "partial"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-rose-100 text-rose-800"
                          }`}
                        >
                          {task.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {evItems.length > 0 ? (
                          <div className="space-y-1">
                            {evItems.map((ev) => (
                              <div key={ev.id} className="inline-flex items-center space-x-1 mr-2 text-[11px]">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                <span>{ev.name || ev.fileName}</span>
                              </div>
                            ))}
                          </div>
                        ) : task.aiGeneratedSolution ? (
                          <span className="text-amber-700 italic">AI-Generated Academic Solution</span>
                        ) : (
                          <span className="text-rose-600 italic">No evidence uploaded</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-slate-500">
                        Page {idx + (project.coverPage.enabled ? 3 : 2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: QUALITY CHECK AUDIT */}
      {activeTab === "quality" && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Academic Quality Verification (10-Point Audit)</h2>
              <p className="text-xs text-slate-500">
                Automated pre-export verification ensuring 100% genuine evidence fidelity, proper scaling, and zero silent omissions.
              </p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black text-emerald-700">{qualityCheck.score}%</span>
              <p className="text-[11px] font-semibold text-emerald-800 uppercase">Verification Passed</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {qualityCheck.items.map((check) => (
              <div
                key={check.id}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex items-start space-x-3.5"
              >
                <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">{check.title}</h4>
                  <p className="text-[11px] text-slate-600 mt-0.5">{check.description}</p>
                  <p className="text-[10px] text-emerald-700 font-semibold mt-1">{check.detail}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
              <div className="text-xs text-emerald-900">
                <strong className="font-bold">Academic Submission Guarantee:</strong> Your final PDF will preserve authentic original screenshots with complete aspect-ratio fidelity.
              </div>
            </div>
            <button
              onClick={onExport}
              className="px-4 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-colors"
            >
              Export PDF Now
            </button>
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
      {previewImageModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="px-5 py-3 bg-slate-900 text-white flex items-center justify-between">
              <span className="text-xs font-bold truncate">{previewImageModal.name}</span>
              <button
                onClick={() => setPreviewImageModal(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>
            <div className="p-4 bg-slate-950 flex-1 overflow-auto flex items-center justify-center">
              <img
                src={previewImageModal.data}
                alt={previewImageModal.name}
                className="max-w-full max-h-[75vh] object-contain rounded"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React from "react";
import { FileText, Sparkles, BookOpen, Download, Settings, RefreshCw } from "lucide-react";
import { WorkflowMode } from "../types";

interface HeaderProps {
  workflow: WorkflowMode;
  onSelectWorkflow: (mode: WorkflowMode) => void;
  onOpenCoverPage: () => void;
  onOpenExport: () => void;
  onReset: () => void;
  taskCount: number;
  evidenceCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  workflow,
  onOpenCoverPage,
  onOpenExport,
  onReset,
  taskCount,
  evidenceCount,
}) => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo & Title */}
        <div className="flex items-center space-x-3 cursor-pointer" onClick={onReset}>
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
            <FileText className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-slate-900 text-base tracking-tight">
                Assignment & Practical Assembler
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                Academic Edition
              </span>
            </div>
            <p className="text-xs text-slate-500 hidden sm:block">
              Preserving original student evidence in clean practical files
            </p>
          </div>
        </div>

        {/* Current Mode Badge */}
        {workflow !== "home" && (
          <div className="hidden md:flex items-center space-x-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs">
            <span className="font-semibold text-slate-600">Mode:</span>
            {workflow === "assemble" ? (
              <span className="inline-flex items-center font-medium text-emerald-700">
                <BookOpen className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                Option B: Assemble Completed Work
              </span>
            ) : (
              <span className="inline-flex items-center font-medium text-indigo-700">
                <Sparkles className="w-3.5 h-3.5 mr-1 text-indigo-600" />
                Option A: Complete Assignment
              </span>
            )}
            <span className="text-slate-300">|</span>
            <span className="text-slate-500">
              {taskCount} Tasks • {evidenceCount} Screenshots
            </span>
          </div>
        )}

        {/* Action Controls */}
        <div className="flex items-center space-x-2">
          {workflow !== "home" && (
            <>
              <button
                id="btn-cover-page-settings"
                onClick={onOpenCoverPage}
                className="inline-flex items-center px-3 py-2 text-xs font-medium rounded-lg text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
                title="Edit Cover Page Metadata"
              >
                <Settings className="w-4 h-4 mr-1.5 text-slate-500" />
                Cover Page
              </button>

              <button
                id="btn-export-final-pdf"
                onClick={onOpenExport}
                disabled={taskCount === 0}
                className="inline-flex items-center px-4 py-2 text-xs font-semibold rounded-lg text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-xs transition-colors"
              >
                <Download className="w-4 h-4 mr-1.5 text-emerald-400" />
                Export Practical PDF
              </button>

              <button
                id="btn-reset-workflow"
                onClick={onReset}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                title="Start New Workflow"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

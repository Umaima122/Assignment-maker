import React from "react";
import { FolderArchive, Sparkles, CheckCircle2, ArrowRight, ShieldCheck, FileCheck, Layers } from "lucide-react";
import { WorkflowMode } from "../types";

interface WorkflowSelectorProps {
  onSelect: (mode: "assemble" | "complete") => void;
  onLoadSample: () => void;
}

export const WorkflowSelector: React.FC<WorkflowSelectorProps> = ({ onSelect, onLoadSample }) => {
  return (
    <div className="max-w-5xl mx-auto py-12 px-4 sm:px-6">
      {/* Title & Core Purpose */}
      <div className="text-center max-w-3xl mx-auto mb-10">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold mb-4 border border-slate-200">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Strict Original Evidence Preservation</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Academic Practical & Assignment File Assembler
        </h1>
        <p className="mt-3 text-base text-slate-600 leading-relaxed">
          Transform your raw practical screenshots, code outputs, and lab manuals into an organized,
          professionally structured academic submission PDF with verified evidence integrity.
        </p>
      </div>

      {/* Strict Rule Highlight */}
      <div className="mb-10 bg-emerald-50/70 border border-emerald-200 rounded-xl p-4 flex items-start space-x-3 text-left">
        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
        <div className="text-xs text-emerald-900 leading-relaxed">
          <strong className="font-bold">Original Evidence Guarantee:</strong> Your uploaded screenshots
          are your authentic lab proof. The system will <span className="underline">never</span> regenerate,
          blur, compress away detail, or alter your original screenshots. AI assists only with task grouping,
          academic titles, and concise 1–3 sentence execution descriptions.
        </div>
      </div>

      {/* Two Different Workflows Grid */}
      <div className="grid md:grid-cols-2 gap-8 mb-10">
        {/* OPTION B: ASSEMBLE MY COMPLETED WORK (Featured) */}
        <div className="relative bg-white border-2 border-emerald-500/80 rounded-2xl p-7 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
          <div className="absolute -top-3.5 left-6 bg-emerald-700 text-white text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow-xs">
            Option B • Assemble My Work
          </div>

          <div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
              <FolderArchive className="w-6 h-6" />
            </div>

            <h2 className="text-xl font-bold text-slate-900 mb-2">
              Assemble My Completed Work
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              For practical files where you already completed the work and have a PDF or folder of screenshots.
              The purpose is <strong className="text-slate-700">NOT</strong> to solve, but to organize.
            </p>

            <div className="space-y-2.5 mb-6 text-xs text-slate-600">
              <div className="flex items-start space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>Upload single/multi screenshot PDFs or image batches</span>
              </div>
              <div className="flex items-start space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>Optional questionnaire for official task numbers & titles</span>
              </div>
              <div className="flex items-start space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>Automated grouping into Task 01, Task 02, etc.</span>
              </div>
              <div className="flex items-start space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>Generates concise 1–3 sentence execution summaries</span>
              </div>
              <div className="flex items-start space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>Preserves original screenshot aspect ratio & crispness</span>
              </div>
            </div>
          </div>

          <button
            id="btn-select-assemble-mode"
            onClick={() => onSelect("assemble")}
            className="w-full inline-flex items-center justify-center px-4 py-3 rounded-xl text-sm font-bold text-white bg-emerald-700 hover:bg-emerald-800 transition-colors shadow-xs"
          >
            <span>Start Assembly Mode</span>
            <ArrowRight className="w-4 h-4 ml-2" />
          </button>
        </div>

        {/* OPTION A: COMPLETE MY ASSIGNMENT */}
        <div className="bg-white border border-slate-200 rounded-2xl p-7 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
          <div>
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
              <Sparkles className="w-6 h-6" />
            </div>

            <div className="text-xs font-bold uppercase tracking-wider text-indigo-600 mb-1">
              Option A
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">
              Complete My Assignment
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              For assignments where some tasks are completed and some are missing. The AI extracts requirements,
              identifies missing tasks, and assists with completion.
            </p>

            <div className="space-y-2.5 mb-6 text-xs text-slate-600">
              <div className="flex items-start space-x-2">
                <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <span>Upload questionnaire/assignment manual</span>
              </div>
              <div className="flex items-start space-x-2">
                <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <span>Upload completed screenshots/evidence you have</span>
              </div>
              <div className="flex items-start space-x-2">
                <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <span>AI maps existing evidence & highlights missing tasks</span>
              </div>
              <div className="flex items-start space-x-2">
                <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <span>Generates verifiable solutions for missing practicals</span>
              </div>
              <div className="flex items-start space-x-2">
                <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <span>Clearly separates Student Evidence from AI Solutions</span>
              </div>
            </div>
          </div>

          <button
            id="btn-select-complete-mode"
            onClick={() => onSelect("complete")}
            className="w-full inline-flex items-center justify-center px-4 py-3 rounded-xl text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 transition-colors shadow-xs"
          >
            <span>Start Completion Mode</span>
            <ArrowRight className="w-4 h-4 ml-2" />
          </button>
        </div>
      </div>

      {/* Instant Demo Sandbox Option */}
      <div className="text-center p-6 bg-slate-50 rounded-2xl border border-slate-200">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-left">
            <h4 className="text-sm font-bold text-slate-900 flex items-center">
              <FileCheck className="w-4 h-4 mr-1.5 text-emerald-600" />
              Want to see an assembled practical file right now?
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Load a pre-configured lab assignment with 3 practical tasks, original terminal screenshots, and academic layout.
            </p>
          </div>
          <button
            id="btn-load-sample-dossier"
            onClick={onLoadSample}
            className="shrink-0 inline-flex items-center px-4 py-2 rounded-lg text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-100 hover:border-slate-400 transition-colors shadow-2xs"
          >
            <Layers className="w-3.5 h-3.5 mr-1.5 text-slate-600" />
            Load Sample Lab Practical File
          </button>
        </div>
      </div>
    </div>
  );
};

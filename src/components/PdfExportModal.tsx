import React, { useEffect, useState } from "react";
import { AssignmentProject, EvidenceItem } from "../types";
import { generateAcademicPdf } from "../utils/pdfGenerator";
import { runAssignmentQualityCheck } from "../utils/qualityCheck";
import {
  Download,
  Printer,
  X,
  Loader2,
  FileCheck,
  CheckCircle2,
  ShieldCheck,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface PdfExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: AssignmentProject;
  evidenceMap: Map<string, EvidenceItem>;
}

export const PdfExportModal: React.FC<PdfExportModalProps> = ({
  isOpen,
  onClose,
  project,
  evidenceMap,
}) => {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(0);
  const [showQualityDetails, setShowQualityDetails] = useState(false);

  const qualityCheck = runAssignmentQualityCheck(project, evidenceMap);

  useEffect(() => {
    if (!isOpen) {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
      setPdfUrl(null);
      setPdfBlob(null);
      return;
    }

    let isMounted = true;
    setIsGenerating(true);
    setError(null);

    generateAcademicPdf(project, evidenceMap)
      .then(({ pdfBytes, totalPages: pages }) => {
        if (!isMounted) return;
        const blob = new Blob([pdfBytes as unknown as BlobPart], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        setPdfBlob(blob);
        setPdfUrl(url);
        setTotalPages(pages);
      })
      .catch((err) => {
        console.error("PDF generation failure:", err);
        if (isMounted) setError("Failed to compile PDF: " + (err?.message || "Unknown error"));
      })
      .finally(() => {
        if (isMounted) setIsGenerating(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, project, evidenceMap]);

  if (!isOpen) return null;

  const handleDownload = () => {
    if (!pdfBlob) return;
    const sanitizedTitle = (project.title || "assignment_submission")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "_");
    const filename = `${sanitizedTitle}_academic_dossier.pdf`;

    const a = document.createElement("a");
    a.href = pdfUrl!;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handlePrint = () => {
    if (!pdfUrl) return;
    const iframe = document.getElementById("pdf-preview-frame") as HTMLIFrameElement;
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.print();
    }
  };

  const totalEvidenceCount = project.tasks.reduce((a, t) => a + t.evidenceItemIds.length, 0);

  return (
    <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-2xl max-w-5xl w-full h-[92vh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Top Export Bar */}
        <div className="px-6 py-3.5 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
              <FileCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm tracking-tight">Assignment Completion & Academic PDF Export</h3>
              <p className="text-[11px] text-slate-400">
                Original evidence embedded • Verified traceability index • Standard academic A4 layout
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              disabled={!pdfUrl || isGenerating}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors disabled:opacity-50 inline-flex items-center space-x-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
            <button
              onClick={handleDownload}
              disabled={!pdfUrl || isGenerating}
              className="px-4 py-1.5 rounded-lg text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors disabled:opacity-50 inline-flex items-center space-x-1.5 shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Academic PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quality Audit Bar */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-2.5 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1.5 text-emerald-700 font-semibold">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Audit Score: {qualityCheck.score}% Verified</span>
            </div>
            <span className="text-slate-300">•</span>
            <span className="text-slate-600">
              {project.tasks.length} Tasks Audited • {totalEvidenceCount} Original Screenshots Preserved • {totalPages || "—"} Total Pages
            </span>
          </div>

          <button
            onClick={() => setShowQualityDetails(!showQualityDetails)}
            className="text-[11px] text-emerald-700 hover:text-emerald-800 font-medium inline-flex items-center space-x-1"
          >
            <span>{showQualityDetails ? "Hide Quality Checklist" : "View Quality Checklist (10 Points)"}</span>
            {showQualityDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Expandable Quality Checklist */}
        {showQualityDetails && (
          <div className="bg-emerald-50/40 border-b border-emerald-200 px-6 py-3 max-h-48 overflow-y-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {qualityCheck.items.map((check) => (
                <div key={check.id} className="flex items-start space-x-2 bg-white p-2 rounded border border-emerald-100">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-slate-800">{check.title}</span>
                    <p className="text-[11px] text-slate-500 leading-tight">{check.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PDF Preview Frame */}
        <div className="flex-1 bg-slate-100 relative overflow-hidden flex items-center justify-center">
          {isGenerating ? (
            <div className="flex flex-col items-center space-y-3">
              <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
              <p className="text-sm font-semibold text-slate-700">
                Compiling academic document with original screenshots & traceability index...
              </p>
              <p className="text-xs text-slate-500">
                Embedding authentic high-resolution images and generating table of contents
              </p>
            </div>
          ) : error ? (
            <div className="p-6 bg-rose-50 border border-rose-200 rounded-xl max-w-md text-center">
              <AlertCircle className="w-8 h-8 text-rose-600 mx-auto mb-2" />
              <p className="text-sm font-bold text-rose-800 mb-1">Failed to build PDF</p>
              <p className="text-xs text-rose-600 mb-4">{error}</p>
              <button
                onClick={onClose}
                className="px-4 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-semibold"
              >
                Close and Return to Editor
              </button>
            </div>
          ) : pdfUrl ? (
            <iframe
              id="pdf-preview-frame"
              src={`${pdfUrl}#toolbar=0&view=FitH`}
              className="w-full h-full border-0"
              title="Academic Assignment PDF Preview"
            />
          ) : null}
        </div>
      </div>
    </div>
  );
};

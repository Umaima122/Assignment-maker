import React, { useState, useRef } from "react";
import {
  Upload,
  FileText,
  Image as ImageIcon,
  Check,
  AlertCircle,
  Loader2,
  Trash2,
  FileUp,
  HelpCircle,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";
import { EvidenceItem } from "../types";
import { extractEvidenceFromFile } from "../utils/pdfExtractor";
import { extractTextAndImagesFromDocx, isDocxFile, isLegacyDocFile } from "../utils/docxExtractor";

interface UploadStepProps {
  workflow: "assemble" | "complete";
  onProceedToWorkspace: (
    evidence: EvidenceItem[],
    questionnaireText: string,
    questionnaireImages: string[]
  ) => void;
  isAnalyzing: boolean;
}

export const UploadStep: React.FC<UploadStepProps> = ({
  workflow,
  onProceedToWorkspace,
  isAnalyzing,
}) => {
  const [evidenceItems, setEvidenceItems] = useState<EvidenceItem[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractProgress, setExtractProgress] = useState("");
  const [questionnaireText, setQuestionnaireText] = useState("");
  const [questionnaireFiles, setQuestionnaireFiles] = useState<File[]>([]);
  const [questionnairePreviews, setQuestionnairePreviews] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const evidenceInputRef = useRef<HTMLInputElement>(null);
  const questionnaireInputRef = useRef<HTMLInputElement>(null);

  // Handle Evidence Files Upload (PDFs, Word documents, and/or Images)
  const handleEvidenceFiles = async (files: FileList | File[]) => {
    setErrorMessage(null);
    setIsExtracting(true);
    const newItems: EvidenceItem[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setExtractProgress(`Extracting evidence from ${file.name} (${i + 1}/${files.length})...`);
        const extracted = await extractEvidenceFromFile(file, evidenceItems.length + newItems.length);
        newItems.push(...extracted);
      }
      setEvidenceItems((prev) => [...prev, ...newItems]);
    } catch (err: any) {
      console.error("Extraction error:", err);
      setErrorMessage(
        err?.message || "Failed to parse uploaded PDF, Word (.docx), or image file. Please check file format."
      );
    } finally {
      setIsExtracting(false);
      setExtractProgress("");
    }
  };

  // Handle Questionnaire Files Upload (PDF, Word .docx, Images, Text)
  const handleQuestionnaireFiles = async (files: FileList | File[]) => {
    setErrorMessage(null);
    const previews: string[] = [];
    let extractedDocText = "";

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.type.startsWith("image/")) {
          const dataUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
          });
          previews.push(dataUrl);
        } else if (isDocxFile(file)) {
          const { text: docText, images } = await extractTextAndImagesFromDocx(file);
          if (docText) {
            extractedDocText += (extractedDocText ? "\n\n" : "") + docText;
          }
          previews.push(...images);
        } else if (
          file.name.toLowerCase().endsWith(".txt") ||
          file.name.toLowerCase().endsWith(".md") ||
          file.type === "text/plain"
        ) {
          const txt = await file.text();
          if (txt) {
            extractedDocText += (extractedDocText ? "\n\n" : "") + txt;
          }
        } else if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
          // extract first few pages of questionnaire
          const pages = await extractEvidenceFromFile(file, 0);
          pages.slice(0, 4).forEach((p) => previews.push(p.data));
        } else if (isLegacyDocFile(file)) {
          setErrorMessage(
            `Legacy Word (.doc) format detected for ${file.name}. Please open the file in Microsoft Word or Google Docs and save it as .docx or .pdf to read the questionnaire.`
          );
        }
      }

      if (extractedDocText) {
        setQuestionnaireText((prev) =>
          prev ? prev + "\n\n" + extractedDocText : extractedDocText
        );
      }
      setQuestionnaireFiles((prev) => [...prev, ...Array.from(files)]);
      setQuestionnairePreviews((prev) => [...prev, ...previews]);
    } catch (err: any) {
      console.error("Questionnaire parse error:", err);
      setErrorMessage(err?.message || "Failed to process questionnaire file.");
    }
  };

  const removeEvidenceItem = (id: string) => {
    setEvidenceItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleStartAnalysis = () => {
    if (evidenceItems.length === 0) {
      setErrorMessage("Please upload at least one screenshot PDF or image containing your practical work.");
      return;
    }
    if (workflow === "complete" && !questionnaireText && questionnairePreviews.length === 0) {
      setErrorMessage(
        "For 'Complete My Assignment' mode, please provide the questionnaire or task list so missing tasks can be identified."
      );
      return;
    }
    onProceedToWorkspace(evidenceItems, questionnaireText, questionnairePreviews);
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6">
      {/* Mode Headline */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
              {workflow === "assemble"
                ? "Workflow: Assemble Completed Work"
                : "Workflow: Complete My Assignment"}
            </span>
            <h2 className="text-2xl font-bold text-slate-900 mt-2">
              {workflow === "assemble"
                ? "Upload Your Practical Screenshots & Task List"
                : "Upload Assignment Requirements & Completed Evidence"}
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              {workflow === "assemble"
                ? "Upload one PDF containing all screenshots, multiple PDFs, or individual image files."
                : "Provide your assignment questionnaire and whatever work you've already finished."}
            </p>
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="mb-6 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-4 text-xs flex items-center space-x-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="grid md:grid-cols-12 gap-8">
        {/* STEP 1: Assignment / Questionnaire (Optional for Assemble, Mandatory for Complete) */}
        <div className="md:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Step 1
              </span>
              <span
                className={`text-xs px-2 py-0.5 rounded font-medium ${
                  workflow === "assemble"
                    ? "bg-slate-100 text-slate-600"
                    : "bg-indigo-50 text-indigo-700 border border-indigo-200"
                }`}
              >
                {workflow === "assemble" ? "Optional Task List" : "Required Questionnaire"}
              </span>
            </div>

            <h3 className="text-base font-bold text-slate-900 mb-1">
              Assignment / Lab Questionnaire
            </h3>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              Used to extract precise task numbers, titles, required sequence, and topics.
              {workflow === "assemble" &&
                " If omitted, tasks will be inferred directly from your screenshots."}
            </p>

            {/* Paste Text Area */}
            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Paste Task List / Manual Text (Optional)
              </label>
              <textarea
                id="input-questionnaire-text"
                rows={4}
                value={questionnaireText}
                onChange={(e) => setQuestionnaireText(e.target.value)}
                placeholder="e.g.&#10;Task 01: Factorial Calculation Program&#10;Task 02: Student Management System&#10;Task 03: PostgreSQL Database Connection..."
                className="w-full text-xs font-mono p-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-slate-900 focus:border-slate-900 bg-slate-50/50"
              />
            </div>

            {/* Or Upload Questionnaire File */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Or Upload Lab Manual / Task Document (PDF, Word .docx, Images, Text)
              </label>
              <input
                type="file"
                ref={questionnaireInputRef}
                multiple
                accept=".pdf,.docx,.doc,.txt,.md,image/*"
                onChange={(e) => e.target.files && handleQuestionnaireFiles(e.target.files)}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => questionnaireInputRef.current?.click()}
                className="w-full border border-dashed border-slate-300 rounded-lg p-3 text-center hover:bg-slate-50 transition-colors flex items-center justify-center space-x-2 text-xs text-slate-600"
              >
                <FileUp className="w-4 h-4 text-slate-500" />
                <span>Select Questionnaire File(s) (.docx, .pdf, images)</span>
              </button>

              {questionnaireFiles.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  {questionnaireFiles.map((f, i) => (
                    <div
                      key={i}
                      className="text-xs flex items-center justify-between bg-slate-100 px-2.5 py-1.5 rounded text-slate-700"
                    >
                      <span className="truncate max-w-[200px]">{f.name}</span>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 text-[11px] text-slate-500 flex items-center">
            <HelpCircle className="w-3.5 h-3.5 mr-1 text-slate-400 shrink-0" />
            <span>Official task titles and numbering will be matched directly.</span>
          </div>
        </div>

        {/* STEP 2: Screenshot PDF / Word Docx / Evidence Upload (Primary) */}
        <div className="md:col-span-7 bg-white border-2 border-emerald-500/60 rounded-2xl p-6 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                Step 2 • Evidence Upload
              </span>
              <span className="text-xs px-2 py-0.5 rounded font-bold bg-emerald-100 text-emerald-800">
                Original Proof
              </span>
            </div>

            <h3 className="text-base font-bold text-slate-900 mb-1">
              Upload Practical Screenshots (PDF, Word .docx, or Images)
            </h3>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              Upload your completed work. Can be a Word (.docx) document with embedded screenshots,
              one or more PDFs, or loose image files. Original quality and aspect ratio are strictly preserved.
            </p>

            {/* Dropzone */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files) handleEvidenceFiles(e.dataTransfer.files);
              }}
              onClick={() => evidenceInputRef.current?.click()}
              className="border-2 border-dashed border-emerald-300 hover:border-emerald-500 bg-emerald-50/30 hover:bg-emerald-50/60 rounded-xl p-8 text-center cursor-pointer transition-all"
            >
              <input
                type="file"
                ref={evidenceInputRef}
                multiple
                accept=".pdf,.docx,.doc,image/*"
                onChange={(e) => e.target.files && handleEvidenceFiles(e.target.files)}
                className="hidden"
              />
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-3">
                <Upload className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-slate-800">
                Drag & drop your screenshot PDF, Word (.docx) document, or images here
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Supports .DOCX, .PDF, .PNG, .JPG, .JPEG (Extracts embedded screenshots automatically)
              </p>
            </div>

            {/* Extraction Loader */}
            {isExtracting && (
              <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center space-x-3 text-xs text-slate-700">
                <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                <span>{extractProgress || "Extracting high-resolution screenshot pages..."}</span>
              </div>
            )}

            {/* Extracted Evidence Gallery */}
            {evidenceItems.length > 0 && (
              <div className="mt-5">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-xs font-bold text-slate-800">
                    Detected Evidence ({evidenceItems.length} Pages/Screenshots)
                  </span>
                  <span className="text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    ✓ Original Student Evidence
                  </span>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 max-h-56 overflow-y-auto p-2 border border-slate-200 rounded-xl bg-slate-50/60">
                  {evidenceItems.map((item, idx) => (
                    <div
                      key={item.id}
                      className="relative group bg-white border border-slate-200 rounded-lg overflow-hidden shadow-2xs flex flex-col"
                    >
                      <div className="aspect-video bg-slate-900 overflow-hidden relative">
                        <img
                          src={item.data}
                          alt={item.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <span className="absolute bottom-1 right-1 bg-black/75 text-white text-[9px] px-1 py-0.2 rounded font-mono">
                          #{idx + 1}
                        </span>
                      </div>
                      <div className="p-1.5 text-[10px] text-slate-600 truncate">
                        {item.name}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeEvidenceItem(item.id);
                        }}
                        className="absolute top-1 right-1 bg-rose-600 text-white p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-700"
                        title="Remove page"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Bottom Action */}
          <div className="mt-8 pt-5 border-t border-slate-100 flex items-center justify-between">
            <div className="text-xs text-slate-500">
              {evidenceItems.length > 0 ? (
                <span className="text-emerald-700 font-medium">
                  {evidenceItems.length} screenshot{evidenceItems.length > 1 ? "s" : ""} ready for grouping
                </span>
              ) : (
                <span>Upload your PDF or screenshots to proceed</span>
              )}
            </div>

            <button
              id="btn-start-ai-assembly"
              onClick={handleStartAnalysis}
              disabled={evidenceItems.length === 0 || isAnalyzing || isExtracting}
              className="inline-flex items-center px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-xs transition-colors"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin text-emerald-400" />
                  Analyzing Evidence & Grouping Tasks...
                </>
              ) : (
                <>
                  <span>
                    {workflow === "assemble"
                      ? "Analyze & Assemble My Work"
                      : "Analyze Tasks & Check Missing"}
                  </span>
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

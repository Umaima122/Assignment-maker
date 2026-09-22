import { PDFDocument, rgb, StandardFonts, PDFPage } from "pdf-lib";
import { AssignmentProject, EvidenceItem, TaskGroup, TraceabilityEntry } from "../types";

export interface GeneratePdfResult {
  pdfBytes: Uint8Array;
  traceability: TraceabilityEntry[];
  totalPages: number;
}

export async function generateAcademicPdf(
  project: AssignmentProject,
  evidenceMap: Map<string, EvidenceItem>
): Promise<GeneratePdfResult> {
  const pdfDoc = await PDFDocument.create();

  // Load standard fonts
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontCode = await pdfDoc.embedFont(StandardFonts.Courier);

  const pageWidth = 595.28; // Standard A4 points (210mm)
  const pageHeight = 841.89; // Standard A4 points (297mm)
  const margin = 40;
  const contentWidth = pageWidth - margin * 2;

  let pageIndex = 0;
  const createdPages: { page: PDFPage; pageNumber: number; headerTitle?: string }[] = [];
  const traceabilityList: TraceabilityEntry[] = [];

  // ==========================================
  // 1. COVER PAGE (If enabled)
  // ==========================================
  if (project.coverPage.enabled) {
    pageIndex++;
    const cover = pdfDoc.addPage([pageWidth, pageHeight]);
    createdPages.push({ page: cover, pageNumber: pageIndex, headerTitle: "Cover" });

    // Outer double border
    cover.drawRectangle({
      x: margin - 10,
      y: margin - 10,
      width: contentWidth + 20,
      height: pageHeight - margin * 2 + 20,
      borderColor: rgb(0.15, 0.2, 0.3),
      borderWidth: 1.5,
    });

    cover.drawRectangle({
      x: margin - 6,
      y: margin - 6,
      width: contentWidth + 12,
      height: pageHeight - margin * 2 + 12,
      borderColor: rgb(0.8, 0.85, 0.9),
      borderWidth: 0.75,
    });

    let cursorY = pageHeight - 110;

    // Institution Name
    if (project.coverPage.institution) {
      const instText = project.coverPage.institution.toUpperCase();
      const instWidth = fontBold.widthOfTextAtSize(instText, 15);
      cover.drawText(instText, {
        x: (pageWidth - instWidth) / 2,
        y: cursorY,
        size: 15,
        font: fontBold,
        color: rgb(0.12, 0.16, 0.25),
      });
      cursorY -= 35;
    }

    // Divider
    cover.drawLine({
      start: { x: margin + 25, y: cursorY },
      end: { x: pageWidth - margin - 25, y: cursorY },
      thickness: 1,
      color: rgb(0.75, 0.8, 0.88),
    });
    cursorY -= 50;

    // Course Name
    if (project.coverPage.courseName) {
      const courseText = project.coverPage.courseName.toUpperCase();
      const courseWidth = fontBold.widthOfTextAtSize(courseText, 12);
      cover.drawText(courseText, {
        x: (pageWidth - courseWidth) / 2,
        y: cursorY,
        size: 12,
        font: fontBold,
        color: rgb(0.35, 0.45, 0.6),
      });
      cursorY -= 30;
    }

    // Assignment Title
    const titleText = (
      project.coverPage.assignmentTitle ||
      project.title ||
      "ASSIGNMENT COMPLETION & PRACTICAL FILE"
    ).toUpperCase();
    const titleLines = wrapText(titleText, 20, fontBold, contentWidth - 40);
    for (const line of titleLines) {
      const lineWidth = fontBold.widthOfTextAtSize(line, 20);
      cover.drawText(line, {
        x: (pageWidth - lineWidth) / 2,
        y: cursorY,
        size: 20,
        font: fontBold,
        color: rgb(0.08, 0.12, 0.2),
      });
      cursorY -= 26;
    }

    cursorY -= 60;

    // Submission Metadata Card
    const metaBoxHeight = 160;
    const metaBoxY = 160;
    cover.drawRectangle({
      x: margin + 30,
      y: metaBoxY,
      width: contentWidth - 60,
      height: metaBoxHeight,
      color: rgb(0.97, 0.98, 1.0),
      borderColor: rgb(0.8, 0.85, 0.92),
      borderWidth: 1,
    });

    const metaFields = [
      { label: "Submitted By", value: project.coverPage.studentName || "Student" },
      { label: "Roll / ID Number", value: project.coverPage.rollNumber || "—" },
      { label: "Evaluated By", value: project.coverPage.instructorName || "Instructor / Professor" },
      { label: "Submission Date", value: project.coverPage.submissionDate || new Date().toLocaleDateString() },
      { label: "Total Tasks Audited", value: `${project.tasks.length} Questions / Practical Tasks` },
    ];

    let metaY = metaBoxY + metaBoxHeight - 28;
    for (const field of metaFields) {
      cover.drawText(`${field.label}:`, {
        x: margin + 50,
        y: metaY,
        size: 9.5,
        font: fontBold,
        color: rgb(0.3, 0.35, 0.45),
      });
      cover.drawText(field.value, {
        x: margin + 200,
        y: metaY,
        size: 10,
        font: fontRegular,
        color: rgb(0.1, 0.12, 0.18),
      });
      metaY -= 25;
    }
  }

  // ==========================================
  // 2. TRACEABILITY MATRIX PAGE
  // ==========================================
  // Mandatory academic requirement: Task -> Evidence -> Page mapping
  pageIndex++;
  const tocPage = pdfDoc.addPage([pageWidth, pageHeight]);
  createdPages.push({ page: tocPage, pageNumber: pageIndex, headerTitle: "Traceability Index" });

  let tocY = pageHeight - margin - 30;

  tocPage.drawText("TASK TRACEABILITY & EVIDENCE AUDIT INDEX", {
    x: margin,
    y: tocY,
    size: 13,
    font: fontBold,
    color: rgb(0.1, 0.15, 0.25),
  });
  tocY -= 14;

  tocPage.drawText("Verification of assignment requirements against authentic uploaded evidence assets.", {
    x: margin,
    y: tocY,
    size: 8.5,
    font: fontRegular,
    color: rgb(0.4, 0.45, 0.55),
  });
  tocY -= 20;

  // Table header
  tocPage.drawRectangle({
    x: margin,
    y: tocY - 18,
    width: contentWidth,
    height: 22,
    color: rgb(0.92, 0.94, 0.98),
    borderColor: rgb(0.8, 0.84, 0.9),
    borderWidth: 1,
  });

  tocPage.drawText("TASK / QUESTION", { x: margin + 8, y: tocY - 12, size: 8, font: fontBold, color: rgb(0.2, 0.25, 0.35) });
  tocPage.drawText("STATUS", { x: margin + 175, y: tocY - 12, size: 8, font: fontBold, color: rgb(0.2, 0.25, 0.35) });
  tocPage.drawText("MAPPED EVIDENCE ASSET(S)", { x: margin + 250, y: tocY - 12, size: 8, font: fontBold, color: rgb(0.2, 0.25, 0.35) });
  tocPage.drawText("PAGE", { x: pageWidth - margin - 40, y: tocY - 12, size: 8, font: fontBold, color: rgb(0.2, 0.25, 0.35) });
  tocY -= 28;

  // Track task start pages for TOC
  const taskStartPages: Map<string, number> = new Map();

  // ==========================================
  // 3. TASK PAGES GENERATION
  // ==========================================
  for (let tIdx = 0; tIdx < project.tasks.length; tIdx++) {
    const task = project.tasks[tIdx];
    const taskEvidenceItems: EvidenceItem[] = [];
    const taskEvidenceFiles: { id: string; name: string; role: "code" | "output" | "general" }[] = [];

    for (const eid of task.evidenceItemIds) {
      const item = evidenceMap.get(eid);
      if (item) {
        taskEvidenceItems.push(item);
        const role = task.evidenceRoles?.[eid] || "general";
        taskEvidenceFiles.push({ id: item.id, name: item.name || item.fileName, role });
      }
    }

    // Start each primary task on a fresh page
    pageIndex++;
    let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
    const startPage = pageIndex;
    taskStartPages.set(task.id, startPage);
    createdPages.push({ page: currentPage, pageNumber: pageIndex, headerTitle: task.taskNumber });

    let cursorY = pageHeight - margin - 20;

    // Header Card
    const isCoding = task.taskType === "coding" || (!task.taskType && task.title.toLowerCase().includes("program"));
    const isWritten = task.taskType === "written";

    const headerBoxHeight = 54;
    currentPage.drawRectangle({
      x: margin,
      y: cursorY - headerBoxHeight,
      width: contentWidth,
      height: headerBoxHeight,
      color: isCoding ? rgb(0.96, 0.98, 1.0) : rgb(0.98, 0.97, 1.0),
      borderColor: rgb(0.8, 0.85, 0.92),
      borderWidth: 1,
    });

    // Task Number & Title
    const headerTitle = task.title.toUpperCase();
    const truncatedTitle = truncateString(headerTitle, 70);
    currentPage.drawText(truncatedTitle, {
      x: margin + 12,
      y: cursorY - 18,
      size: 11,
      font: fontBold,
      color: rgb(0.08, 0.14, 0.28),
    });

    // Sub-badges: Status & Type
    const statusText =
      task.status === "complete"
        ? "✓ COMPLETE"
        : task.status === "partial"
        ? "⚠ PARTIAL"
        : "✗ MISSING EVIDENCE";
    const statusColor =
      task.status === "complete"
        ? rgb(0.08, 0.55, 0.35)
        : task.status === "partial"
        ? rgb(0.85, 0.5, 0.1)
        : rgb(0.85, 0.2, 0.2);

    currentPage.drawText(statusText, {
      x: margin + 12,
      y: cursorY - 36,
      size: 8,
      font: fontBold,
      color: statusColor,
    });

    const typeLabel = isCoding ? "Coding Task" : isWritten ? "Written Question" : "Practical Task";
    currentPage.drawText(`•  ${typeLabel}`, {
      x: margin + 120,
      y: cursorY - 36,
      size: 8,
      font: fontRegular,
      color: rgb(0.4, 0.45, 0.55),
    });

    if (task.statusReason) {
      currentPage.drawText(`(${task.statusReason})`, {
        x: margin + 200,
        y: cursorY - 36,
        size: 7.5,
        font: fontRegular,
        color: rgb(0.5, 0.55, 0.65),
      });
    }

    cursorY -= headerBoxHeight + 16;

    // Requirements (if available)
    if (task.requirements) {
      currentPage.drawText("Requirements:", {
        x: margin,
        y: cursorY,
        size: 9.5,
        font: fontBold,
        color: rgb(0.2, 0.25, 0.35),
      });
      cursorY -= 13;

      const reqLines = wrapText(task.requirements, 9, fontRegular, contentWidth);
      for (const line of reqLines.slice(0, 3)) {
        currentPage.drawText(line, {
          x: margin,
          y: cursorY,
          size: 8.5,
          font: fontRegular,
          color: rgb(0.25, 0.3, 0.38),
        });
        cursorY -= 12;
      }
      cursorY -= 6;
    }

    // Short Execution / Problem Description (1-2 lines)
    currentPage.drawText("Description:", {
      x: margin,
      y: cursorY,
      size: 9.5,
      font: fontBold,
      color: rgb(0.18, 0.22, 0.3),
    });
    cursorY -= 13;

    const descLines = wrapText(task.executionDescription, 9.5, fontRegular, contentWidth);
    for (const line of descLines) {
      currentPage.drawText(line, {
        x: margin,
        y: cursorY,
        size: 9,
        font: fontRegular,
        color: rgb(0.2, 0.24, 0.3),
      });
      cursorY -= 13;
    }

    cursorY -= 10;

    // Section Divider
    currentPage.drawLine({
      start: { x: margin, y: cursorY },
      end: { x: pageWidth - margin, y: cursorY },
      thickness: 0.75,
      color: rgb(0.85, 0.88, 0.92),
    });
    cursorY -= 16;

    // Written Question Answer Section (if written)
    if (isWritten && (task.studentAnswer || task.aiGeneratedSolution?.writtenAnswer)) {
      const isStudentAnswer = !!task.studentAnswer;
      const answerText = task.studentAnswer || task.aiGeneratedSolution?.writtenAnswer || "";

      currentPage.drawText(
        isStudentAnswer ? "Answer (Student Provided):" : "Answer [AI-Generated Academic Solution]:",
        {
          x: margin,
          y: cursorY,
          size: 9.5,
          font: fontBold,
          color: isStudentAnswer ? rgb(0.1, 0.15, 0.25) : rgb(0.7, 0.35, 0.05),
        }
      );
      cursorY -= 14;

      const answerLines = wrapText(answerText, 9.5, fontRegular, contentWidth - 16);
      const answerBoxHeight = Math.min(answerLines.length * 13 + 16, 200);

      currentPage.drawRectangle({
        x: margin,
        y: cursorY - answerBoxHeight + 10,
        width: contentWidth,
        height: answerBoxHeight,
        color: isStudentAnswer ? rgb(0.98, 0.99, 1.0) : rgb(1.0, 0.98, 0.94),
        borderColor: isStudentAnswer ? rgb(0.85, 0.88, 0.92) : rgb(0.92, 0.7, 0.4),
        borderWidth: 1,
      });

      let ansY = cursorY - 4;
      for (const aLine of answerLines) {
        if (ansY < cursorY - answerBoxHeight + 16) break;
        currentPage.drawText(aLine, {
          x: margin + 8,
          y: ansY,
          size: 9,
          font: fontRegular,
          color: rgb(0.15, 0.18, 0.22),
        });
        ansY -= 13;
      }

      cursorY -= answerBoxHeight + 14;
    }

    // Now insert Evidence Screenshots or Missing Solution
    if (taskEvidenceItems.length > 0) {
      for (let i = 0; i < taskEvidenceItems.length; i++) {
        const item = taskEvidenceItems[i];
        const role = task.evidenceRoles?.[item.id] || (i === 0 ? "code" : "output");

        const imgEmbed = await embedBase64Image(pdfDoc, item.data);
        if (!imgEmbed) continue;

        const imgWidth = imgEmbed.width;
        const imgHeight = imgEmbed.height;
        const aspectRatio = imgWidth / imgHeight;

        // Label above screenshot: Distinguish Code vs Output vs Evidence
        let roleHeading = `Screenshot ${i + 1}`;
        if (isCoding) {
          if (role === "code") roleHeading = `Code / Implementation (Screenshot ${i + 1})`;
          else if (role === "output") roleHeading = `Output / Result (Screenshot ${i + 1})`;
        } else {
          roleHeading = `Evidence / Diagram (Screenshot ${i + 1})`;
        }

        // Available vertical space
        let availableHeight = cursorY - (margin + 45);

        let targetWidth = contentWidth;
        let targetHeight = targetWidth / aspectRatio;

        // If it doesn't fit on this page, advance to new page
        if (targetHeight > availableHeight && availableHeight < 180) {
          pageIndex++;
          currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
          createdPages.push({ page: currentPage, pageNumber: pageIndex, headerTitle: task.taskNumber });
          cursorY = pageHeight - margin - 20;

          // Continuation label
          currentPage.drawText(`${task.taskNumber} (Continued)`, {
            x: margin,
            y: cursorY,
            size: 8.5,
            font: fontBold,
            color: rgb(0.4, 0.45, 0.55),
          });
          cursorY -= 18;
          availableHeight = cursorY - (margin + 45);
        }

        if (targetHeight > availableHeight) {
          targetHeight = availableHeight;
          targetWidth = targetHeight * aspectRatio;
        }

        // Draw Section Subheader
        currentPage.drawText(roleHeading, {
          x: margin,
          y: cursorY,
          size: 9,
          font: fontBold,
          color: rgb(0.18, 0.22, 0.3),
        });
        cursorY -= 14;

        // Center the screenshot
        const drawX = margin + (contentWidth - targetWidth) / 2;
        const drawY = cursorY - targetHeight;

        // Screenshot frame
        currentPage.drawRectangle({
          x: drawX - 1,
          y: drawY - 1,
          width: targetWidth + 2,
          height: targetHeight + 2,
          borderColor: rgb(0.82, 0.86, 0.92),
          borderWidth: 1,
          color: rgb(1, 1, 1),
        });

        // Insert EXACT ORIGINAL SCREENSHOT (Rule 4: zero recreation)
        currentPage.drawImage(imgEmbed, {
          x: drawX,
          y: drawY,
          width: targetWidth,
          height: targetHeight,
        });

        cursorY = drawY - 16;
      }
    } else if (task.aiGeneratedSolution?.code) {
      // AI Generated Missing Solution (Transparently marked per Rule 3 & 14)
      currentPage.drawRectangle({
        x: margin,
        y: cursorY - 24,
        width: contentWidth,
        height: 22,
        color: rgb(1.0, 0.96, 0.92),
        borderColor: rgb(0.9, 0.6, 0.3),
        borderWidth: 1,
      });

      currentPage.drawText("[AI-GENERATED SOLUTION FOR MISSING TASK]", {
        x: margin + 10,
        y: cursorY - 16,
        size: 8.5,
        font: fontBold,
        color: rgb(0.7, 0.35, 0.05),
      });
      cursorY -= 32;

      // Draw code implementation block
      currentPage.drawText(`Implementation (${task.aiGeneratedSolution.language || "Code"}):`, {
        x: margin,
        y: cursorY,
        size: 9,
        font: fontBold,
        color: rgb(0.2, 0.25, 0.35),
      });
      cursorY -= 13;

      const codeLines = task.aiGeneratedSolution.code.split("\n").slice(0, 18);
      const codeBoxHeight = Math.min(codeLines.length * 11 + 14, 210);

      currentPage.drawRectangle({
        x: margin,
        y: cursorY - codeBoxHeight + 8,
        width: contentWidth,
        height: codeBoxHeight,
        color: rgb(0.97, 0.97, 0.98),
        borderColor: rgb(0.85, 0.87, 0.9),
        borderWidth: 1,
      });

      let codeY = cursorY - 4;
      for (const cLine of codeLines) {
        if (codeY < cursorY - codeBoxHeight + 14) break;
        currentPage.drawText(truncateString(cLine, 85), {
          x: margin + 10,
          y: codeY,
          size: 8,
          font: fontCode,
          color: rgb(0.12, 0.15, 0.2),
        });
        codeY -= 11;
      }

      cursorY -= codeBoxHeight + 14;

      // Simulated Output
      if (task.aiGeneratedSolution.simulatedOutput) {
        currentPage.drawText("Demonstrated Output (Simulation):", {
          x: margin,
          y: cursorY,
          size: 9,
          font: fontBold,
          color: rgb(0.2, 0.25, 0.35),
        });
        cursorY -= 13;

        const outLines = task.aiGeneratedSolution.simulatedOutput.split("\n").slice(0, 8);
        const outBoxHeight = Math.min(outLines.length * 11 + 14, 110);

        currentPage.drawRectangle({
          x: margin,
          y: cursorY - outBoxHeight + 8,
          width: contentWidth,
          height: outBoxHeight,
          color: rgb(0.1, 0.12, 0.15),
          borderColor: rgb(0.2, 0.25, 0.3),
          borderWidth: 1,
        });

        let outY = cursorY - 4;
        for (const oLine of outLines) {
          if (outY < cursorY - outBoxHeight + 14) break;
          currentPage.drawText(truncateString(oLine, 85), {
            x: margin + 10,
            y: outY,
            size: 8,
            font: fontCode,
            color: rgb(0.4, 0.9, 0.5),
          });
          outY -= 11;
        }

        cursorY -= outBoxHeight + 16;
      }
    } else {
      // Missing work notice
      currentPage.drawRectangle({
        x: margin,
        y: cursorY - 40,
        width: contentWidth,
        height: 40,
        color: rgb(1.0, 0.95, 0.95),
        borderColor: rgb(0.9, 0.4, 0.4),
        borderWidth: 1,
      });

      currentPage.drawText("✗ EVIDENCE NOT PROVIDED FOR THIS TASK", {
        x: margin + 12,
        y: cursorY - 18,
        size: 9,
        font: fontBold,
        color: rgb(0.8, 0.15, 0.15),
      });

      currentPage.drawText("No screenshot or student answer was uploaded for this requirement in the dossier.", {
        x: margin + 12,
        y: cursorY - 32,
        size: 8,
        font: fontRegular,
        color: rgb(0.5, 0.2, 0.2),
      });
    }

    const endPage = pageIndex;
    const pageDisplay = startPage === endPage ? `Page ${startPage}` : `Pages ${startPage}–${endPage}`;
    traceabilityList.push({
      taskNumber: task.taskNumber,
      taskTitle: task.title,
      status: task.status,
      statusReason: task.statusReason || (task.status === "complete" ? "Complete" : "Missing"),
      evidenceFiles: taskEvidenceFiles,
      pdfPageDisplay: pageDisplay,
    });
  }

  // ==========================================
  // Fill in the Traceability Index on TOC Page
  // ==========================================
  for (let i = 0; i < traceabilityList.length; i++) {
    if (tocY < margin + 40) break; // Don't overflow TOC page
    const entry = traceabilityList[i];

    // Alternating row background
    if (i % 2 === 0) {
      tocPage.drawRectangle({
        x: margin,
        y: tocY - 14,
        width: contentWidth,
        height: 18,
        color: rgb(0.98, 0.98, 0.99),
      });
    }

    // Task label
    tocPage.drawText(truncateString(`${entry.taskNumber}: ${entry.taskTitle}`, 32), {
      x: margin + 6,
      y: tocY - 10,
      size: 7.5,
      font: fontBold,
      color: rgb(0.12, 0.15, 0.22),
    });

    // Status
    const statusColor =
      entry.status === "complete"
        ? rgb(0.08, 0.55, 0.35)
        : entry.status === "partial"
        ? rgb(0.85, 0.5, 0.1)
        : rgb(0.85, 0.2, 0.2);
    tocPage.drawText(entry.status.toUpperCase(), {
      x: margin + 175,
      y: tocY - 10,
      size: 7,
      font: fontBold,
      color: statusColor,
    });

    // Evidence filenames
    const evidenceNames =
      entry.evidenceFiles.length > 0
        ? entry.evidenceFiles.map((f) => f.name).join(", ")
        : "[No evidence linked]";
    tocPage.drawText(truncateString(evidenceNames, 40), {
      x: margin + 250,
      y: tocY - 10,
      size: 7,
      font: fontRegular,
      color: entry.evidenceFiles.length > 0 ? rgb(0.2, 0.25, 0.35) : rgb(0.6, 0.3, 0.3),
    });

    // Page number
    tocPage.drawText(entry.pdfPageDisplay, {
      x: pageWidth - margin - 40,
      y: tocY - 10,
      size: 7.5,
      font: fontBold,
      color: rgb(0.2, 0.3, 0.5),
    });

    tocY -= 20;
  }

  // ==========================================
  // 4. RUNNING HEADERS & FOOTERS ACROSS ALL PAGES
  // ==========================================
  const totalPages = createdPages.length;

  for (const item of createdPages) {
    // Skip header/footer on cover page if enabled
    if (project.coverPage.enabled && item.pageNumber === 1) continue;

    const page = item.page;

    // Running Header
    page.drawText(
      truncateString(project.title || "Academic Assignment & Practical Submission", 50),
      {
        x: margin,
        y: pageHeight - margin + 14,
        size: 8,
        font: fontRegular,
        color: rgb(0.45, 0.5, 0.6),
      }
    );

    if (item.headerTitle && item.headerTitle !== "Cover") {
      const headerTitleWidth = fontBold.widthOfTextAtSize(item.headerTitle, 8);
      page.drawText(item.headerTitle, {
        x: pageWidth - margin - headerTitleWidth,
        y: pageHeight - margin + 14,
        size: 8,
        font: fontBold,
        color: rgb(0.35, 0.4, 0.5),
      });
    }

    page.drawLine({
      start: { x: margin, y: pageHeight - margin + 6 },
      end: { x: pageWidth - margin, y: pageHeight - margin + 6 },
      thickness: 0.5,
      color: rgb(0.85, 0.88, 0.92),
    });

    // Running Footer
    page.drawLine({
      start: { x: margin, y: margin - 6 },
      end: { x: pageWidth - margin, y: margin - 6 },
      thickness: 0.5,
      color: rgb(0.85, 0.88, 0.92),
    });

    page.drawText("Verified Academic Submission Dossier", {
      x: margin,
      y: margin - 18,
      size: 7.5,
      font: fontRegular,
      color: rgb(0.5, 0.55, 0.65),
    });

    const pageStr = `Page ${item.pageNumber} of ${totalPages}`;
    const pageStrWidth = fontBold.widthOfTextAtSize(pageStr, 7.5);
    page.drawText(pageStr, {
      x: pageWidth - margin - pageStrWidth,
      y: margin - 18,
      size: 7.5,
      font: fontBold,
      color: rgb(0.3, 0.35, 0.45),
    });
  }

  const pdfBytes = await pdfDoc.save();
  return { pdfBytes, traceability: traceabilityList, totalPages };
}

/**
 * Embeds base64 image data URL safely into PDFDocument
 */
async function embedBase64Image(pdfDoc: PDFDocument, dataUrl: string) {
  try {
    const commaIdx = dataUrl.indexOf(",");
    const base64 = commaIdx >= 0 ? dataUrl.slice(commaIdx + 1) : dataUrl;
    const binary = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

    if (dataUrl.startsWith("data:image/png") || isPngBinary(binary)) {
      return await pdfDoc.embedPng(binary);
    } else {
      return await pdfDoc.embedJpg(binary);
    }
  } catch (err) {
    console.warn("Failed to embed image in PDF:", err);
    return null;
  }
}

function isPngBinary(bytes: Uint8Array): boolean {
  return bytes.length > 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
}

function wrapText(text: string, fontSize: number, font: any, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const width = font.widthOfTextAtSize(testLine, fontSize);
    if (width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

function truncateString(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 1) + "…";
}

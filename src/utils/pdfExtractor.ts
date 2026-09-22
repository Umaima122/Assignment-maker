import * as pdfjsLib from "pdfjs-dist";
import { EvidenceItem } from "../types";
import { isDocxFile, isLegacyDocFile, extractEvidenceFromDocx } from "./docxExtractor";

// Configure pdfjs worker
try {
  // Use official CDN worker matching version or fallback
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || "4.10.38"}/pdf.worker.min.mjs`;
} catch (e) {
  console.warn("Could not set pdf worker url", e);
}

export async function extractEvidenceFromFile(
  file: File,
  startIdIndex: number = 0
): Promise<EvidenceItem[]> {
  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

  if (isPdf) {
    return extractPagesFromPdf(file, startIdIndex);
  } else if (isDocxFile(file)) {
    return extractEvidenceFromDocx(file, startIdIndex);
  } else if (isLegacyDocFile(file)) {
    throw new Error(
      `Legacy Word (.doc) format detected for ${file.name}. Please open the file in Microsoft Word or Google Docs and save it as .docx or .pdf to extract screenshots.`
    );
  } else if (file.type.startsWith("image/")) {
    return [await extractSingleImage(file, startIdIndex)];
  } else {
    throw new Error(
      `Unsupported file type: ${file.type || file.name}. Please upload PDF, Word (.docx), or image files.`
    );
  }
}

async function extractPagesFromPdf(file: File, startIdIndex: number): Promise<EvidenceItem[]> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
  const pdfDoc = await loadingTask.promise;
  const totalPages = pdfDoc.numPages;
  const items: EvidenceItem[] = [];

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    // Render at 2x scale for sharp, unblurred academic code screenshots
    const viewport = page.getViewport({ scale: 2.0 });

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) continue;

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    // Fill white background before rendering
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);

    const renderContext = {
      canvasContext: context,
      viewport: viewport,
    };

    // @ts-ignore
    await page.render(renderContext).promise;

    const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
    const itemNumber = startIdIndex + pageNum;

    items.push({
      id: `ev-${Date.now()}-${itemNumber}`,
      name: `${file.name} (Page ${pageNum})`,
      type: "pdf-page",
      data: dataUrl,
      fileId: `${file.name}-${file.lastModified}`,
      fileName: file.name,
      pageNumber: pageNum,
      totalPages: totalPages,
      width: viewport.width,
      height: viewport.height,
      isOriginalEvidence: true,
      addedAt: Date.now(),
    });
  }

  return items;
}

async function extractSingleImage(file: File, index: number): Promise<EvidenceItem> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const img = new Image();
      img.onload = () => {
        resolve({
          id: `ev-${Date.now()}-${index + 1}`,
          name: file.name,
          type: "image",
          data: dataUrl,
          fileId: `${file.name}-${file.lastModified}`,
          fileName: file.name,
          pageNumber: 1,
          totalPages: 1,
          width: img.naturalWidth,
          height: img.naturalHeight,
          isOriginalEvidence: true,
          addedAt: Date.now(),
        });
      };
      img.onerror = () => {
        // Fallback if image dimensions can't be read
        resolve({
          id: `ev-${Date.now()}-${index + 1}`,
          name: file.name,
          type: "image",
          data: dataUrl,
          fileId: `${file.name}-${file.lastModified}`,
          fileName: file.name,
          isOriginalEvidence: true,
          addedAt: Date.now(),
        });
      };
      img.src = dataUrl;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

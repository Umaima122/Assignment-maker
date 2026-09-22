import JSZip from "jszip";
import { EvidenceItem } from "../types";

/**
 * Checks if a file is a Word (.docx) document
 */
export function isDocxFile(file: File): boolean {
  const fileName = file.name.toLowerCase();
  return (
    fileName.endsWith(".docx") ||
    file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    file.type === "application/docx"
  );
}

/**
 * Checks if a file is a legacy Word (.doc) document
 */
export function isLegacyDocFile(file: File): boolean {
  const fileName = file.name.toLowerCase();
  return fileName.endsWith(".doc") || file.type === "application/msword";
}

/**
 * Extracts embedded screenshot images or rendered document pages from a Word (.docx) file.
 */
export async function extractEvidenceFromDocx(
  file: File,
  startIdIndex: number = 0
): Promise<EvidenceItem[]> {
  const arrayBuffer = await file.arrayBuffer();
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(arrayBuffer);
  } catch (err: any) {
    throw new Error(
      `Could not read ${file.name} as a valid Word (.docx) document. Please ensure it is a valid .docx file, or export it as PDF.`
    );
  }

  // 1. Check for embedded images in word/media/
  const mediaFiles: { path: string; name: string; zipEntry: JSZip.JSZipObject }[] = [];
  zip.forEach((relativePath, zipEntry) => {
    if (
      relativePath.startsWith("word/media/") &&
      !zipEntry.dir &&
      isSupportedImageExtension(relativePath)
    ) {
      const fileName = relativePath.split("/").pop() || relativePath;
      mediaFiles.push({ path: relativePath, name: fileName, zipEntry });
    }
  });

  // If embedded images exist, sort them according to document order
  if (mediaFiles.length > 0) {
    const orderedMedia = await orderMediaByDocumentXml(zip, mediaFiles);
    const items: EvidenceItem[] = [];

    for (let i = 0; i < orderedMedia.length; i++) {
      const media = orderedMedia[i];
      const ext = media.name.split(".").pop()?.toLowerCase() || "png";
      const mimeType = getImageMimeType(ext);

      const base64 = await media.zipEntry.async("base64");
      const dataUrl = `data:${mimeType};base64,${base64}`;

      const { width, height } = await measureImageDimensions(dataUrl);

      const itemNumber = startIdIndex + i + 1;
      items.push({
        id: `ev-docx-${Date.now()}-${itemNumber}`,
        name: `${file.name} (Screenshot ${i + 1})`,
        type: "image",
        data: dataUrl,
        fileId: `${file.name}-${file.lastModified}`,
        fileName: file.name,
        pageNumber: i + 1,
        totalPages: orderedMedia.length,
        width,
        height,
        isOriginalEvidence: true,
        addedAt: Date.now(),
      });
    }

    return items;
  }

  // 2. If NO embedded images in word/media/, extract document text and render onto clean pages
  const text = await extractRawTextFromDocxZip(zip);
  if (text.trim().length > 0) {
    return renderTextToEvidencePages(file, text, startIdIndex);
  }

  throw new Error(
    `No screenshots, images, or readable content found in ${file.name}. Please ensure the Word document contains your practical screenshots or text.`
  );
}

/**
 * Extracts plain text and embedded images from a .docx file for the Questionnaire step.
 */
export async function extractTextAndImagesFromDocx(file: File): Promise<{
  text: string;
  images: string[];
}> {
  const arrayBuffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);

  const text = await extractRawTextFromDocxZip(zip);

  const mediaFiles: { path: string; name: string; zipEntry: JSZip.JSZipObject }[] = [];
  zip.forEach((relativePath, zipEntry) => {
    if (
      relativePath.startsWith("word/media/") &&
      !zipEntry.dir &&
      isSupportedImageExtension(relativePath)
    ) {
      const fileName = relativePath.split("/").pop() || relativePath;
      mediaFiles.push({ path: relativePath, name: fileName, zipEntry });
    }
  });

  const orderedMedia = await orderMediaByDocumentXml(zip, mediaFiles);
  const images: string[] = [];

  // Grab first 6 images as questionnaire previews
  for (let i = 0; i < Math.min(orderedMedia.length, 6); i++) {
    const media = orderedMedia[i];
    const ext = media.name.split(".").pop()?.toLowerCase() || "png";
    const mimeType = getImageMimeType(ext);
    const base64 = await media.zipEntry.async("base64");
    images.push(`data:${mimeType};base64,${base64}`);
  }

  return { text, images };
}

/**
 * Extracts raw text from word/document.xml with paragraph preservation
 */
async function extractRawTextFromDocxZip(zip: JSZip): Promise<string> {
  const docXmlEntry = zip.file("word/document.xml");
  if (!docXmlEntry) return "";

  const docXmlString = await docXmlEntry.async("string");
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(docXmlString, "text/xml");

  const paragraphs = xmlDoc.getElementsByTagName("w:p");
  const lines: string[] = [];

  for (let i = 0; i < paragraphs.length; i++) {
    const p = paragraphs[i];
    const textNodes = p.getElementsByTagName("w:t");
    let line = "";
    for (let j = 0; j < textNodes.length; j++) {
      line += textNodes[j].textContent || "";
    }
    // Also check for tabs
    const tabs = p.getElementsByTagName("w:tab");
    if (tabs.length > 0 && line.trim().length > 0) {
      line = "  " + line;
    }
    if (line.trim().length > 0) {
      lines.push(line);
    }
  }

  return lines.join("\n\n");
}

/**
 * Orders media files by their occurrence in word/document.xml
 */
async function orderMediaByDocumentXml(
  zip: JSZip,
  mediaFiles: { path: string; name: string; zipEntry: JSZip.JSZipObject }[]
): Promise<{ path: string; name: string; zipEntry: JSZip.JSZipObject }[]> {
  try {
    const relsEntry = zip.file("word/_rels/document.xml.rels");
    const docXmlEntry = zip.file("word/document.xml");

    if (!relsEntry || !docXmlEntry) {
      return naturalSortMedia(mediaFiles);
    }

    const relsString = await relsEntry.async("string");
    const docXmlString = await docXmlEntry.async("string");

    const parser = new DOMParser();
    const relsDoc = parser.parseFromString(relsString, "text/xml");

    // Map rId -> media filename (e.g. "rId4" -> "image1.png")
    const rIdToTarget = new Map<string, string>();
    const relElements = relsDoc.getElementsByTagName("Relationship");
    for (let i = 0; i < relElements.length; i++) {
      const rel = relElements[i];
      const id = rel.getAttribute("Id");
      const target = rel.getAttribute("Target");
      if (id && target) {
        const cleanTarget = target.split("/").pop() || target;
        rIdToTarget.set(id, cleanTarget);
      }
    }

    // Find occurrences of rIds in word/document.xml
    const idOrder: string[] = [];
    const idMatches = docXmlString.matchAll(/(?:embed|id)=["'](rId\d+)["']/gi);
    for (const match of idMatches) {
      const rId = match[1];
      const targetName = rIdToTarget.get(rId);
      if (targetName && !idOrder.includes(targetName)) {
        idOrder.push(targetName);
      }
    }

    if (idOrder.length === 0) {
      return naturalSortMedia(mediaFiles);
    }

    // Sort mediaFiles according to idOrder
    const sorted: typeof mediaFiles = [];
    for (const target of idOrder) {
      const found = mediaFiles.find((m) => m.name.toLowerCase() === target.toLowerCase());
      if (found && !sorted.includes(found)) {
        sorted.push(found);
      }
    }

    // Append any media files not referenced in document.xml
    for (const m of mediaFiles) {
      if (!sorted.includes(m)) {
        sorted.push(m);
      }
    }

    return sorted;
  } catch (e) {
    console.warn("Could not order media by XML rels, falling back to natural sort:", e);
    return naturalSortMedia(mediaFiles);
  }
}

function naturalSortMedia(
  files: { path: string; name: string; zipEntry: JSZip.JSZipObject }[]
) {
  return [...files].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" })
  );
}

function isSupportedImageExtension(filePath: string): boolean {
  const ext = filePath.split(".").pop()?.toLowerCase();
  return ["png", "jpg", "jpeg", "webp", "gif", "svg", "bmp"].includes(ext || "");
}

function getImageMimeType(ext: string): string {
  switch (ext) {
    case "png":
      return "image/png";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "webp":
      return "image/webp";
    case "gif":
      return "image/gif";
    case "svg":
      return "image/svg+xml";
    case "bmp":
      return "image/bmp";
    default:
      return "image/jpeg";
  }
}

async function measureImageDimensions(
  dataUrl: string
): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth || 1200, height: img.naturalHeight || 800 });
    img.onerror = () => resolve({ width: 1200, height: 800 });
    img.src = dataUrl;
  });
}

/**
 * Renders raw text from a text-only .docx into clear, high-resolution A4 canvas pages.
 */
function renderTextToEvidencePages(
  file: File,
  text: string,
  startIdIndex: number
): EvidenceItem[] {
  const lines = text.split("\n");
  const PAGE_WIDTH = 1240; // High resolution A4
  const PAGE_HEIGHT = 1754;
  const MARGIN = 90;
  const LINE_HEIGHT = 28;
  const FONT_SIZE = 16;
  const USABLE_WIDTH = PAGE_WIDTH - MARGIN * 2;
  const USABLE_HEIGHT = PAGE_HEIGHT - MARGIN * 2 - 60; // Leave room for header/footer
  const LINES_PER_PAGE = Math.floor(USABLE_HEIGHT / LINE_HEIGHT);

  // Wrap all lines
  const dummyCanvas = document.createElement("canvas");
  const dummyCtx = dummyCanvas.getContext("2d");
  if (!dummyCtx) return [];
  dummyCtx.font = `${FONT_SIZE}px "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace`;

  const wrappedLines: string[] = [];
  for (const rawLine of lines) {
    if (!rawLine.trim()) {
      wrappedLines.push("");
      continue;
    }
    const words = rawLine.split(" ");
    let current = "";
    for (const word of words) {
      const test = current ? `${current} ${word}` : word;
      if (dummyCtx.measureText(test).width > USABLE_WIDTH) {
        wrappedLines.push(current);
        current = word;
      } else {
        current = test;
      }
    }
    if (current) wrappedLines.push(current);
  }

  const totalPages = Math.max(1, Math.ceil(wrappedLines.length / LINES_PER_PAGE));
  const items: EvidenceItem[] = [];

  for (let page = 0; page < totalPages; page++) {
    const canvas = document.createElement("canvas");
    canvas.width = PAGE_WIDTH;
    canvas.height = PAGE_HEIGHT;
    const ctx = canvas.getContext("2d");
    if (!ctx) continue;

    // Background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT);

    // Running Header
    ctx.fillStyle = "#64748b";
    ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(file.name.toUpperCase(), MARGIN, MARGIN - 25);
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(MARGIN, MARGIN - 15);
    ctx.lineTo(PAGE_WIDTH - MARGIN, MARGIN - 15);
    ctx.stroke();

    // Content
    ctx.fillStyle = "#0f172a";
    ctx.font = `${FONT_SIZE}px "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace`;

    const pageLines = wrappedLines.slice(page * LINES_PER_PAGE, (page + 1) * LINES_PER_PAGE);
    let y = MARGIN + 25;
    for (const line of pageLines) {
      ctx.fillText(line, MARGIN, y);
      y += LINE_HEIGHT;
    }

    // Running Footer
    ctx.strokeStyle = "#e2e8f0";
    ctx.beginPath();
    ctx.moveTo(MARGIN, PAGE_HEIGHT - MARGIN + 10);
    ctx.lineTo(PAGE_WIDTH - MARGIN, PAGE_HEIGHT - MARGIN + 10);
    ctx.stroke();

    ctx.fillStyle = "#64748b";
    ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(`Page ${page + 1} of ${totalPages}`, MARGIN, PAGE_HEIGHT - MARGIN + 30);
    ctx.textAlign = "right";
    ctx.fillText("Academic Lab Work File", PAGE_WIDTH - MARGIN, PAGE_HEIGHT - MARGIN + 30);
    ctx.textAlign = "left";

    const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
    const itemNumber = startIdIndex + page + 1;
    items.push({
      id: `ev-docx-page-${Date.now()}-${itemNumber}`,
      name: `${file.name} (Page ${page + 1})`,
      type: "pdf-page",
      data: dataUrl,
      fileId: `${file.name}-${file.lastModified}`,
      fileName: file.name,
      pageNumber: page + 1,
      totalPages: totalPages,
      width: PAGE_WIDTH,
      height: PAGE_HEIGHT,
      isOriginalEvidence: true,
      addedAt: Date.now(),
    });
  }

  return items;
}

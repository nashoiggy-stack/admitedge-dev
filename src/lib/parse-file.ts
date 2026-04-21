import { PDFParse } from "pdf-parse";
import * as mammoth from "mammoth";

export type ParseResult =
  | { ok: true; text: string }
  | { ok: false; error: string };

export async function parseUploadedFile(file: File): Promise<ParseResult> {
  const name = file.name.toLowerCase();
  const isPdf = name.endsWith(".pdf");
  const isDoc = name.endsWith(".doc") || name.endsWith(".docx");

  if (!isPdf && !isDoc) {
    return {
      ok: false,
      error:
        "Unsupported file type. Please upload a PDF (.pdf) or Word document (.doc / .docx).",
    };
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  if (buffer.length === 0) {
    return {
      ok: false,
      error: "The file appears to be empty. Please upload a file with content.",
    };
  }

  try {
    let text = "";

    if (isPdf) {
      const parser = new PDFParse({ data: buffer });
      const result = await parser.getText();
      text = result.text;
    } else {
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;
    }

    text = text.trim();

    if (!text) {
      return {
        ok: false,
        error:
          "We couldn't extract any text from this file. Make sure the file contains readable text (not just images or scans).",
      };
    }

    return { ok: true, text };
  } catch {
    return {
      ok: false,
      error:
        "Something went wrong reading that file. Please make sure it's a valid PDF or Word document and try again.",
    };
  }
}

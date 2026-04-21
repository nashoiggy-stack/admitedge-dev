"use client";

import React, { useState, useRef } from "react";
import { Upload, FileText, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

interface TranscriptUploadProps {
  /** Called after localStorage has been updated so the iframe can reload */
  readonly onSuccess?: () => void;
}

type Status = "idle" | "uploading" | "success" | "error";

export const TranscriptUpload: React.FC<TranscriptUploadProps> = ({ onSuccess }) => {
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string>("");
  const [fileNames, setFileNames] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (files: File[]) => {
    if (files.length === 0) return;
    setFileNames(files.map((f) => f.name));
    setStatus("uploading");
    setMessage(
      files.length === 1
        ? "Reading your transcript..."
        : `Reading ${files.length} transcripts and merging...`
    );

    try {
      const formData = new FormData();
      for (const file of files) {
        formData.append("files", file);
      }

      const res = await fetch("/api/parse-transcript", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setStatus("error");
        setMessage(data.error || "Failed to parse transcript.");
        return;
      }

      if (!data.years || data.years.length === 0) {
        setStatus("error");
        setMessage("No grades found in the document(s).");
        return;
      }

      // Write directly to localStorage — same origin, iframe picks it up on reload
      localStorage.setItem("gpa-calc-v1", JSON.stringify(data));

      const totalClasses = data.years.reduce(
        (sum: number, y: { rows: unknown[] }) => sum + y.rows.length,
        0
      );
      setStatus("success");
      setMessage(`Extracted ${totalClasses} classes across ${data.years.length} year${data.years.length > 1 ? "s" : ""}. Reloading calculator...`);

      window.dispatchEvent(new CustomEvent("profile-source-updated", { detail: { key: "gpa-calc-v1" } }));

      setTimeout(() => {
        onSuccess?.();
      }, 800);
    } catch {
      setStatus("error");
      setMessage("Network error. Please try again.");
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length > 0) handleUpload(files);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files ?? []);
    if (files.length > 0) handleUpload(files);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const statusIcon = {
    idle: <Upload className="w-5 h-5" />,
    uploading: <Loader2 className="w-5 h-5 animate-spin" />,
    success: <CheckCircle2 className="w-5 h-5 text-emerald-400" />,
    error: <AlertCircle className="w-5 h-5 text-red-400" />,
  }[status];

  const statusBorder = {
    idle: "border-white/10 hover:border-blue-400/40",
    uploading: "border-blue-400/40",
    success: "border-emerald-400/40",
    error: "border-red-400/40",
  }[status];

  return (
    <div className="mx-auto max-w-2xl px-4 mb-8">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={() => status !== "uploading" && inputRef.current?.click()}
        className={`cursor-pointer rounded-2xl bg-white/[0.03] border ${statusBorder} p-6 transition-colors duration-200 backdrop-blur-sm`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,image/*"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          disabled={status === "uploading"}
        />
        <div className="flex items-center gap-4">
          <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-white/70">
            {statusIcon}
          </div>
          <div className="flex-1 min-w-0">
            {status === "idle" && (
              <>
                <p className="text-sm font-semibold text-white mb-0.5">Upload your transcript(s)</p>
                <p className="text-xs text-zinc-500">
                  PDF or image — upload one or more files and we'll merge them automatically
                </p>
              </>
            )}
            {status === "uploading" && (
              <>
                <p className="text-sm font-semibold text-blue-300 mb-0.5 truncate">
                  {fileNames.length === 1 ? fileNames[0] : `${fileNames.length} files: ${fileNames.join(", ")}`}
                </p>
                <p className="text-xs text-zinc-400">{message}</p>
              </>
            )}
            {status === "success" && (
              <>
                <p className="text-sm font-semibold text-emerald-300 mb-0.5">Transcript read successfully</p>
                <p className="text-xs text-zinc-400">{message}</p>
              </>
            )}
            {status === "error" && (
              <>
                <p className="text-sm font-semibold text-red-300 mb-0.5">Couldn't read transcript</p>
                <p className="text-xs text-zinc-400">{message}</p>
              </>
            )}
          </div>
          {status === "idle" && (
            <FileText className="flex-shrink-0 w-5 h-5 text-zinc-600" strokeWidth={1.5} />
          )}
        </div>
      </div>
      <p className="mt-2 text-[11px] text-zinc-600 text-center">
        Experimental — review the extracted grades and edit if needed.
      </p>
    </div>
  );
};

"use client";

import { useState, useRef, useCallback } from "react";

interface UseEssayInputReturn {
  readonly essayText: string;
  readonly file: File | null;
  readonly dragging: boolean;
  readonly wordCount: number;
  readonly fileInputRef: React.RefObject<HTMLInputElement | null>;
  readonly setEssayText: (value: string) => void;
  readonly setFile: (file: File | null) => void;
  readonly handleDrop: (e: React.DragEvent) => void;
  readonly handleDragOver: (e: React.DragEvent) => void;
  readonly handleDragLeave: () => void;
  readonly handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  readonly openFilePicker: () => void;
  readonly clear: () => void;
}

export function useEssayInput(): UseEssayInputReturn {
  const [essayText, setEssayTextRaw] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const wordCount = essayText.trim()
    ? essayText.trim().split(/\s+/).length
    : 0;

  const setEssayText = (value: string) => {
    setEssayTextRaw(value);
    setFile(null);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) {
      setFile(dropped);
      setEssayTextRaw("");
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => setDragging(false), []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setEssayTextRaw("");
    }
  };

  const openFilePicker = () => fileInputRef.current?.click();

  const clear = () => {
    setEssayTextRaw("");
    setFile(null);
  };

  return {
    essayText, file, dragging, wordCount, fileInputRef,
    setEssayText, setFile, handleDrop, handleDragOver,
    handleDragLeave, handleFileChange, openFilePicker, clear,
  };
}

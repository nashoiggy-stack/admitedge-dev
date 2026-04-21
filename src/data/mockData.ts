// Static text, labels, and configuration data decoupled from components

export const APP_CONFIG = {
  title: "Essay Grader",
  subtitle:
    "AI-powered scoring with Common App + VSPICE rubrics. Built for high school juniors aiming for top colleges.",
  idealWordRange: { min: 480, max: 650 },
  gradeEndpoint: "/api/grade",
  chatEndpoint: "/api/chat",
} as const;

export const TABS = [
  { id: "common" as const, label: "Common App (7)" },
  { id: "vspice" as const, label: "VSPICE (6)" },
  { id: "feedback" as const, label: "Feedback" },
  { id: "lines" as const, label: "Line Notes" },
  { id: "chat" as const, label: "Coach" },
] as const;

export const CHAT_SUGGESTIONS = [
  "What's my weakest area?",
  "How do I improve Insight?",
  "Rewrite my opening",
] as const;

export const UPLOAD_ACCEPT = ".pdf,.doc,.docx";

export const LOADING_TEXT =
  "Reading your essay like an Ivy League admissions officer...";

export const SCORE_THRESHOLDS = {
  high: 0.8,
  mid: 0.6,
  low: 0.4,
} as const;

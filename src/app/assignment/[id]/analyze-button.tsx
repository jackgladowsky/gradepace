"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";

interface AnalyzeButtonProps {
  assignmentId: number;
  courseId: number;
  courseName: string;
  assignmentName: string;
  dueAt: string | null;
  pointsPossible: number | null;
  description: string | null;
  rubric?: { description: string; points: number; long_description?: string }[];
}

export default function AnalyzeButton(props: AnalyzeButtonProps) {
  const cacheKey = `studyhub_analysis_${props.assignmentId}`;

  const [analysis, setAnalysis] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(cacheKey) || "";
    }
    return "";
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyze = useCallback(async () => {
    setLoading(true);
    setError(null);
    setAnalysis("");

    try {
      const res = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseName: props.courseName,
          name: props.assignmentName,
          dueAt: props.dueAt,
          pointsPossible: props.pointsPossible,
          description: props.description,
          rubric: props.rubric,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Failed: ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response stream");

      const decoder = new TextDecoder();
      let full = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        full += chunk;
        setAnalysis(full);
      }

      localStorage.setItem(cacheKey, full);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  }, [props, cacheKey]);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">AI Breakdown</h2>
        <Button
          size="sm"
          variant={analysis ? "ghost" : "default"}
          onClick={analyze}
          disabled={loading}
          className="h-7 rounded-lg text-xs"
        >
          {loading ? (
            <span className="flex items-center gap-1.5">
              <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Analyzing...
            </span>
          ) : analysis ? "Re-analyze" : "Analyze"}
        </Button>
      </div>

      {error && (
        <div className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {analysis && (
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
            {analysis}
          </div>
        </div>
      )}

      {!analysis && !error && !loading && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-8 text-center">
          <svg className="mb-2 h-5 w-5 text-muted-foreground/50" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
          </svg>
          <p className="text-xs text-muted-foreground">
            Get an AI breakdown of what this assignment is asking
          </p>
        </div>
      )}
    </div>
  );
}

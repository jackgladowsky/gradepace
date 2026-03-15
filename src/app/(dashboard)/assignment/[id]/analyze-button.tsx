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
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">AI Breakdown</h2>
        <Button
          size="sm"
          variant={analysis ? "ghost" : "default"}
          onClick={analyze}
          disabled={loading}
          className="text-xs"
        >
          {loading ? "Analyzing..." : analysis ? "Re-analyze" : "Analyze"}
        </Button>
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {analysis && (
        <div className="rounded-lg border p-5">
          <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
            {analysis}
          </div>
        </div>
      )}

      {!analysis && !error && !loading && (
        <div className="rounded-lg border border-dashed py-8 text-center">
          <p className="text-xs text-muted-foreground">
            Get an AI breakdown of what this assignment is asking
          </p>
        </div>
      )}
    </div>
  );
}

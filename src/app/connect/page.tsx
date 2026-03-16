"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { connect } from "./actions";

const SCHOOLS = [
  { name: "Northeastern", url: "https://northeastern.instructure.com" },
];

export default function ConnectPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [canvasUrl, setCanvasUrl] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = await connect(formData);

    if (result?.error) {
      setError(result.error);
      setLoading(false);
    } else {
      router.push("/");
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mb-3 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <svg className="h-4 w-4 text-primary-foreground" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a23.54 23.54 0 0 0-2.688 6.413A23.654 23.654 0 0 0 12 23.25a23.654 23.654 0 0 0 8.429-3.69 23.54 23.54 0 0 0-2.688-6.413m-15.482 0A47.71 47.71 0 0 1 12 7.443a47.71 47.71 0 0 1 7.741 2.704M12 2.25c-2.676 0-5.216.584-7.499 1.632m14.998 0A17.919 17.919 0 0 0 12 2.25" />
            </svg>
          </div>
          <h1 className="text-lg font-semibold tracking-tight">GradePace</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Connect your Canvas account to get started
          </p>
        </div>

        <div className="rounded-lg border border-border/60 bg-card p-5">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="canvasUrl" className="text-xs font-medium">
                Canvas URL
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {SCHOOLS.map((school) => (
                  <button
                    key={school.url}
                    type="button"
                    onClick={() => setCanvasUrl(school.url)}
                    className={`rounded px-2.5 py-1 text-[11px] font-medium transition-colors ${
                      canvasUrl === school.url
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {school.name}
                  </button>
                ))}
              </div>
              <Input
                id="canvasUrl"
                name="canvasUrl"
                type="url"
                placeholder="https://your-school.instructure.com"
                value={canvasUrl}
                onChange={(e) => setCanvasUrl(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="canvasToken" className="text-xs font-medium">
                API Token
              </Label>
              <Input
                id="canvasToken"
                name="canvasToken"
                type="password"
                placeholder="Paste your token here"
                required
              />
              <details className="group mt-0.5">
                <summary className="cursor-pointer text-[11px] text-muted-foreground hover:text-foreground transition-colors">
                  How do I get a token?
                </summary>
                <ol className="mt-2 space-y-1.5 text-[11px] text-muted-foreground list-decimal list-inside">
                  <li>Log in to Canvas and click <strong className="text-foreground">Account</strong> (top-left)</li>
                  <li>Go to <strong className="text-foreground">Settings</strong></li>
                  <li>Scroll to <strong className="text-foreground">Approved Integrations</strong></li>
                  <li>Click <strong className="text-foreground">+ New Access Token</strong></li>
                  <li>Name it anything (e.g. &ldquo;GradePace&rdquo;) and click <strong className="text-foreground">Generate Token</strong></li>
                  <li>Copy the token and paste it above</li>
                </ol>
              </details>
            </div>
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <Button type="submit" disabled={loading}>
              {loading ? "Connecting..." : "Connect"}
            </Button>
          </form>
        </div>

        {/* Trust signals */}
        <div className="mt-4 rounded-lg border border-border/40 bg-card/50 px-4 py-3">
          <div className="flex items-start gap-2.5">
            <svg className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
            </svg>
            <div>
              <p className="text-[11px] font-medium text-foreground/80">Your token stays on your device</p>
              <p className="mt-0.5 text-[10px] leading-relaxed text-muted-foreground">
                Your API token is stored in an encrypted, HTTP-only session cookie. It&apos;s never saved to a database or shared with anyone. GradePace is{" "}
                <Link href="https://github.com/jackgladowsky/gradepace" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                  open source
                </Link>
                {" "}&mdash; you can verify this yourself.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

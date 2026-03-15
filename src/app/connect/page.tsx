"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { connect } from "./actions";

export default function ConnectPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
          <Link href="/" className="text-sm font-semibold tracking-tight">
            GradePace
          </Link>
          <p className="mt-2 text-sm text-muted-foreground">
            Connect your Canvas account
          </p>
        </div>

        <div className="rounded-lg border p-5">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="canvasUrl" className="text-xs font-medium">
                Canvas URL
              </Label>
              <Input
                id="canvasUrl"
                name="canvasUrl"
                type="url"
                placeholder="https://your-school.instructure.com"
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
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";

type DiagnosisResponse = {
  diagnosis: string;
  model: string;
  provider: string;
};

export default function Home() {
  const [issue, setIssue] = useState("");
  const [result, setResult] = useState<DiagnosisResponse | null>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleDiagnose = async () => {
    if (!issue.trim()) {
      setError("Please describe a bug first.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);
    try {
      const response = await fetch("http://localhost:8000/diagnose", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          issue_description: issue,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get diagnosis");
      }
      const data: DiagnosisResponse = await response.json();
      setResult(data);
    } catch (error) {
      setError("Could not reach FixProof. Check that the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto min-h-screen max-w-3xl p-8">
      <h1 className="text-4xl font-bold">FixProof</h1>
      <p className="mt-3 text-gray-600">
        Investigate bugs with AI-powered debugging.
      </p>
      <label htmlFor="issue" className="mt-8 block font-semibold">
        Describe your bug
      </label>
      <textarea
        id="issue"
        value={issue}
        onChange={(event) => setIssue(event.target.value)}
        placeholder="Describe what went wrong..."
        className="mt-3 min-h-36 w-full rounded-lg border p-4"
      />{" "}
      <button
        onClick={handleDiagnose}
        disabled={loading}
        className="mt-4 rounded-lg bg-black px-5 py-3 text-white disabled:opacity-50"
      >
        {loading ? "Investigating..." : "Diagnose bug"}
      </button>
      {error && <p className="mt-4 text-red-600">{error}</p>}
      {result && (
        <section className="mt-8 rounded-xl border p-5">
          <h2 className="text-xl font-semibold">Preliminary diagnosis</h2>

          <p className="mt-4 whitespace-pre-wrap">{result.diagnosis}</p>

          <p className="mt-5 text-sm text-gray-500">Model: {result.model}</p>

          <p className="text-sm text-gray-500">Provider: {result.provider}</p>

          <p className="mt-3 text-sm text-amber-700">
            This is an initial hypothesis. Source code inspection and test
            verification are not implemented yet.
          </p>
        </section>
      )}
    </main>
  );
}

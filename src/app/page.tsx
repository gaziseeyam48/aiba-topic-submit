"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  Info,
  ArrowRight,
} from "lucide-react";

type SubmitStatus = "idle" | "loading" | "success" | "conflict" | "duplicate" | "error";

interface AlertInfo {
  status: SubmitStatus;
  message: string;
  conflictReason?: string;
}

export default function HomePage() {
  const [studentId, setStudentId] = useState("");
  const [topicTitle, setTopicTitle] = useState("");
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>("idle");
  const [alertInfo, setAlertInfo] = useState<AlertInfo | null>(null);
  const topicInputRef = useRef<HTMLTextAreaElement>(null);

  const isLoading = submitStatus === "loading";
  const isLocked = submitStatus === "success" || submitStatus === "duplicate";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isLoading || isLocked) return;

    setSubmitStatus("loading");
    setAlertInfo(null);

    try {
      const res = await fetch("/api/submit-topic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: studentId.trim(),
          topicTitle: topicTitle.trim(),
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setSubmitStatus("success");
        setAlertInfo({ status: "success", message: data.message });
      } else if (res.status === 409) {
        if (data.error === "duplicate_student") {
          setSubmitStatus("duplicate");
          setAlertInfo({ status: "duplicate", message: data.message });
        } else if (data.error === "topic_conflict") {
          setSubmitStatus("conflict");
          setAlertInfo({
            status: "conflict",
            message: data.message,
            conflictReason: data.conflictReason,
          });
        }
      } else {
        setSubmitStatus("error");
        setAlertInfo({
          status: "error",
          message: data.error || "Something went wrong. Please try again.",
        });
      }
    } catch {
      setSubmitStatus("error");
      setAlertInfo({
        status: "error",
        message: "Unable to connect. Please check your internet connection.",
      });
    }
  }

  function handleTryAnother() {
    setSubmitStatus("idle");
    setAlertInfo(null);
    setTimeout(() => {
      topicInputRef.current?.focus();
    }, 50);
  }

  const canSubmit = studentId.trim().length > 0 && topicTitle.trim().length >= 5;

  return (
    <div className="min-h-screen bg-[#0c0e14] text-zinc-100 flex flex-col justify-between p-4 sm:p-8">
      {/* Top bar */}
      <header className="w-full max-w-lg mx-auto pt-4 pb-8 flex items-center justify-between border-b border-zinc-800/60">
        <div>
          <span className="text-xs font-medium tracking-wide uppercase text-zinc-400">
            Organization Behaviour
          </span>
          <h1 className="text-base font-medium text-zinc-100">
            Term Paper Topic Submission
          </h1>
        </div>
        <span className="text-xs text-zinc-400 bg-zinc-900 border border-zinc-800 px-2.5 py-1 rounded-full">
          One per student
        </span>
      </header>

      {/* Main Form Area */}
      <main className="w-full max-w-lg mx-auto py-8 flex-1 flex flex-col justify-center">
        {/* Intro */}
        <div className="mb-6">
          <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-zinc-100">
            Submit your topic
          </h2>
          <p className="text-sm text-zinc-400 mt-1">
            Provide your student ID and proposed topic. Each topic must be unique.
          </p>
        </div>

        {/* Feedback Alert */}
        <AnimatePresence mode="wait">
          {alertInfo && (
            <motion.div
              key={alertInfo.status}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="mb-6"
            >
              {alertInfo.status === "success" && (
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-emerald-300">
                        Topic Registered
                      </p>
                      <p className="text-xs text-emerald-300/80 mt-1 leading-relaxed">
                        Your topic has been recorded. Once submitted, it cannot be changed.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {alertInfo.status === "conflict" && (
                <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-amber-300">
                        Topic Already Taken
                      </p>
                      <p className="text-xs text-amber-300/80 mt-1 leading-relaxed">
                        This topic is too similar to an already registered topic.
                      </p>
                      {alertInfo.conflictReason && (
                        <div className="mt-2.5 rounded-lg bg-black/20 border border-amber-500/20 p-3">
                          <p className="text-xs text-amber-200/90 leading-relaxed">
                            {alertInfo.conflictReason}
                          </p>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={handleTryAnother}
                        className="mt-3 text-xs text-amber-300 hover:text-amber-200 underline underline-offset-2 transition-colors inline-block"
                      >
                        Edit or change topic
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {alertInfo.status === "duplicate" && (
                <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-4">
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-blue-300">
                        Already Submitted
                      </p>
                      <p className="text-xs text-blue-300/80 mt-1 leading-relaxed">
                        {alertInfo.message || "You have already submitted. If you think there is something wrong, please contact Gazi."}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {alertInfo.status === "error" && (
                <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-4">
                  <div className="flex items-start gap-3">
                    <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-rose-300">Error</p>
                      <p className="text-xs text-rose-300/80 mt-1 leading-relaxed">
                        {alertInfo.message}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Minimal Card */}
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 sm:p-7 space-y-5"
        >
          {/* Student ID */}
          <div className="space-y-1.5">
            <label
              htmlFor="studentId"
              className="text-xs font-medium text-zinc-300 block"
            >
              Student ID
            </label>
            <input
              id="studentId"
              type="text"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              placeholder="e.g. 2024-1-60-001"
              disabled={isLoading || isLocked}
              maxLength={50}
              className="w-full px-3.5 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder:text-zinc-400 text-sm focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          {/* Proposed Topic */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="topicTitle"
                className="text-xs font-medium text-zinc-300 block"
              >
                Topic Title
              </label>
              <span className="text-[11px] text-zinc-400 tabular-nums">
                {topicTitle.length}/300
              </span>
            </div>
            <textarea
              ref={topicInputRef}
              id="topicTitle"
              value={topicTitle}
              onChange={(e) => setTopicTitle(e.target.value)}
              placeholder="Enter your proposed topic..."
              disabled={isLoading || isLocked}
              maxLength={300}
              rows={3}
              className="w-full px-3.5 py-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder:text-zinc-400 text-sm leading-relaxed resize-none focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!canSubmit || isLoading || isLocked}
            className="w-full py-2.5 px-4 rounded-lg text-sm font-medium bg-zinc-100 hover:bg-white text-zinc-950 transition-colors flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-zinc-600" />
                <span>Checking topic...</span>
              </>
            ) : submitStatus === "success" ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Submitted</span>
              </>
            ) : submitStatus === "duplicate" ? (
              <span>Already Submitted</span>
            ) : (
              <>
                <span>Submit Topic</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Note */}
        <p className="text-xs text-zinc-400 text-center mt-6">
          Topics cannot be edited or changed after submission.
        </p>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-lg mx-auto py-4 text-center border-t border-zinc-800/40">
        <p className="text-xs text-zinc-400">
          Created by Gazi Seeyam
        </p>
      </footer>
    </div>
  );
}

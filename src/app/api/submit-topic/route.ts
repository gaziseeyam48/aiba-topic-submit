// src/app/api/submit-topic/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { GoogleGenAI } from "@google/genai";

const COLLECTION = "term_paper_topics";

interface GeminiResponse {
  isUnique: boolean;
  conflictReason: string;
  similarityScore: number;
}

async function checkSemanticOverlap(
  candidateTopic: string,
  existingTopics: string[]
): Promise<GeminiResponse> {
  // New SDK: @google/genai — Interactions API
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

  const prompt = `You are an academic reviewer. Your task is to check whether a student's proposed term paper topic is too similar to any already registered topic.

REGISTERED TOPICS:
${existingTopics.map((t, i) => `${i + 1}. "${t}"`).join("\n")}

PROPOSED TOPIC:
"${candidateTopic}"

CRITERIA:
- Score >= 70: REJECT — topic covers the same core subject, research question, or case study as an existing topic.
- Score < 70: ACCEPT — topic is distinct.

RULES:
- Never reveal or quote the exact titles of registered topics.
- If rejecting, give a very simple, 1-sentence explanation of why it overlaps, in clear everyday language for a student. Do not use technical jargon or mention AI.
- Respond ONLY with valid JSON. No markdown fences.

{
  "isUnique": boolean,
  "conflictReason": "string",
  "similarityScore": number
}`;

  try {
    const interaction = await ai.interactions.create({
      model: "gemini-3.5-flash-lite",
      input: prompt,
    });

    const text = (interaction.output_text ?? "").trim();

    // Strip markdown code fences if present
    const cleaned = text.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();

    const parsed = JSON.parse(cleaned) as GeminiResponse;
    return parsed;
  } catch (err) {
    console.error("Verification error:", err);
    throw new Error(
      "Verification service is temporarily unavailable. Please try again in a moment."
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const studentId: string = (body.studentId ?? "").trim();
    const topicTitle: string = (body.topicTitle ?? "").trim();
    const confirm: boolean = !!body.confirm;

    // ── 1. Input validation ──────────────────────────────────────────────────
    if (!studentId || !topicTitle) {
      return NextResponse.json(
        { error: "Both Student ID and Topic Title are required." },
        { status: 400 }
      );
    }

    if (studentId.length > 50) {
      return NextResponse.json(
        { error: "Student ID is too long." },
        { status: 400 }
      );
    }

    if (topicTitle.length < 5) {
      return NextResponse.json(
        { error: "Topic title is too short. Please provide a meaningful title." },
        { status: 400 }
      );
    }

    if (topicTitle.length > 300) {
      return NextResponse.json(
        { error: "Topic title is too long (max 300 characters)." },
        { status: 400 }
      );
    }

    const db = getAdminDb();

    // ── 2. Check if studentId already submitted & fetch topics ──────────────
    const snapshot = await db.collection(COLLECTION).get();

    const isDuplicateStudent = snapshot.docs.some(
      (doc) =>
        (doc.data().studentId as string)?.trim().toLowerCase() ===
        studentId.toLowerCase()
    );

    if (isDuplicateStudent) {
      return NextResponse.json(
        {
          error: "duplicate_student",
          message:
            "You have already submitted. If you think there is something wrong, please contact Gazi.",
        },
        { status: 409 }
      );
    }

    const existingTopics: string[] = snapshot.docs
      .filter((doc) => doc.data().status === "approved")
      .map((doc) => doc.data().topicTitle as string);

    // ── 4. If no existing topics, handle immediately ───────────────────────────
    if (existingTopics.length === 0) {
      if (!confirm) {
        return NextResponse.json(
          { message: "Topic is unique. Ready to submit.", requireConfirmation: true },
          { status: 200 }
        );
      }

      await db.collection(COLLECTION).add({
        studentId,
        topicTitle,
        createdAt: FieldValue.serverTimestamp(),
        status: "approved",
      });

      return NextResponse.json(
        { message: "Topic registered successfully." },
        { status: 200 }
      );
    }

    // ── 5. Semantic overlap check via Gemini ─────────────────────────────────
    const evaluation = await checkSemanticOverlap(topicTitle, existingTopics);

    if (!evaluation.isUnique || evaluation.similarityScore >= 70) {
      return NextResponse.json(
        {
          error: "topic_conflict",
          message:
            "This topic is too similar to an already registered topic.",
          conflictReason: evaluation.conflictReason,
          similarityScore: evaluation.similarityScore,
        },
        { status: 409 }
      );
    }

    if (!confirm) {
      return NextResponse.json(
        { message: "Topic is unique. Ready to submit.", requireConfirmation: true },
        { status: 200 }
      );
    }

    // ── 6. Save approved topic ───────────────────────────────────────────────
    await db.collection(COLLECTION).add({
      studentId,
      topicTitle,
      createdAt: FieldValue.serverTimestamp(),
      status: "approved",
    });

    return NextResponse.json(
      { message: "Topic registered successfully." },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("submit-topic error:", err);
    // Explicitly use the message property if it exists, to avoid prototype loss issues
    const message = err?.message || "Internal server error. Please try again later.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

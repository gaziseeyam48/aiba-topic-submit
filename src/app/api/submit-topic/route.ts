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

  const prompt = `You are an academic reviewer. Your task is to check whether a student's proposed term paper topic is essentially the SAME topic as any already registered topic.

REGISTERED TOPICS:
${existingTopics.map((t, i) => `${i + 1}. "${t}"`).join("\n")}

PROPOSED TOPIC:
"${candidateTopic}"

IMPORTANT — BE LENIENT. Only reject a topic if it is almost identical to an existing one. Two topics sharing a broad theme or general subject area is NOT enough to reject. Focus on whether the specific research question, angle, and scope are the same.

CRITERIA FOR SIMILARITY SCORE:
- 85-100: REJECT — the proposed topic asks essentially the same research question with the same scope as an existing topic. They would produce nearly the same paper.
- 60-84: ACCEPT — topics share a general theme or subject area but explore different angles, focus on different aspects, or ask different research questions. This is ALLOWED.
- 0-59: ACCEPT — topics are clearly different.

EXAMPLES OF ACCEPTABLE (NOT conflicting) PAIRS:
- "The Impact of Digital Communication on Employee Misunderstandings" vs "What Common Communication Barriers Most Significantly Undermine Workplace Effectiveness?" → These share the broad theme of communication issues at work, but one focuses specifically on DIGITAL communication causing misunderstandings, while the other asks about GENERAL communication barriers affecting overall effectiveness. Different angle, different scope. ACCEPT.
- "Social Media's Role in Political Polarization" vs "The Effect of Social Media on Teen Mental Health" → Both involve social media, but completely different research questions. ACCEPT.

EXAMPLES OF CONFLICTING (should reject) PAIRS:
- "How Remote Work Affects Employee Productivity" vs "The Impact of Working From Home on Worker Productivity" → Same research question, just reworded. REJECT.
- "The Role of AI in Modern Healthcare Diagnostics" vs "Artificial Intelligence Applications in Medical Diagnosis" → Essentially identical topic. REJECT.

RULES:
- Never reveal or quote the exact titles of registered topics.
- If rejecting, give a very simple, 1-sentence explanation of why it overlaps, in clear everyday language for a student. Do not use technical jargon or mention AI.
- When in doubt, ACCEPT the topic. Be generous to students.
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

    if (!evaluation.isUnique || evaluation.similarityScore >= 85) {
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

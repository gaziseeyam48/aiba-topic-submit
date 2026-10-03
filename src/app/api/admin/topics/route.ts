// src/app/api/admin/topics/route.ts
// Admin API — returns all topics (protected by ADMIN_SECRET_KEY)
import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("x-admin-key");
  const secret = process.env.ADMIN_SECRET_KEY;

  if (!secret || authHeader !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = getAdminDb();
    const snapshot = await db
      .collection("term_paper_topics")
      .orderBy("createdAt", "asc")
      .get();

    const topics = snapshot.docs.map((doc, index) => {
      const data = doc.data();
      return {
        id: doc.id,
        serial: index + 1,
        studentId: data.studentId,
        topicTitle: data.topicTitle,
        status: data.status,
        createdAt: data.createdAt?.toDate?.()?.toISOString() ?? null,
      };
    });

    return NextResponse.json({ topics }, { status: 200 });
  } catch (err) {
    console.error("admin/topics error:", err);
    return NextResponse.json(
      { error: "Failed to fetch topics." },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  const authHeader = req.headers.get("x-admin-key");
  const secret = process.env.ADMIN_SECRET_KEY;

  if (!secret || authHeader !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { id, studentId, topicTitle } = body;

    if (!id || !studentId || !topicTitle) {
      return NextResponse.json(
        { error: "Missing required fields." },
        { status: 400 }
      );
    }

    const db = getAdminDb();
    await db.collection("term_paper_topics").doc(id).update({
      studentId: studentId.trim(),
      topicTitle: topicTitle.trim(),
    });

    return NextResponse.json({ message: "Topic updated successfully." }, { status: 200 });
  } catch (err) {
    console.error("admin/topics PUT error:", err);
    return NextResponse.json(
      { error: "Failed to update topic." },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export const runtime = "nodejs";

// Approve (execute) or reject a proposal: POST { action: "approve" | "reject" }
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const { action } = (await req.json().catch(() => ({}))) as { action?: string };

  // Ownership check: the proposal must belong to the user's store.
  const proposal = await prisma.agentProposal.findUnique({ where: { id } });
  if (!proposal || proposal.storeId !== user.storeId) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (action === "approve") {
    await prisma.agentProposal.update({
      where: { id },
      data: { status: "executed", result: "تم التنفيذ — الوكيل هيتابع النتيجة." },
    });
  } else if (action === "reject") {
    await prisma.agentProposal.update({ where: { id }, data: { status: "rejected" } });
  } else {
    return NextResponse.json({ error: "invalid_action" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

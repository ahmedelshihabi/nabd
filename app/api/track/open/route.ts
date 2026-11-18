import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// 1x1 transparent GIF.
const PIXEL = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64",
);

// Open tracking: GET /api/track/open?m=<messageId>
export async function GET(req: Request) {
  const m = new URL(req.url).searchParams.get("m");
  if (m) {
    try {
      await prisma.message.updateMany({
        where: { id: m, openedAt: null },
        data: { openedAt: new Date(), status: "opened" },
      });
    } catch {
      /* never block the pixel on a tracking failure */
    }
  }
  return new Response(PIXEL, {
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate, private",
    },
  });
}

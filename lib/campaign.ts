import { z } from "zod";

// Structured shape of an AI-generated multi-channel campaign.
export const SegmentSchema = z.object({
  name: z.string(),
  criteria: z.string(),
  estimatedPct: z.number().min(0).max(100),
  why: z.string(),
});

export const CampaignSchema = z.object({
  lang: z.string(),
  campaignName: z.string(),
  goal: z.string(),
  recommendedChannel: z.enum(["email", "whatsapp", "sms"]),
  channelReason: z.string(),
  segments: z.array(SegmentSchema),
  email: z.object({
    subject: z.string(),
    preview: z.string(),
    body: z.string(),
    cta: z.string(),
  }),
  whatsapp: z.object({ message: z.string() }),
  sms: z.object({ message: z.string() }),
  bestSendTime: z.string(),
  performance: z.object({
    expectedOpenRate: z.string(),
    expectedConversion: z.string(),
    note: z.string(),
  }),
  flow: z.object({
    name: z.string(),
    steps: z.array(
      z.object({
        when: z.string(),
        channel: z.string(),
        action: z.string(),
      }),
    ),
  }),
});

export type Campaign = z.infer<typeof CampaignSchema>;

// Builds the instruction the model answers. The brief carries the store
// description + the goal; the model replies in the brief's own language.
export function buildCampaignPrompt(brief: string, tone?: string): string {
  const toneLine = tone ? `- النبرة المطلوبة: ${tone}.\n` : "";
  return (
    "أنت وكيل التسويق الذكي لمنصة تسويق متعدد القنوات (إيميل، واتساب، SMS) موجّهة لمتاجر التجارة الإلكترونية في الشرق الأوسط.\n" +
    "صمّم حملة تسويقية كاملة وجاهزة للإطلاق بناءً على وصف المتجر والهدف.\n\n" +
    "قواعد:\n" +
    "- رُدّ بنفس لغة وصف المتجر (عربي→عربي، إنجليزي→إنجليزي).\n" +
    toneLine +
    "- اكتب رسائل حقيقية جاهزة للإرسال ومقنعة، كل قناة بأسلوبها (الإيميل أطول، الواتساب ودّي قصير، الـ SMS مختصر جدًا).\n" +
    "- اقترح شرائح منطقية بنِسب تقديرية.\n" +
    "- اختار أفضل قناة للهدف مع السبب.\n" +
    "- صمّم flow أوتوماتيك واحد مناسب.\n\n" +
    "وصف المتجر والهدف:\n\"\"\"\n" +
    brief +
    "\n\"\"\"\n\n" +
    "رُدّ بـ JSON فقط (من غير أي كلام قبله أو بعده) بالشكل ده بالظبط:\n" +
    JSON.stringify(
      {
        lang: "ar أو en",
        campaignName: "اسم مختصر جذّاب",
        goal: "الهدف في جملة",
        recommendedChannel: "email أو whatsapp أو sms",
        channelReason: "سبب اختيار القناة",
        segments: [
          { name: "اسم", criteria: "شرط", estimatedPct: 30, why: "السبب" },
        ],
        email: { subject: "", preview: "", body: "فقرات بينها سطرين", cta: "" },
        whatsapp: { message: "" },
        sms: { message: "أقل من 160 حرف" },
        bestSendTime: "",
        performance: {
          expectedOpenRate: "40–50%",
          expectedConversion: "3–6%",
          note: "تقديرات",
        },
        flow: {
          name: "",
          steps: [{ when: "", channel: "email/whatsapp/sms", action: "" }],
        },
      },
      null,
      2,
    )
  );
}

// Tolerant extraction of a JSON object from a model reply.
export function extractJson(text: string): unknown {
  const trimmed = text.trim();
  // Prefer a fenced block if present.
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fence ? fence[1] : trimmed;
  try {
    return JSON.parse(candidate);
  } catch {
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start !== -1 && end > start) {
      return JSON.parse(candidate.slice(start, end + 1));
    }
    throw new Error("No JSON object found in model reply");
  }
}

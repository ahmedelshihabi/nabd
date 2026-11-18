import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";

// One SES client for the process. Credentials come from the standard AWS
// environment variables (AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY / AWS_REGION).
let client: SESv2Client | null = null;
function ses(): SESv2Client {
  if (!client) client = new SESv2Client({ region: process.env.AWS_REGION || "us-east-1" });
  return client;
}

export type SendResult = { messageId: string };

// Sends one email. The `from` address must be a verified SES identity.
export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  from?: string;
}): Promise<SendResult> {
  const from = opts.from || process.env.EMAIL_FROM;
  if (!from) throw new Error("Missing env EMAIL_FROM");

  const out = await ses().send(
    new SendEmailCommand({
      FromEmailAddress: from,
      Destination: { ToAddresses: [opts.to] },
      Content: {
        Simple: {
          Subject: { Data: opts.subject, Charset: "UTF-8" },
          Body: { Html: { Data: opts.html, Charset: "UTF-8" } },
        },
      },
    }),
  );
  return { messageId: out.MessageId || "" };
}

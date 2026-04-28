import { createHook, FatalError, RetryableError } from "workflow";
import { prisma } from "@/lib/prisma";

export async function emailVerificationWorkflow(
  userId: string,
  email: string,
  name: string
) {
  "use workflow";

  using hook = createHook<{ verified: true }>({
    token: `email-verify:${userId}`,
  });

  await sendVerificationEmail(email, name, hook.token);

  // Workflow suspends here — no resources consumed while waiting
  await hook;

  await markUserVerified(userId);
}

async function sendVerificationEmail(email: string, name: string, token: string) {
  "use step";

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  const verificationUrl = `${baseUrl}/api/verify-email?token=${encodeURIComponent(token)}`;

  if (process.env.NODE_ENV !== "production") {
    console.log(`\n📧  Verification email for ${name} <${email}>\n   ${verificationUrl}\n`);
    return;
  }

  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) throw new FatalError("GMAIL_USER or GMAIL_APP_PASSWORD is not set.");

  const nodemailer = await import("nodemailer");
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });

  try {
    await transporter.sendMail({
      from: `"Family Shopping List" <${user}>`,
      to: email,
      subject: "Verify your email address",
      html: `
        <p>Hi ${name},</p>
        <p>Click the link below to verify your email address:</p>
        <p><a href="${verificationUrl}">${verificationUrl}</a></p>
        <p>This link will work as long as your account exists.</p>
      `,
    });
  } catch (err) {
    throw new RetryableError(`Failed to send email: ${err}`);
  }
}

async function markUserVerified(userId: string) {
  "use step";

  await prisma.user.update({
    where: { id: userId },
    data: { emailVerified: true },
  });
}

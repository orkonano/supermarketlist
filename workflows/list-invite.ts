import { FatalError, RetryableError } from "workflow";

export async function listInviteWorkflow(
  email: string,
  inviterName: string,
  listName: string,
  token: string,
  userExists: boolean
) {
  "use workflow";

  await sendInviteEmail(email, inviterName, listName, token, userExists);
}

async function sendInviteEmail(
  email: string,
  inviterName: string,
  listName: string,
  token: string,
  userExists: boolean
) {
  "use step";

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  const acceptUrl = userExists
    ? `${baseUrl}/api/accept-invite?token=${encodeURIComponent(token)}`
    : `${baseUrl}/signup?inviteToken=${encodeURIComponent(token)}`;

  if (process.env.NODE_ENV !== "production") {
    console.log(`\n📧  List invite for ${email}`);
    console.log(`   ${inviterName} invited you to "${listName}"`);
    console.log(`   ${acceptUrl}\n`);
    return;
  }

  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) throw new FatalError("GMAIL_USER or GMAIL_APP_PASSWORD is not set.");

  const nodemailer = await import("nodemailer");
  const transporter = nodemailer.createTransport({ service: "gmail", auth: { user, pass } });

  try {
    await transporter.sendMail({
      from: `"Family Shopping List" <${user}>`,
      to: email,
      subject: `${inviterName} invited you to "${listName}"`,
      html: `
        <p>Hi there,</p>
        <p><strong>${inviterName}</strong> has invited you to collaborate on the shopping list <strong>"${listName}"</strong>.</p>
        <p><a href="${acceptUrl}">${userExists ? "Accept the invitation" : "Create an account and join"}</a></p>
        <p>This link expires in 7 days.</p>
      `,
    });
  } catch (err) {
    throw new RetryableError(`Failed to send invite email: ${err}`);
  }
}

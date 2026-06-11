import { FatalError, RetryableError } from "workflow";

export type InviteParams = {
  email: string;
  inviterName: string;
  listName: string;
  token: string;
  userExists: boolean;
};

export async function listInviteWorkflow(params: InviteParams) {
  "use workflow";

  await sendInviteEmail(params);
}

async function sendInviteEmail({ email, inviterName, listName, token, userExists }: InviteParams) {
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
      from: `"Lista del Súper" <${user}>`,
      to: email,
      subject: `${inviterName} te invitó a "${listName}"`,
      html: `
        <p>¡Hola!</p>
        <p><strong>${inviterName}</strong> te invitó a colaborar en la lista del súper <strong>"${listName}"</strong>.</p>
        <p><a href="${acceptUrl}">${userExists ? "Aceptar la invitación" : "Crear una cuenta y unirse"}</a></p>
        <p>Este enlace vence en 7 días.</p>
      `,
    });
  } catch (err) {
    throw new RetryableError(`Failed to send invite email: ${err}`);
  }
}

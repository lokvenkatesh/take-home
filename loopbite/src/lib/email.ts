import "server-only";
import nodemailer from "nodemailer";

type Message = { to: string; subject: string; text: string; html: string };

// Sends through SMTP (Gmail with an app password works). Without SMTP settings, prints the email instead.
export async function sendEmail(msg: Message) {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    console.log(`\n[Email not configured, printing instead]\nTo: ${msg.to}\nSubject: ${msg.subject}\n\n${msg.text}\n`);
    return;
  }
  const port = Number(SMTP_PORT ?? 465);
  const transport = nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  await transport.sendMail({ from: MAIL_FROM ?? SMTP_USER, ...msg });
}

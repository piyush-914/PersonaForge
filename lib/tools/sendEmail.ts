import nodemailer from 'nodemailer';
import { z } from 'zod';

export const sendEmailSchema = z.object({
  to: z.string().email(),
  subject: z.string(),
  body: z.string(),
});

export type SendEmailArgs = z.infer<typeof sendEmailSchema>;

export async function sendEmail(args: SendEmailArgs, apiKeys?: Record<string, string>) {
  const { to, subject, body } = args;

  const smtpHost = apiKeys?.SMTP_HOST || process.env.SMTP_HOST;
  const smtpPort = parseInt(apiKeys?.SMTP_PORT || process.env.SMTP_PORT || '587');
  const smtpUser = apiKeys?.SMTP_USER || process.env.SMTP_USER;
  const smtpPass = apiKeys?.SMTP_PASS || process.env.SMTP_PASS;

  if (!smtpHost || !smtpUser || !smtpPass) {
    throw new Error('SMTP credentials are not configured. Please provide SMTP_HOST, SMTP_USER, and SMTP_PASS in agent settings.');
  }

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });

  await transporter.sendMail({
    from: smtpUser,
    to,
    subject,
    text: body,
  });

  return `Email sent successfully to ${to}`;
}

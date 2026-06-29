import nodemailer from 'nodemailer';

const isMock = 
  !process.env.SMTP_USER || 
  process.env.SMTP_USER.startsWith('mock_') || 
  !process.env.SMTP_PASS || 
  process.env.SMTP_PASS.startsWith('mock_');

export const sendMail = async (to: string, subject: string, html: string) => {
  if (isMock) {
    console.log(`[MOCK EMAIL SENT]
To: ${to}
Subject: ${subject}
Content: ${html.replace(/<[^>]*>/g, '').substring(0, 150)}...
`);
    return;
  }

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.mailtrap.io',
      port: Number(process.env.SMTP_PORT) || 2525,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'noreply@shinestaff.com',
      to,
      subject,
      html
    });
  } catch (error) {
    console.error('Nodemailer Error:', error);
  }
};

// const { Resend } = require('resend');

// const resend = new Resend(process.env.RESEND_API_KEY);

// async function sendPasswordResetEmail(toEmail, userName, resetLink) {
//   try {
//     await resend.emails.send({
//       from: process.env.FROM_EMAIL,
//       to: toEmail,
//       subject: 'Reset your CarbonTrack password',
//       html: `
//         <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px; background: #f4f9f5; border-radius: 12px;">
//           <div style="text-align: center; margin-bottom: 28px;">
//             <div style="font-size: 36px;">🌿</div>
//             <h1 style="color: #1a3a2a; font-size: 22px; margin: 8px 0;">CarbonTrack</h1>
//           </div>
//           <h2 style="color: #2d5a3d; font-size: 18px;">Hi ${userName},</h2>
//           <p style="color: #444; line-height: 1.6;">
//             We received a request to reset your CarbonTrack password. Click the button below to set a new one.
//           </p>
//           <div style="text-align: center; margin: 32px 0;">
//             <a href="${resetLink}" 
//                style="background: #3d7a52; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-size: 15px; font-weight: 600; display: inline-block;">
//               Reset My Password
//             </a>
//           </div>
//           <p style="color: #888; font-size: 13px;">
//             This link expires in <strong>1 hour</strong>. If you didn't request this, you can safely ignore this email.
//           </p>
//           <hr style="border: none; border-top: 1px solid #ddd; margin: 24px 0;" />
//           <p style="color: #aaa; font-size: 11px; text-align: center;">
//             CarbonTrack — Track your carbon footprint
//           </p>
//         </div>
//       `,
//     });
//     return { success: true };
//   } catch (error) {
//     console.error('Email send error:', error);
//     return { success: false, error };
//   }
// }

// async function sendWelcomeEmail(toEmail, userName) {
//   try {
//     await resend.emails.send({
//       from: process.env.FROM_EMAIL,
//       to: toEmail,
//       subject: 'Welcome to CarbonTrack 🌿',
//       html: `
//         <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px; background: #f4f9f5; border-radius: 12px;">
//           <div style="text-align: center; margin-bottom: 24px;">
//             <div style="font-size: 48px;">🌿</div>
//             <h1 style="color: #1a3a2a;">Welcome to CarbonTrack!</h1>
//           </div>
//           <p style="color: #444; line-height: 1.6; font-size: 15px;">
//             Hi ${userName}, your account is ready. Start logging your daily activities to track and reduce your carbon footprint.
//           </p>
//           <div style="background: #e8f4ed; border-radius: 8px; padding: 16px; margin: 20px 0;">
//             <p style="margin: 0; color: #2d5a3d; font-size: 14px;">
//               💡 <strong>Tip:</strong> Log your transport and energy usage first — these are usually the biggest contributors to your footprint.
//             </p>
//           </div>
//           <p style="color: #aaa; font-size: 11px; text-align: center; margin-top: 24px;">
//             CarbonTrack — making every tonne count
//           </p>
//         </div>
//       `,
//     });
//     return { success: true };
//   } catch (error) {
//     console.error('Welcome email error:', error);
//     return { success: false, error };
//   }
// }

// module.exports = { sendPasswordResetEmail, sendWelcomeEmail };

const nodemailer = require('nodemailer');

// Create reusable transporter using Gmail SMTP
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

// Verify connection on startup
transporter.verify((error) => {
  if (error) {
    console.error('Gmail connection error:', error.message);
    console.error('Check your GMAIL_USER and GMAIL_APP_PASSWORD in .env');
  } else {
    console.log('Gmail SMTP ready — emails will send from', process.env.GMAIL_USER);
  }
});

async function sendPasswordResetEmail(toEmail, userName, resetLink) {
  try {
    await transporter.sendMail({
      from: `"CarbonTrack" <${process.env.FROM_EMAIL}>`,
      to: toEmail,
      subject: 'Reset your CarbonTrack password',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px;background:#f4f9f5;border-radius:12px;">
          <div style="text-align:center;margin-bottom:24px;">
            <div style="font-size:40px;">🌿</div>
            <h1 style="color:#1a3a2a;font-size:22px;margin:8px 0;">CarbonTrack</h1>
          </div>
          <h2 style="color:#2d5a3d;font-size:18px;">Hi ${userName},</h2>
          <p style="color:#444;line-height:1.6;margin:12px 0;">
            We received a request to reset your CarbonTrack password.
            Click the button below to set a new one.
          </p>
          <div style="text-align:center;margin:32px 0;">
            <a href="${resetLink}"
               style="background:#3d7a52;color:white;padding:14px 32px;border-radius:8px;
                      text-decoration:none;font-size:15px;font-weight:600;display:inline-block;">
              Reset My Password
            </a>
          </div>
          <p style="color:#888;font-size:13px;">
            This link expires in <strong>1 hour</strong>.
            If you didn't request this, you can safely ignore this email.
          </p>
          <hr style="border:none;border-top:1px solid #ddd;margin:24px 0;"/>
          <p style="color:#aaa;font-size:11px;text-align:center;">
            CarbonTrack — Track your carbon footprint
          </p>
        </div>
      `,
    });
    console.log('Password reset email sent to', toEmail);
    return { success: true };
  } catch (error) {
    console.error('Failed to send reset email:', error.message);
    return { success: false, error };
  }
}

async function sendWelcomeEmail(toEmail, userName) {
  try {
    await transporter.sendMail({
      from: `"CarbonTrack" <${process.env.FROM_EMAIL}>`,
      to: toEmail,
      subject: 'Welcome to CarbonTrack 🌿',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px;background:#f4f9f5;border-radius:12px;">
          <div style="text-align:center;margin-bottom:24px;">
            <div style="font-size:48px;">🌿</div>
            <h1 style="color:#1a3a2a;">Welcome to CarbonTrack!</h1>
          </div>
          <p style="color:#444;line-height:1.6;font-size:15px;">
            Hi ${userName}, your account is ready.
            Start logging your daily activities to track and reduce your carbon footprint.
          </p>
          <div style="background:#e8f4ed;border-radius:8px;padding:16px;margin:20px 0;">
            <p style="margin:0;color:#2d5a3d;font-size:14px;">
              💡 <strong>Tip:</strong> Log your transport and energy usage first —
              these are usually the biggest contributors to your footprint.
            </p>
          </div>
          <p style="color:#aaa;font-size:11px;text-align:center;margin-top:24px;">
            CarbonTrack — making every tonne count
          </p>
        </div>
      `,
    });
    console.log('Welcome email sent to', toEmail);
    return { success: true };
  } catch (error) {
    console.error('Failed to send welcome email:', error.message);
    return { success: false, error };
  }
}

module.exports = { sendPasswordResetEmail, sendWelcomeEmail };
const nodemailer = require("nodemailer");
const { EMAIL, PASSWORD } = require("./config");
const { Resend } = require("resend");
const resend = new Resend(process.env.RESEND_API_KEY);

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: EMAIL,
    pass: PASSWORD,
  },
});

/**
 * Send styled HTML email
 * @param {string} to - Receiver email
 * @param {string} subject - Subject line
 * @param {string} html - Email body
 */
const Sendmail = async (to, subject, html) => {
  try {
    await resend.emails.send({
      from: "Safar Team <onboarding@resend.dev>",
      to,
      subject,
      html,
    });

    console.log("✅ Email sent via Resend");
  } catch (error) {
    console.error("❌ Email send failed:", error);
  }
};

module.exports = { Sendmail };

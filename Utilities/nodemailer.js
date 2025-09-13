const nodemailer = require("nodemailer");
const { EMAIL, PASSWORD } = require("./config");

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
 * @param {string} html - Email body (HTML template)
 */
const Sendmail = async (to, subject, html) => {
  const mailOptions = {
    from: `"Safar Team" <${EMAIL}>`,
    to,
    subject,
    html, // 👈 only HTML (no plain text to avoid raw code issue)
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("✅ Email sent successfully!");
  } catch (error) {
    console.error("❌ Email sending failed:", error);
  }
};

module.exports = { Sendmail };

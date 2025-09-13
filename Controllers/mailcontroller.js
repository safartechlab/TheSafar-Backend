const Sendmail = require("../Utilities/nodemailer");
const { loadTemplate, renderTemplate } = require("../Helpers/templateloaders");

const mailsend = async (req, res) => {
  try {
    const { to, subject, text, templateName, templateData } = req.body;

    if (!to || !subject) {
      return res.status(400).json({ message: "to and subject are required" });
    }

    // load & render template if provided
    let html = null;
    if (templateName) {
      const rawTemplate = await loadTemplate(`${templateName}.html`);
      html = renderTemplate(rawTemplate, templateData || {});
    }

    // fallback plain text
    const plainText =
      text ||
      (templateData && templateData.plain) ||
      "Please view this email in an HTML-capable client.";

    const success = await Sendmail(to, subject, plainText, html);

    if (success) {
      return res.status(200).json({ message: "Email Sent Successfully" });
    } else {
      return res.status(500).json({ message: "Failed to send email" });
    }
  } catch (err) {
    console.error("Mail Controller Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

module.exports = { mailsend };

const nodemailer = require('nodemailer');
const {EMAIL, PASSWORD} = require('./config');
// const welcome.html = require("../Templates/welcome.html");

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: EMAIL,
        pass: PASSWORD
    },
});

const Sendmail = async(to, subject, text, html) => {
    const mailoptions = {
      from: EMAIL,
        to:to,
        subject:subject,
        text:text,
        html:html,
    };

    try{
         await transporter.sendMail(mailoptions);
         return true;
    }
    catch(error){
        console.log(error);
        return true;
    }

}

module.exports = Sendmail;
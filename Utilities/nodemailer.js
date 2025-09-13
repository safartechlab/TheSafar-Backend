const nodemailer = require('nodemailer');
const {EMAIL, PASSWORD} = require('./config');

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
    }
    catch(error){
        console.log(error);
    }

}

module.exports = {Sendmail};
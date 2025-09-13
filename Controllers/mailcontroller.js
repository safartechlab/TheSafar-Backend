const Sendmail = require("../Utilities/nodemailer");

const mailsend = async(req, res) =>{
    const{to,subject,tect,html} = req.body;
    if(!to || !subject){
        return res.status(400).json({message : `to and subject are required`})
    }

    const success = await sendmail(to,subject,tect,html)
    if(success){
        return res.status(200).json({message : `Email Sent Successfully`});
    }
    else{
         return res.status(500).json({message : `Failed to sent email`});
    }
}

module.exports = {mailsend}
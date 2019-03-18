import nodemailer from 'nodemailer'
import * as dotenv from 'dotenv'
dotenv.config()         //load in the env variables

const sendMail = async (subject: string, text: string) => {
	 const transporter = await nodemailer.createTransport({
		service: 'gmail',
		auth: {
			user: process.env.EMAIL_USER,
			pass: process.env.EMAIL_PASS
		}
	})

	//get mail recipients from the env variables, they are separated by ' '
	const mailList = process.env.EMAIL_RECIPIENTS .split(' ') 

	const mailOptions = {
		priority: 'high',
		from: process.env.EMAIL_USER,
		to: mailList,
		subject: subject,
		text: text
	};

	await transporter.sendMail(mailOptions, function(error, info){
		if (error) {
			console.log(error);
		} else {
			console.log('Email sent: ' + info.response);
		}
	}); 
}

export default sendMail

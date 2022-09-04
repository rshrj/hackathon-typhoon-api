const nodemailer = require('nodemailer');
const { convert } = require('html-to-text');
const fs = require('fs');
const juice = require('juice');
const ejs = require('ejs');
const config = require('config');

const smtpCreds = config.get('env.smtp');

const transporter = nodemailer.createTransport({
  host: smtpCreds.host,
  port: smtpCreds.port || 587,
  secure: process.env.NODE_ENV === 'production',
  auth: {
    user: smtpCreds.user,
    pass: smtpCreds.password,
  }

});

const sendMail = async ({
  template: templateName,
  templateVars,
  ...restOfOptions
}) => {
  const templatePath = `${__dirname}/templates/${templateName}.ejs`;
  const options = {
    ...restOfOptions
  };

  if (templateName && fs.existsSync(templatePath)) {
    const template = fs.readFileSync(templatePath, 'utf-8');
    const html = ejs.render(template, templateVars);
    const text = convert(html);
    const htmlWithStylesInlined = juice(html);

    options.html = htmlWithStylesInlined;
    options.text = text;
  }

  return transporter.sendMail(options);
};

module.exports = sendMail;

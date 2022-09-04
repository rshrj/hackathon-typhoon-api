const sendMail = require('./utils/mailing/sendmail');

(async () => {
  await sendMail({
    to: ['abc@gmail.com', 'tetris@gmail.com'],
    from: config.get('env.smtp.user'),
    subject: 'Password Reset',
    template: 'reset',
    templateVars: {
      emailAddress: 'abc@gmail.com',
      resetLink: 'https://twitter.com'
    }
  });
})();

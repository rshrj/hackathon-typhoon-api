const Joi = require('joi');

const checkLogin = Joi.object({
  email: Joi.string().trim().email().required().label('Email'),
  password: Joi.string().trim().min(8).required().label('Password'),
});

const checkResetPassword = Joi.object({
  token: Joi.string().trim().length(64).required().label('Token'),
  password: Joi.string().trim().min(8).required().label('Password'),
  password2: Joi.any()
    .valid(Joi.ref('password'))
    .required()
    .label('Confirm Password'),
});

module.exports = { checkLogin, checkResetPassword };

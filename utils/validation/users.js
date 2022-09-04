const Joi = require("joi");

const checkUser = Joi.object({
  email: Joi.string().trim().email().required().label("Email"),
  name: Joi.object({
    first: Joi.string().trim().required().label("First Name"),
    last: Joi.string().trim().required().label("Last Name"),
  }),
  password: Joi.string().trim().min(8).required().label("Password"),
  password2: Joi.any()
    .valid(Joi.ref("password"))
    .required()
    .label("Confirm Password"),
  phone: Joi.string()
    .pattern(/^[6-9]\d{9}$/)
    .required()
    .label("Mobile Number"),
});

const checkUserUpdate = Joi.object({
  email: Joi.string().trim().email().required().label("Email"),
  name: Joi.object({
    first: Joi.string().trim().required().label("First Name"),
    last: Joi.string().trim().required().label("Last Name"),
  }),
  password: Joi.string().trim().min(8).required().label("Password"),
  phone: Joi.string()
    .pattern(/^[6-9]\d{9}$/)
    .required()
    .label("Mobile Number"),
});

module.exports = { checkUserUpdate, checkUser };

const Joi = require('joi');

const CallBackRequestValidation = Joi.object({
  name: Joi.string().required(),
  phone: Joi.string()
    .pattern(/^[6-9]\d{9}$/)
    .required()
    .label('Mobile Number'),
  message: Joi.string().required()
});

module.exports = {
  CallBackRequestValidation
};

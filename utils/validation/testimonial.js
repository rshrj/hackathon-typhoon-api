const Joi = require('joi');

module.exports.checkTestimonial = Joi.object({
  name: Joi.string().min(5).required(),
  company: Joi.string().min(4).allow('').optional(),
  phone: Joi.string()
    .pattern(/^[6-9]\d{9}$/)
    .required()
    .label('Mobile Number'),
  message: Joi.string().min(80).required()
});

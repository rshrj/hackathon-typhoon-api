const Joi = require('joi');

const HomeAdValidation = Joi.object({
  title: Joi.string().required(),
  tagline: Joi.string().required(),
  image: Joi.string().uri().required(),
  buttonTitle: Joi.string().required(),
  buttonLink: Joi.string().uri().required()
});

module.exports = { HomeAdValidation };

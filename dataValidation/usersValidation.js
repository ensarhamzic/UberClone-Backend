const Joi = require("joi");

const usersJoiSchema = Joi.object({
  fullName: Joi.string().required().max(30),
  email: Joi.string().email().required(),
  password: Joi.string().min(5).max(30).required(),
  type: Joi.number().required(),
    home: Joi.object({
        latitude: Joi.number().required(),
        longitude: Joi.number().required(),
    }),
    work: Joi.object({
        latitude: Joi.number().required(),
        longitude: Joi.number().required(),
    }),
    carType: Joi.number(),
});

module.exports = usersJoiSchema;

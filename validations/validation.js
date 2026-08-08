// ✅ Input validation middleware using Joi
const Joi = require('joi');

// Auth Validation Schemas
const authValidation = {
  signup: (data) => {
    const schema = Joi.object({
      name: Joi.string().min(2).max(50).required()
        .messages({
          'string.min': 'Name must be at least 2 characters',
          'string.max': 'Name cannot exceed 50 characters',
          'any.required': 'Name is required'
        }),
      username: Joi.string().min(3).max(30).required()
        .pattern(/^[a-zA-Z0-9_]+$/)
        .messages({
          'string.pattern.base': 'Username can only contain letters, numbers, and underscores',
          'string.min': 'Username must be at least 3 characters',
          'any.required': 'Username is required'
        }),
      email: Joi.string().email().required()
        .messages({
          'string.email': 'Please provide a valid email address',
          'any.required': 'Email is required'
        }),
      phone: Joi.number().integer().min(1000000000).max(9999999999)
        .required()
        .messages({
          'number.min': 'Phone number must be 10 digits',
          'number.max': 'Phone number must be 10 digits',
          'any.required': 'Phone number is required'
        }),
      password: Joi.string().min(6).max(100).required()
        .messages({
          'string.min': 'Password must be at least 6 characters',
          'any.required': 'Password is required'
        }),
      role: Joi.string().valid('owner', 'visitor').required()
        .messages({
          'any.only': 'Role must be either owner or visitor',
          'any.required': 'Role is required'
        })
    });
    return schema.validate(data, { abortEarly: false });
  },

  login: (data) => {
    const schema = Joi.object({
      email: Joi.string().email().optional()
        .messages({ 'string.email': 'Please provide a valid email' }),
      username: Joi.string().optional(),
      password: Joi.string().required()
        .messages({ 'any.required': 'Password is required' })
    }).or('email', 'username')
      .messages({
        'object.missing': 'Either email or username is required'
      });
    return schema.validate(data, { abortEarly: false });
  }
};

// Todo Validation Schemas
const todoValidation = {
  create: (data) => {
    const schema = Joi.object({
      tasks: Joi.array().items(Joi.string().trim().min(1)).min(1).required()
        .messages({
          'array.min': 'At least one task is required',
          'any.required': 'Tasks are required'
        }),
      dueDate: Joi.date().min('now').optional()
        .messages({
          'date.min': 'Due date cannot be in the past'
        }),
      priority: Joi.string().valid('low', 'medium', 'high').default('medium')
        .messages({
          'any.only': 'Priority must be low, medium, or high'
        })
    });
    return schema.validate(data, { abortEarly: false });
  },

  update: (data) => {
    const schema = Joi.object({
      tasks: Joi.array().items(Joi.string().trim().min(1)).min(1).optional(),
      dueDate: Joi.date().optional(),
      isCompleted: Joi.boolean().optional(),
      priority: Joi.string().valid('low', 'medium', 'high').optional()
    }).min(1)
      .messages({
        'object.min': 'At least one field is required for update'
      });
    return schema.validate(data, { abortEarly: false });
  },

  search: (data) => {
    const schema = Joi.object({
      q: Joi.string().trim().optional(),
      status: Joi.boolean().optional(),
      priority: Joi.string().valid('low', 'medium', 'high').optional(),
      fromDate: Joi.date().optional(),
      toDate: Joi.date().min(Joi.ref('fromDate')).optional()
        .messages({
          'date.min': 'To date must be after from date'
        })
    });
    return schema.validate(data, { abortEarly: false });
  }
};

// Comment Validation Schemas
const commentValidation = {
  create: (data) => {
    const schema = Joi.object({
      todoId: Joi.string().required()
        .messages({ 'any.required': 'Todo ID is required' }),
      comment: Joi.string().trim().min(1).max(500).required()
        .messages({
          'string.min': 'Comment cannot be empty',
          'string.max': 'Comment cannot exceed 500 characters',
          'any.required': 'Comment is required'
        })
    });
    return schema.validate(data, { abortEarly: false });
  },

  update: (data) => {
    const schema = Joi.object({
      comment: Joi.string().trim().min(1).max(500).required()
        .messages({
          'string.min': 'Comment cannot be empty',
          'string.max': 'Comment cannot exceed 500 characters',
          'any.required': 'Comment is required'
        })
    });
    return schema.validate(data, { abortEarly: false });
  }
};

// ✅ Middleware to validate requests
const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema(req.body);
    if (error) {
      const errors = error.details.map(detail => detail.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors
      });
    }
    next();
  };
};

module.exports = {
  authValidation,
  todoValidation,
  commentValidation,
  validate
};
// server/middleware/validateObjectId.js
import MongoUtils from '../utils/mongoUtils.js';

/**
 * Middleware to validate MongoDB ObjectId in params
 */
export const validateObjectId = (paramName = 'id') => {
  return (req, res, next) => {
    const id = req.params[paramName];
    
    if (!id) {
      return res.status(400).json({ message: `${paramName} is required` });
    }
    
    if (!MongoUtils.isValidObjectId(id)) {
      return res.status(400).json({ 
        message: `Invalid ${paramName} format`,
        details: 'ID must be a valid MongoDB ObjectId (24 hex characters)'
      });
    }
    
    next();
  };
};

/**
 * Middleware to validate ObjectIds in request body
 */
export const validateBodyObjectIds = (fieldNames = []) => {
  return (req, res, next) => {
    const errors = [];
    
    for (const fieldName of fieldNames) {
      const value = req.body[fieldName];
      
      if (value && !MongoUtils.isValidObjectId(value)) {
        errors.push({
          field: fieldName,
          message: `Invalid ${fieldName} format`
        });
      }
    }
    
    if (errors.length > 0) {
      return res.status(400).json({ 
        message: 'Invalid ID format(s) in request',
        errors 
      });
    }
    
    next();
  };
};
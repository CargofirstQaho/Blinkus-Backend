import { query, param } from 'express-validator';
import { AUDIT_ACTIONS, AUDIT_MODULES, AUDIT_STATUS } from '../constants/auditActions.js';

export const listAuditLogsValidator = [
  query('userId')
    .optional({ checkFalsy: true })
    .isMongoId()
    .withMessage('userId must be a valid ID'),

  query('organizationId')
    .optional({ checkFalsy: true })
    .isMongoId()
    .withMessage('organizationId must be a valid ID'),

  query('action')
    .optional({ checkFalsy: true })
    .isIn(Object.values(AUDIT_ACTIONS))
    .withMessage('Invalid action'),

  query('module')
    .optional({ checkFalsy: true })
    .isIn(Object.values(AUDIT_MODULES))
    .withMessage('Invalid module'),

  query('resourceType')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 100 })
    .withMessage('resourceType must be under 100 characters'),

  query('status')
    .optional({ checkFalsy: true })
    .isIn(Object.values(AUDIT_STATUS))
    .withMessage('Invalid status'),

  query('startDate')
    .optional({ checkFalsy: true })
    .isISO8601()
    .withMessage('startDate must be a valid date'),

  query('endDate')
    .optional({ checkFalsy: true })
    .isISO8601()
    .withMessage('endDate must be a valid date'),

  query('page')
    .optional({ checkFalsy: true })
    .isInt({ min: 1 })
    .withMessage('page must be a positive integer'),

  query('limit')
    .optional({ checkFalsy: true })
    .isInt({ min: 1, max: 100 })
    .withMessage('limit must be between 1 and 100'),
];

export const organizationIdParamValidator = [
  param('id')
    .isMongoId()
    .withMessage('Invalid organization ID'),
];

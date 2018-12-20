import { Request, Response } from 'express';

/**
 * @description Morgan extension function to return a log string representation of
 *  a user.
 * @export
 * @param {Request} req Express request object.
 * @param {Response} res Express response object.
 * @returns {string} A string representing the user.
 */
export function userMorganToken(req: Request, res: Response) {
  if (!req.user) {
    return '(NONE)';
  }

  return `(${req.user.firstName} ${req.user.lastName}|${req.user._id})`;
}

import { NextFunction, Request, Response, Router } from 'express';
import { validationResult } from 'express-validator/check';
import { ILogger } from '../logging';
import { IRouter } from './router';

/**
 * @description Base class providing common functionality to routers/controllers.
 * @export
 * @abstract
 * @class RouterBase
 * @implements {IRouter}
 */
export abstract class RouterBase implements IRouter {

  /**
   * @description The parent router instance.
   * @protected
   * @type {Router}
   * @memberof RouterBase
   */
  protected app: Router;

  /**
   * @description A service for logging.
   * @protected
   * @type {ILogger}
   * @memberof RouterBase
   */
  protected logger: ILogger;

  /**
   * Creates an instance of RouterBase.
   * @param systemState The system state object.
   * @param config Configuration for this router.
   * @memberof RouterBase
   */
  public constructor(
    systemState: {
      app: Router,
    },
    config: {
      logger: ILogger,
    },
  ) {
    this.app = systemState.app;
    this.logger = config.logger;
  }

  /**
   * @description Registers routes.
   * @abstract
   * @param {string} mountPoint The path at which to mount the routes.
   * @memberof RouterBase
   */
  public abstract registerRoutes(mountPoint: string): void;

  /**
   * @description Validates a request and performs necessary handling if the request
   *  is not valid.
   * @protected
   * @param {Request} req Express request object.
   * @param {Response} res Express response object.
   * @param {NextFunction} next Express next function.
   * @returns {void}
   * @memberof RouterBase
   */
  protected validateRequest(req: Request, res: Response, next: NextFunction): void {
    const result = validationResult(req);
    if (result.isEmpty()) {
      return next();
    }

    for (const error of result.array({
      onlyFirstError: true,
    })) {
      req.flash('error', `${error.msg} (${error.param})`);
    }

    const referrer = req.header('referrer');
    if (referrer) {
      return res.redirect(referrer);
    }

    res.redirect('/');
  }

  /**
   * @description Stores a location to which to return after completing an operation.
   * @protected
   * @param {Request} req Express request object.
   * @param {Response} res Express response object.
   * @param {NextFunction} next Express next function.
   * @memberof RouterBase
   */
  protected storeReturnTo(req: Request, res: Response, next: NextFunction) {

    const referrer = req.header('referrer');
    if (referrer && req.session) {
      req.session.returnTo = referrer;
    }

    next();
  }

  /**
   * @description Redirects to a previous location.
   * @protected
   * @param {Request} req Express request object.
   * @param {Response} res Express response object.
   * @returns
   * @memberof RouterBase
   */
  protected redirectToLast(req: Request, res: Response) {

    let redirectTo;

    if (req.session && req.session.returnTo) {
      redirectTo = req.session.returnTo;
      delete req.session.returnTo;
    }

    if (req.query.returnTo) {
      redirectTo = req.query.returnTo;
    } else if (!redirectTo) {
      redirectTo = req.header('referrer');
    }

    if (redirectTo) {
      return res.redirect(redirectTo);
    }

    res.redirect('/');
  }
}

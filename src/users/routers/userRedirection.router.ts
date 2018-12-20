import { Router } from 'express';
import { IRouter } from '../../routing';

/**
 * @description Router which redirects user to other routes
 *  based on their status.
 * @implements {IRouter}
 */
export class UserRedirectionRouter implements IRouter {

  /**
   * @description The application router instance.
   * @private
   * @type {Router}
   */
  private app: Router;

  /**
   * Creates an instance of UserRedirectionRouter.
   * @param systemState The system state object.
   * @param config Configuration for this router.
   * @memberof UserRedirectionRouter
   */
  public constructor(
    systemState: {
      app: Router,
    },
    private config: {
      authenticatedRedirect: string,
      anonymousRedirect: string,
      disabledUserRedirect: string,
    },
  ) {
    this.app = systemState.app;
  }

  /**
   * @description Registers the routes exposed by this router
   * @param {string} mountPoint The path under which to mount routes
   *  exposed by this router.
   */
  public registerRoutes(mountPoint: string): void {
    const router = Router();

    router.get('/', (req, res) => {
      if (req.isAuthenticated()) {
        if (!req.user.enabled) {
          return res.redirect(this.config.disabledUserRedirect);
        }
        return res.redirect(this.config.authenticatedRedirect);
      }
      return res.redirect(this.config.anonymousRedirect);
    });

    this.app.use(mountPoint, router);
  }
}

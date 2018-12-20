import { Request, Response, Router } from 'express';
import { ILogger } from '../logging';
import { RouterBase } from '../routing';
import { Audit } from './models';

/**
 * @description Controller/router class handling audit specific routes.
 * @export
 * @class AuditRouter
 * @extends {RouterBase}
 */
export class AuditRouter extends RouterBase {
  /**
   * @description The page size of any paged data.
   * @private
   * @type {number}
   * @memberof AuditRouter
   */
  private pageSize: number;

  /**
   * Creates an instance of AuditRouter.
   * @param systemState The framework state object.
   * @param config Router configuration.
   * @memberof AuditRouter
   */
  public constructor(
    systemState: {
      app: Router,
    },
    config: {
      logger: ILogger,
      pageSize: number,
    },
  ) {
    super(systemState, config);
    this.pageSize = config.pageSize;
  }

  /**
   * @description Registers the routes exposed by this router with the framework.
   * @param {string} mountPoint The mount point (URI) for this router.
   * @memberof AuditRouter
   */
  public registerRoutes(mountPoint: string): void {
    const router = Router();

    router.use((req, res, next) => {
      if (!req.user.roles.includes('admin')) {
        return res.sendStatus(401);
      }
      res.locals.nav = 'audit';
      next();
    });

    router.get(
      '/',
      (req, res) => this.renderAuditLog(req, res),
    );

    this.app.use(mountPoint, router);
  }

  /**
   * @description Renders the main audit log template.
   * @private
   * @param {Request} req Express request object.
   * @param {Response} res Express response object.
   * @memberof AuditRouter
   */
  private renderAuditLog(req: Request, res: Response): void {
    Audit.paginate(
      {},
      {
        sort: '-date',
        page: req.query.page ? req.query.page : 1,
        limit: this.pageSize,
      }).then((result) => {
        res.render('auditLog', {
          logs: result.docs,
          page: result.page,
          pages: result.pages,
        });
      }).catch((err) => {
        this.logger.error(`Error rendering auditLog: ${err}`);
        res.sendStatus(500);
      });
  }
}

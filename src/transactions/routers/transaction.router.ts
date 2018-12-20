import { Request, Response, Router } from 'express';
import { ILogger } from '../../logging';
import { RouterBase } from '../../routing';
import { Transaction } from '../models';

/**
 * @description Router/controller exposing transactions.
 * @export
 * @class TransactionRouter
 * @extends {RouterBase}
 */
export class TransactionRouter extends RouterBase {
  /**
   * @description The page size to use for paged data.
   * @private
   * @type {number}
   * @memberof TransactionRouter
   */
  private pageSize: number;

  /**
   * Creates an instance of TransactionRouter.
   * @param systemState The system state object.
   * @param config This router's configuration.
   * @memberof TransactionRouter
   */
  public constructor(
    systemState: {
      app: Router,
    },
    config: {
      pageSize: number,
      logger: ILogger,
    },
  ) {
    super(systemState, config);
    this.pageSize = config.pageSize;
  }

  /**
   * @description Registers the routes handled by this router.
   * @param {string} mountPoint The URI under which to mount the routes.
   * @memberof TransactionRouter
   */
  public registerRoutes(mountPoint: string): void {
    const router = Router();

    router.use((req, res, next) => {
      res.locals.nav = 'transactions';
      next();
    });

    router.get(
      '/',
      (req, res) => this.renderTransactions(req, res),
    );

    this.app.use(mountPoint, router);
  }

  /**
   * @description Renders the main view of transactions.
   * @private
   * @param {Request} req
   * @param {Response} res
   * @memberof TransactionRouter
   */
  private renderTransactions(req: Request, res: Response): void {
    Transaction.paginate({}, {
      sort: '-date',
      page: req.query.page ? req.query.page : 1,
      limit: this.pageSize,
      populate: ['entries.user'],
    }).then((result) => {
      res.render('transactions', {
        transactions: result.docs,
        page: result.page,
        pages: result.pages,
      });
    }).catch((err) => {
      this.logger.error(`Error rendering transactions: ${err}`);
      res.sendStatus(500);
    });
  }
}

import { NextFunction, Request, Response, Router } from 'express';
import { query } from 'express-validator/check';
import { sanitizeQuery } from 'express-validator/filter';
import { Types } from 'mongoose';
import { ILogger } from '../../logging';
import { RouterBase } from '../../routing';
import { IOrderType, Order, OrderState } from '../models';

import ObjectId = Types.ObjectId;

/**
 * @description Router/controller which handles user interactions with orders.
 * @export
 * @class OrderRouter
 * @extends {RouterBase}
 */
export class OrderRouter extends RouterBase {
  /**
   * @description Page size for paged data.
   * @private
   * @type {number}
   * @memberof OrderRouter
   */
  private pageSize: number;

  /**
   * @description The different available types of orders.
   * @private
   * @type {IOrderType[]}
   * @memberof OrderRouter
   */
  private orderTypes: IOrderType[];

  /**
   * Creates an instance of OrderRouter.
   * @param systemState The current system state object.
   * @param config The controller's configuration.
   * @memberof OrderRouter
   */
  public constructor(
    systemState: {
      app: Router,
    },
    config: {
      orderTypes: IOrderType[]
      pageSize: number,
      logger: ILogger,
    },
  ) {
    super(systemState, config);
    this.orderTypes = config.orderTypes;
    this.pageSize = config.pageSize;
  }

  /**
   * @description Registers the routes handled by this router.
   * @param {string} mountPoint The URI under which to mount the routes.
   * @memberof OrderRouter
   */
  public registerRoutes(mountPoint: string): void {
    const router = Router();

    router.use((req, res, next) => {
      res.locals.nav = 'orders';
      next();
    });

    router.get(
      '/',
      (req, res) => this.renderOrders(req, res),
    );

    router.get(
      '/join',
      query('id').exists().not().isEmpty(),
      sanitizeQuery('id').trim(),
      (req, res, next) => this.validateRequest(req, res, next),
      (req, res, next) => this.storeReturnTo(req, res, next),
      (req, res, next) => this.renderJoinOrder(req, res, next),
      (req, res) => this.redirectToLast(req, res),
    );

    router.post(
      '/join',
      query('id').exists().not().isEmpty(),
      sanitizeQuery('id').trim(),
      (req, res, next) => this.validateRequest(req, res, next),
      (req, res, next) => this.joinOrder(req, res, next),
      (req, res) => this.redirectToLast(req, res),
    );

    router.get(
      '/confirmLeave',
      query('id').exists().not().isEmpty(),
      sanitizeQuery('id').trim(),
      (req, res, next) => this.validateRequest(req, res, next),
      (req, res, next) => this.storeReturnTo(req, res, next),
      (req, res, next) => this.renderConfirmLeaveOrder(req, res, next),
      (req, res) => this.redirectToLast(req, res),
    );

    router.get(
      '/leave',
      query('id').exists().not().isEmpty(),
      sanitizeQuery('id').trim(),
      (req, res, next) => this.validateRequest(req, res, next),
      (req, res, next) => this.leaveOrder(req, res, next),
      (req, res) => this.redirectToLast(req, res),
    );

    this.app.use(mountPoint, router);
  }

  /**
   * @description Renders the main list of orders.
   * @private
   * @param {Request} req Express request object.
   * @param {Response} res Express response object.
   * @memberof OrderRouter
   */
  private renderOrders(req: Request, res: Response) {
    Order.paginate({}, {
      sort: 'state -closeDate location',
      page: req.query.page ? req.query.page : 1,
      limit: this.pageSize,
      populate: ['userOrders.user', 'purchaser'],
    }).then((result) => {
      res.render('orders', {
        user: req.user,
        orders: result.docs,
        page: result.page,
        pages: result.pages,
      });
    }).catch((err) => {
      this.logger.error(`Error rendering orders: ${err}`);
      res.sendStatus(500);
    });
  }

  /**
   * @description Joins the current user to the specified order.
   * @private
   * @param {Request} req Express request object.
   * @param {Response} res Express response object.
   * @param {NextFunction} next Express next function.
   * @memberof OrderRouter
   */
  private joinOrder(req: Request, res: Response, next: NextFunction) {
    Order.findOne({
      '_id': ObjectId(req.query.id),
      'state': {
        $in: [OrderState.Open, OrderState.Closing],
      },
      'userOrders.user': {
        $nin: [req.user._id],
      },
    }).populate('userOrders.user').exec().then((order) => {
      if (!order) {
        throw new Error('Order is null');
      }

      const thisOrderType = this.orderTypes.find((x) => x.name === order.location);
      if (!thisOrderType) {
        throw new Error(`Failed to find order type for order ${order._id}`);
      }

      const details: string[] = [];
      for (const orderField of thisOrderType.fields) {
        const fieldValue = req.body[orderField.name];
        if (!fieldValue) {
          throw new Error(`Value ${orderField.name} was not provided`);
        }

        details.push(`${orderField.name}: ${fieldValue}`);
      }

      order.userOrders.push({
        user: req.user,
        details,
      });

      return order.save();
    }).then(() => req.flash('success', 'Successfully joined order')).catch((err) => {
      this.logger.error(`Error joining order: ${err}`);
      req.flash('error', 'Failed to join order; it may already be closed');
    }).then(() => next());
  }

  /**
   * @description Renders the confirmation to leave order page.
   * @private
   * @param {Request} req Express request object.
   * @param {Response} res Express response object.
   * @param {NextFunction} next Express next function.
   * @memberof OrderRouter
   */
  private renderConfirmLeaveOrder(req: Request, res: Response, next: NextFunction): void {
    Order.findOne({
      _id: ObjectId(req.query.id),
      state: {
        $in: [OrderState.Open, OrderState.Closing],
      },
      userOrders: {
        $elemMatch: {
          user: ObjectId(req.user._id),
        },
      },
    }).then((order) => {
      if (!order) {
        throw new Error('Order is null');
      }
      const referrer = req.header('referrer');
      res.render('confirmLeaveOrder', {
        order,
        returnTo: referrer ? referrer : '/',
      });
    }).catch((err) => {
      this.logger.error(`Error rendering confirmLeaveOrder: ${err}`);
      req.flash('error', 'Failed to load order');
      next();
    });
  }

  /**
   * @description Renders the join order page.
   * @private
   * @param {Request} req Express request object.
   * @param {Response} res Express response object.
   * @param {NextFunction} next Express next function.
   * @memberof OrderRouter
   */
  private renderJoinOrder(req: Request, res: Response, next: NextFunction): void {
    Order.findOne({
      _id: ObjectId(req.query.id),
      state: {
        $in: [OrderState.Open, OrderState.Closing],
      },
    }).exec().then((order) => {
      if (!order) {
        throw new Error('Order is null');
      }
      res.render('joinOrder', {
        order,
        orderDefinition: this.orderTypes.find((x) => x.name === order.location),
      });
    }).catch((err) => {
      this.logger.error(`Error rendering joinOrder: ${err}`);
      req.flash('error', 'Failed to load order');
      next();
    });
  }

  /**
   * @description Removes the requesting user from the specified order.
   * @private
   * @param {Request} req Express request object.
   * @param {Response} res Express response object.
   * @param {NextFunction} next Express next function.
   * @memberof OrderRouter
   */
  private leaveOrder(req: Request, res: Response, next: NextFunction): void {
    Order.findOneAndUpdate(
      {
        _id: ObjectId(req.query.id),
        state: {
          $in: [OrderState.Open, OrderState.Closing],
        },
        userOrders: {
          $elemMatch: {
            user: ObjectId(req.user._id),
          },
        },
      },
      {
        $pull: {
          userOrders: {
            user: ObjectId(req.user._id),
          },
        },
      },
    ).then((order) => {
      if (!order) {
        throw new Error('Order is null');
      }

      req.flash('success', 'Successfully left order');
    }).catch((err) => {
      this.logger.error(`Error leaving order: ${err}`);
      req.flash('error', 'Failed to leave order; it may already be closed');
    }).then(() => next());
  }
}

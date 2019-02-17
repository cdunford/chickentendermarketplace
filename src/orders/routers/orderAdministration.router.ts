import * as Agenda from 'agenda';
import { NextFunction, Request, Response, Router } from 'express';
import { body, query } from 'express-validator/check';
import { sanitizeQuery } from 'express-validator/filter';
import * as moment from 'moment';
import { ClientSession } from 'mongodb';
import { startSession, Types } from 'mongoose';
import { audit } from '../../audit';
import { ILogger } from '../../logging';
import { IMailer } from '../../mailing';
import { RouterBase } from '../../routing';
import { ITransaction, Transaction } from '../../transactions';
import { User } from '../../users';
import { IOrder, IOrderType, Order, OrderState } from '../models';

import ObjectId = Types.ObjectId;

/**
 * @description Router/controller providing order administrative functionality to users
 *  with the order-creator role.
 * @export
 * @class OrderAdministrationRouter
 * @extends {RouterBase}
 */
export class OrderAdministrationRouter extends RouterBase {
  /**
   * @description The available types of orders.
   * @private
   * @type {IOrderType[]}
   * @memberof OrderAdministrationRouter
   */
  private orderTypes: IOrderType[];

  /**
   * @description A mailer service instance for sending mail.
   * @private
   * @type {IMailer}
   * @memberof OrderAdministrationRouter
   */
  private mailer: IMailer;

  /**
   * @description The time before an order closes in which it changes state to closing.
   * @private
   * @type {number}
   * @memberof OrderAdministrationRouter
   */
  private orderCloseTimeout: number;

  /**
   * @description Agenda scheduler service.
   * @private
   * @type {Agenda}
   * @memberof OrderAdministrationRouter
   */
  private agenda: Agenda;

  /**
   * Creates an instance of OrderAdministrationRouter.
   * @param systemState Current system state object.
   * @param config Controller configuration.
   * @memberof OrderAdministrationRouter
   */
  public constructor(
    systemState: {
      app: Router,
      agenda: Agenda;
    },
    config: {
      orderTypes: IOrderType[],
      logger: ILogger,
      mailer: IMailer,
      orderCloseTimeout: number,
    },
  ) {
    super(systemState, config);
    this.orderTypes = config.orderTypes;
    this.mailer = config.mailer;
    this.orderCloseTimeout = config.orderCloseTimeout;
    this.agenda = systemState.agenda;

    this.agenda.define('closingOrder', (job, done) => {
      job.remove();
      const orderId = job.attrs.data as ObjectId;

      Order.findOneAndUpdate(
        {
          _id: orderId,
          state: OrderState.Open,
        },
        {
          $set: {
            state: OrderState.Closing,
          },
        },
      ).populate('userOrders.user').exec().then((order) => {
        if (!order) {
          throw new Error(`Failed to update order state to closing: ${orderId}`);
        }

        return this.mailer.sendMail(
          'orderClosing',
          {
            order,
            closingTime: moment.duration(this.orderCloseTimeout, 'milliseconds').asMinutes(),
          },
          User.find({
            enabled: true,
            _id: {
              $nin: order.userOrders.map((userOrder) => userOrder.user._id),
            },
          }),
        ).catch((err) => this.logger.error(`Error sending orderClosing email: ${err}`));
      }).then(() => {
        return this.agenda.schedule(
          moment().add(this.orderCloseTimeout, 'milliseconds').toDate(),
          'closeOrder',
          orderId as Agenda.JobAttributesData,
        );
      }).catch((err) => this.logger.error(`Error in 'orderClosing' job: ${err}`))
        .then(() => done());
    });

    this.agenda.define('closeOrder', (job, done) => {
      job.remove();
      this.closeOrderById(job.attrs.data as ObjectId)
        .catch((err) => this.logger.error(`Error in 'closeOrder' job: ${err}`))
        .then(() => done());
    });
  }

  /**
   * @description Registers the routes exposed by this controller/router.
   * @param {string} mountPoint The URI under which to mount the routes.
   * @memberof OrderAdministrationRouter
   */
  public registerRoutes(mountPoint: string): void {
    const router = Router();

    router.use((req, res, next) => {
      if (!req.user.roles.includes('order-creator')) {
        return res.sendStatus(401);
      }
      res.locals.nav = 'orders';
      next();
    });

    router.get(
      '/create',
      (req, res, next) => this.storeReturnTo(req, res, next),
      (req, res, next) => this.renderCreateOrder(req, res, next),
    );

    router.post(
      '/create',
      body('type').exists().isIn(this.orderTypes.map((val) => val.name)),
      body('closeDate').exists().toDate().isAfter((new Date()).toISOString()),
      (req, res, next) => this.validateRequest(req, res, next),
      (req, res, next) => this.createOrder(req, res, next),
      (req, res) => this.redirectToLast(req, res),
    );

    router.get(
      '/confirmClose',
      query('id').exists().not().isEmpty(),
      sanitizeQuery('id').trim(),
      (req, res, next) => this.validateRequest(req, res, next),
      (req, res, next) => this.storeReturnTo(req, res, next),
      (req, res, next) => this.renderConfirmClose(req, res, next),
      (req, res) => this.redirectToLast(req, res),
    );

    router.get(
      '/confirmCancel',
      query('id').exists().not().isEmpty(),
      sanitizeQuery('id').trim(),
      (req, res, next) => this.validateRequest(req, res, next),
      (req, res, next) => this.storeReturnTo(req, res, next),
      (req, res, next) => this.renderConfirmCancel(req, res, next),
      (req, res) => this.redirectToLast(req, res),
    );

    router.get(
      '/close',
      query('id').exists().not().isEmpty(),
      sanitizeQuery('id').trim(),
      (req, res, next) => this.validateRequest(req, res, next),
      (req, res, next) => this.closeOrder(req, res, next),
      (req, res) => this.redirectToLast(req, res),
    );

    router.get(
      '/cancel',
      query('id').exists().not().isEmpty(),
      sanitizeQuery('id').trim(),
      (req, res, next) => this.validateRequest(req, res, next),
      (req, res, next) => this.cancelOrder(req, res, next),
      (req, res) => this.redirectToLast(req, res),
    );

    router.get(
      '/log',
      query('id').exists().not().isEmpty(),
      sanitizeQuery('id').trim(),
      (req, res, next) => this.validateRequest(req, res, next),
      (req, res, next) => this.storeReturnTo(req, res, next),
      (req, res, next) => this.renderLogOrder(req, res, next),
      (req, res) => this.redirectToLast(req, res),
    );

    router.post(
      '/log',
      query('id').exists().not().isEmpty(),
      sanitizeQuery('id').trim(),
      body('purchaser').exists().not().isEmpty(),
      (req, res, next) => this.validateRequest(req, res, next),
      (req, res, next) => this.logOrder(req, res, next),
      (req, res) => this.redirectToLast(req, res),
    );

    this.app.use(mountPoint, router);
  }

  /**
   * @description Renders the create order page.
   * @private
   * @param {Request} req Express request object.
   * @param {Response} res Express response object.
   * @param {NextFunction} next Express next function.
   * @memberof OrderAdministrationRouter
   */
  private renderCreateOrder(req: Request, res: Response, next: NextFunction) {
    res.render('createOrder', {
      types: this.orderTypes,
    });
  }

  /**
   * @description Creates an order with the requested data
   * @private
   * @param {Request} req Express request object.
   * @param {Response} res Express response object.
   * @param {NextFunction} next Express next function.
   * @memberof OrderAdministrationRouter
   */
  private createOrder(req: Request, res: Response, next: NextFunction) {

    const typeConfig = this.orderTypes.find((type) => type.name === req.body.type);
    const closeDate = new Date(req.body.closeDate);

    const order = new Order({
      location: req.body.type,
      description: typeConfig ? typeConfig.description : '',
      cost: typeConfig ? typeConfig.cost : 1,
      closeDate,
      openDate: new Date(),
      state: OrderState.Open,
    });

    order.save()
      .then((newOrder) => {
        req.flash('success', 'Created new order');

        let closingTime = moment(closeDate).subtract(this.orderCloseTimeout, 'milliseconds').toDate();
        const now = new Date();
        if (closingTime < now) {
          closingTime = now;
        }

        return this.mailer.sendMail(
          'orderCreated',
          {
            order: newOrder,
          },
          User.find({ enabled: true }),
        ).catch((err) => this.logger.error(`Failed to send order creation email: ${err}`))
          .then(() => {
            return this.agenda.schedule(
              closingTime,
              'closingOrder',
              newOrder._id as Agenda.JobAttributesData,
            );
          }).catch((err) => this.logger.error(`Failed to schedule closingOrder job: ${err}`));
      }).catch((err) => {
        this.logger.error(`Error creating order: ${err}`);
        req.flash('error', 'Failed to create new order');
      }).then(() => next());
  }

  /**
   * @description Renders the confirmation to close order page.
   * @private
   * @param {Request} req Express request object.
   * @param {Response} res Express response object.
   * @param {NextFunction} next Express next function.
   * @memberof OrderAdministrationRouter
   */
  private renderConfirmClose(req: Request, res: Response, next: NextFunction): void {
    Order.findOne({
      _id: ObjectId(req.query.id),
      state: {
        $in: [OrderState.Open, OrderState.Closing],
      },
    }).exec().then((order) => {
      if (!order) {
        throw new Error(`Order not found: ${req.query.id}`);
      }

      const referrer = req.header('referrer');
      res.render('confirmCloseOrder', {
        order,
        returnTo: referrer ? referrer : '/',
      });
    }).catch((err) => {
      this.logger.error(`Error rendering confirmCloseOrder: ${err}`);
      req.flash('error', 'Failed to load order');
      next();
    });
  }

  /**
   * @description Renders the confirmation to cancel order page.
   * @private
   * @param {Request} req Express request object.
   * @param {Response} res Express response object.
   * @param {NextFunction} next Express next function.
   * @memberof OrderAdministrationRouter
   */
  private renderConfirmCancel(req: Request, res: Response, next: NextFunction): void {
    Order.findOne({
      _id: ObjectId(req.query.id),
      state: {
        $in: [OrderState.Open, OrderState.Closing, OrderState.Closed],
      },
    }).exec().then((order) => {
      if (!order) {
        throw new Error(`Order not found: ${req.query.id}`);
      }

      const referrer = req.header('referrer');
      res.render('confirmCancelOrder', {
        order,
        returnTo: referrer ? referrer : '/',
      });
    }).catch((err) => {
      this.logger.error(`Error rendering confirmCloseOrder: ${err}`);
      req.flash('error', 'Failed to load order');
      next();
    });
  }

  /**
   * @description Closes a specified order.
   * @private
   * @param {Request} req Express request object.
   * @param {Response} res Express response object.
   * @param {NextFunction} next Express next function.
   * @memberof OrderAdministrationRouter
   */
  private closeOrder(req: Request, res: Response, next: NextFunction): void {
    const id = ObjectId(req.query.id);
    this.closeOrderById(id)
      .then(() => req.flash('success', 'Order successfully closed'))
      .then(() => {
        this.agenda.cancel({
          name: {
            $in: ['closingOrder', 'closeOrder'],
          },
          data: id,
        });
      }).catch((err) => {
        req.flash('error', 'Failed to close order');
        this.logger.error(`Error closing order: ${err}`);
      }).then(() => next());
  }

  /**
   * @description Cancels a specified order.
   * @private
   * @param {Request} req Express request object.
   * @param {Response} res Express response object.
   * @param {NextFunction} next Express next function.
   * @memberof OrderAdministrationRouter
   */
  private cancelOrder(req: Request, res: Response, next: NextFunction): void {
    Order.findOneAndUpdate(
      {
        _id: ObjectId(req.query.id),
        state: {
          $in: [OrderState.Open, OrderState.Closing, OrderState.Closed],
        },
      },
      {
        $set: {
          state: OrderState.Cancelled,
          userOrders: [],
          closeDate: new Date(),
        },
      },
    ).exec().then(() => {
      this.agenda.cancel({
        name: {
          $in: ['closingOrder', 'closeOrder'],
        },
        data: ObjectId(req.query.id),
      });
    }).then(() => req.flash('success', 'Order successfully canceled'))
      .catch((err) => {
        req.flash('error', 'Failed to cancel order');
        this.logger.error(`Error canceling order: ${err}`);
      }).then(() => next());
  }

  /**
   * @description Closes the given order by id.
   * @private
   * @param {ObjectId} id The order's ID.
   * @returns {Promise<IOrder>} A promise resolved when the order is closed.
   * @memberof OrderAdministrationRouter
   */
  private closeOrderById(id: ObjectId): Promise<IOrder> {
    return Order.findOne(
      {
        _id: id,
        state: {
          $in: [OrderState.Open, OrderState.Closing],
        },
      },
    ).exec().then((order) => {
      if (!order) {
        throw new Error('Order is null');
      }

      order.state = order.userOrders.length > 0 ? OrderState.Closed : OrderState.Cancelled;
      order.closeDate = new Date();

      return order.save();
    });
  }

  /**
   * @description Renders the page to log/archive an order.
   * @private
   * @param {Request} req Express request object.
   * @param {Response} res Express response object.
   * @param {NextFunction} next Express next function.
   * @memberof OrderAdministrationRouter
   */
  private renderLogOrder(req: Request, res: Response, next: NextFunction) {
    Order.findOne({
      _id: ObjectId(req.query.id),
      state: OrderState.Closed,
    }).populate('userOrders.user').exec().then((order) => {
      if (!order) {
        throw new Error(`Order not found: ${req.query.id}`);
      }

      res.render('logOrder', {
        order,
      });
    }).catch((err) => {
      this.logger.error(`Error rendering logOrder: ${err}`);
      req.flash('error', 'Failed to load order');
      next();
    });
  }

  /**
   * @description Logs/archives the specified order.
   * @private
   * @param {Request} req Express request object.
   * @param {Response} res Express response object.
   * @param {NextFunction} next Express next function.
   * @memberof OrderAdministrationRouter
   */
  private logOrder(req: Request, res: Response, next: NextFunction) {
    let session: ClientSession;
    let order: IOrder;
    let transaction: ITransaction;

    startSession().then((s) => {
      session = s;
      session.startTransaction();

      return Order.findOne({
        _id: req.query.id,
        state: OrderState.Closed,
      }).session(session).populate('userOrders.user').exec();
    }).then((o) => {
      if (!o) {
        throw new Error(`Unable to find order: ${req.query.id}`);
      }

      order = o;

      return User.findByIdAndUpdate(req.body.purchaser, {
        $inc: {
          coins: order.cost * (order.userOrders.length - 1),
        },
      }).session(session).exec();
    }).then((purchaser) => {
      if (!purchaser) {
        return Promise.reject('Order purchaser not found');
      }

      order.purchaser = purchaser;
      return Promise.all(order.userOrders
        .filter((userOrder) => {
          if (!purchaser) {
            return true;
          }
          return !purchaser.equals(userOrder.user);
        })
        .map((userOrder) => {
          userOrder.user.coins -= order.cost;
          return userOrder.user.save();
        }));
    }).then(() => {
      order.state = OrderState.Archived;
      return order.save();
    }).then(() => {
      const purchaserStr = order.purchaser
        ? `${order.purchaser.firstName} ${order.purchaser.lastName},${order.purchaser._id}`
        : `null`;

      const participants = order.userOrders
        .map((userOrder) => `(${userOrder.user.firstName} ${userOrder.user.lastName},${userOrder.user._id})`)
        .join(',');

      return audit(
        session,
        `Logged order (${order.closeDate},${order.location},Cost:${order.cost},${order._id}); ` +
        `purchaser was (${purchaserStr}); ` +
        `participants: [${participants}]`,
      );
    }).then(() => {
      if (!order.purchaser) {
        return Promise.reject('Order does not have a purchaser');
      }

      const purchaserEntry = {
        user: order.purchaser,
        previousValue: order.purchaser.coins,
        newValue: order.purchaser.coins + (order.cost * (order.userOrders.length - 1)),
      };

      const entries = order.userOrders.filter((userOrder) => {
        if (!order.purchaser) {
          return true;
        }
        return !order.purchaser.equals(userOrder.user);
      }).map((userOrder) => {
        return {
          user: userOrder.user,
          previousValue: userOrder.user.coins + order.cost,
          newValue: userOrder.user.coins,
        };
      });

      return Transaction.create([{
        description: 'Logged order',
        date: new Date(),
        entries: [purchaserEntry, ...entries],
      }], {
          session,
        });
    }).then((t) => transaction = t[0])
      .then(() => session.commitTransaction())
      .then(() => req.flash('success', 'Successfully logged order'))
      .then(() => {
        return Order.findById(req.query.id).populate('userOrders.user').populate('purchaser').exec();
      }).then((updatedOrder) => {
        return this.mailer.sendMail(
          'loggedOrder',
          {
            order: updatedOrder,
            transaction,
          },
          order.userOrders.map((x) => x.user.email),
          User.find({
            roles: 'order-creator',
          }),
        ).catch((err) => this.logger.error(`Failed to send loggedOrder email: ${err}`));
      }).catch((err) => {
        this.logger.error(`Failed to logOrder: ${err}`);
        req.flash('error', 'Failed to log order');
        session.abortTransaction();
      }).then(() => next());
  }
}

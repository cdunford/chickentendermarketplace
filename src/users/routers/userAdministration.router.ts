import { NextFunction, Request, Response, Router } from 'express';
import { body, query } from 'express-validator/check';
import { sanitizeQuery } from 'express-validator/filter';
import { ClientSession } from 'mongodb';
import { startSession, Types } from 'mongoose';
import { audit } from '../../audit';
import { ILogger } from '../../logging';
import { IMailer } from '../../mailing';
import { RouterBase } from '../../routing';
import { Transaction } from '../../transactions';
import { IUser, User } from '../models';

import ObjectId = Types.ObjectId;

/**
 * @description Describes configuration for the {@see UserAdministrationRouter}.
 * @interface IUserAdministrationRouterConfig
 */
interface IUserAdministrationRouterConfig {
  /**
   * @description List of available OAuth providers.
   */
  oAuthProviders: [
    {
      name: string,
    }
  ];

  /**
   * @description System logging service.
   */
  logger: ILogger;

  /**
   * @description System mailing service.
   */
  mailer: IMailer;
}

/**
 * @description Router/controller providing routes for administering users that can
 *  be accessed by users with the admin role.
 */
export class UserAdministrationRouter extends RouterBase {

  /**
   * Creates an instance of UserAdministrationRouter.
   * @param systemState The system state object.
   * @param {IUserAdministrationRouterConfig} config Thiis controller's configuration.
   */
  public constructor(
    systemState: {
      app: Router,
    },
    private config: IUserAdministrationRouterConfig,
  ) {
    super(systemState, config);
  }

  /**
   * @description Registers the routes exposed by this router.
   * @param {string} mountPoint The path under which to mount the routes.
   */
  public registerRoutes(mountPoint: string): void {
    const router = Router();

    router.use((req, res, next) => {
      if (!req.user.roles.includes('admin')) {
        return res.sendStatus(401);
      }
      res.locals.nav = 'users';
      next();
    });

    router.get('/enable',
      query('id').exists().not().isEmpty(),
      sanitizeQuery('id').trim(),
      (req, res, next) => this.validateRequest(req, res, next),
      (req, res, next) => this.enableUser(req, res, next),
      (req, res) => this.redirectToLast(req, res));

    router.get('/disable',
      query('id').exists().not().isEmpty(),
      sanitizeQuery('id').trim(),
      (req, res, next) => this.validateRequest(req, res, next),
      (req, res, next) => this.disableUser(req, res, next),
      (req, res) => this.redirectToLast(req, res));

    router.get(
      '/confirmDelete',
      query('id').exists().not().isEmpty(),
      (req, res, next) => this.validateRequest(req, res, next),
      (req, res, next) => this.storeReturnTo(req, res, next),
      (req, res, next) => this.renderConfirmDelete(req, res, next),
      (req, res) => this.redirectToLast(req, res),
    );

    router.get(
      '/delete',
      query('id').exists().not().isEmpty(),
      (req, res, next) => this.validateRequest(req, res, next),
      (req, res, next) => this.deleteUser(req, res, next),
      (req, res) => this.redirectToLast(req, res),
    );

    router.get('/setCoins',
      query('id').exists().not().isEmpty(),
      sanitizeQuery('id').trim(),
      (req, res, next) => this.validateRequest(req, res, next),
      (req, res, next) => this.storeReturnTo(req, res, next),
      (req, res, next) => this.renderSetCoins(req, res, next),
      (req, res) => this.redirectToLast(req, res));

    router.post('/setCoins',
      query('id').exists().not().isEmpty(),
      body('coins').isInt(),
      sanitizeQuery('id').trim(),
      (req, res, next) => this.validateRequest(req, res, next),
      (req, res, next) => this.setCoins(req, res, next),
      (req, res) => this.redirectToLast(req, res));

    router.get('/setOAuthProvider',
      query('id').exists().not().isEmpty(),
      sanitizeQuery('id').trim(),
      (req, res, next) => this.validateRequest(req, res, next),
      (req, res, next) => this.storeReturnTo(req, res, next),
      (req, res, next) => this.renderSetOAuthProvider(req, res, next),
      (req, res) => this.redirectToLast(req, res));

    router.post('/setOAuthProvider',
      query('id').exists(),
      body('id').exists().not().isEmpty(),
      body('provider').exists().isIn(this.config.oAuthProviders.map((val) => val.name)),
      sanitizeQuery('id').trim(),
      (req, res, next) => this.validateRequest(req, res, next),
      (req, res, next) => this.setOAuthProvider(req, res, next),
      (req, res) => this.redirectToLast(req, res));

    router.get(
      '/setRoles',
      query('id').exists().not().isEmpty(),
      sanitizeQuery('id').trim(),
      (req, res, next) => this.validateRequest(req, res, next),
      (req, res, next) => this.storeReturnTo(req, res, next),
      (req, res, next) => this.renderSetRoles(req, res, next),
      (req, res) => this.redirectToLast(req, res),
    );

    router.post(
      '/setRoles',
      query('id').exists().not().isEmpty(),
      sanitizeQuery('id').trim(),
      (req, res, next) => this.validateRequest(req, res, next),
      (req, res, next) => this.setRoles(req, res, next),
      (req, res) => this.redirectToLast(req, res),
    );

    this.app.use(mountPoint, router);
  }

  /**
   * @description Updates a user's OAuth provider details.
   * @private
   * @param {Request} req Express request object.
   * @param {Response} res Express response object.
   * @param {NextFunction} next Express next function.
   */
  private setOAuthProvider(req: Request, res: Response, next: NextFunction) {
    User.findOneAndUpdate(
      {
        '_id': ObjectId(req.query.id),
        'oAuthIds.authType': {
          $nin: [req.body.provider],
        },
      },
      {
        $push: {
          oAuthIds: {
            authType: req.body.provider,
            id: req.body.id,
          },
        },
      }).exec().then((user) => {
        if (!user) {
          return User.findOneAndUpdate(
            {
              '_id': ObjectId(req.query.id),
              'oAuthIds.authType': req.body.provider,
            },
            {
              'oAuthIds.$.id': req.body.id,
            },
          ).exec();
        }
        return user;
      }).then((user) => {
        if (!user) {
          throw new Error('User not found');
        }
        req.flash('success', `Set OAuth provider '${req.body.provider}' for ${user.firstName} ${user.lastName}`);
      }).catch((err) => {
        this.logger.error(`Error updating OAuth data: ${err}`);
        req.flash('error', 'Failed to set OAuth provider information');
      }).then(() => next());
  }

  /**
   * @description Renders the page allowing the admin to set OAuth details
   *  for a user.
   * @private
   * @param {Request} req Express request object.
   * @param {Response} res Express response object.
   * @param {NextFunction} next Express next function.
   */
  private renderSetOAuthProvider(req: Request, res: Response, next: NextFunction) {
    User.findById(req.query.id).exec().then((user) => {
      res.render('setOAuthProvider', {
        targetUser: user,
        oAuthProviders: this.config.oAuthProviders,
      });
    }).catch((err) => {
      this.logger.error(`Error rendering setOAuthProvider: ${err}`);
      req.flash('error', 'Failed to load user');
      next();
    });
  }

  /**
   * @description Forcibly sets a user's coin balance.
   * @private
   * @param {Request} req Express request object.
   * @param {Response} res Express response object.
   * @param {NextFunction} next Express next function.
   */
  private setCoins(req: Request, res: Response, next: NextFunction): void {

    let session: ClientSession;
    startSession().then((s) => {
      session = s;
      session.startTransaction();
      return User.findByIdAndUpdate(req.query.id, {
        $set: {
          coins: req.body.coins,
        },
      }).session(session).exec();
    }).then((user) => {
      if (!user) {
        throw new Error('User not found');
      }
      req.flash('success', `Set coins to ${req.body.coins} for ${user.firstName} ${user.lastName}`);
      return this.sendAdminUserEmail(
        'userCoinsSet',
        user,
        {
          admin: req.user,
          coins: req.body.coins,
        },
      ).then(() => user);
    }).then((user) => {
      return audit(
        session,
        `Admin user (${req.user.firstName} ${req.user.lastName},${req.user._id}) set coins to ` +
        `${req.body.coins} for user (${user.firstName} ${user.lastName},${user._id})`,
      ).then(() => user);
    }).then((user) => {
      return Transaction.create([{
        description: 'Forced coin update',
        date: new Date(),
        entries: [{
          user,
          previousValue: user.coins,
          newValue: req.body.coins,
        }],
      }], {
          session,
        });
    }).then(() => session.commitTransaction())
      .catch((err) => {
        this.logger.error(`Error updating user coins: ${err}`);
        req.flash('error', 'Failed to update coins');
        session.abortTransaction();
      }).then(() => next());
  }

  /**
   * @description Renders the page allowing the admin user to set a user's coin balance.
   * @private
   * @param {Request} req Express request object.
   * @param {Response} res Express response object.
   * @param {NextFunction} next Express next function.
   */
  private renderSetCoins(req: Request, res: Response, next: NextFunction): void {
    User.findById(req.query.id).exec().then((user) => {
      res.render('setUserCoins', {
        targetUser: user,
      });
    }).catch((err) => {
      this.logger.error(`Error rendering setUserCoins: ${err}`);
      req.flash('error', 'Failed to load user');
      next();
    });
  }

  /**
   * @description Renders the page allowing the admin user to change a user's roles.
   * @private
   * @param {Request} req Express request object.
   * @param {Response} res Express response object.
   * @param {NextFunction} next Express next function.
   */
  private renderSetRoles(req: Request, res: Response, next: NextFunction): void {
    User.findById(req.query.id).exec().then((user) => {
      res.render('setRoles', {
        targetUser: user,
      });
    }).catch((err) => {
      this.logger.error(`Error rendering setRoles: ${err}`);
      req.flash('error', 'Failed to load user');
      next();
    });
  }

  /**
   * @description Updates a user's roles.
   * @private
   * @param {Request} req Express request object.
   * @param {Response} res Express response object.
   * @param {NextFunction} next Express next function.
   */
  private setRoles(req: Request, res: Response, next: NextFunction): void {
    const roles = req.body.roles ? req.body.roles : [];
    const newRoles = roles.filter((element: string) => element.trim().length > 0);
    User.findByIdAndUpdate(req.query.id, {
      $set: {
        roles: newRoles,
      },
    }).exec().then((user) => {
      if (!user) {
        throw new Error('User not found');
      }
      req.flash('success', `Successfully set new roles for user ${user.firstName} ${user.lastName}`);
    }).catch((err) => {
      this.logger.error(`Error setting roles for user: ${err}`);
      req.flash('error', 'Failed to update roles');
    }).then(() => next());
  }

  /**
   * @description Renders the page requesting confirmation to delete a user.
   * @private
   * @param {Request} req Express request object.
   * @param {Response} res Express response object.
   * @param {NextFunction} next Express next function.
   */
  private renderConfirmDelete(req: Request, res: Response, next: NextFunction): void {
    User.findById(req.query.id).exec().then((user) => {
      const referrer = req.header('referrer');
      res.render('confirmDeleteUser', {
        targetUser: user,
        returnTo: referrer ? referrer : '/',
      });
    }).catch((err) => {
      this.logger.error(`Error rendering confirmDeleteUser: ${err}`);
      req.flash('error', 'Failed to load user');
      next();
    });
  }

  /**
   * @description Sets a user to 'enabled'.
   * @private
   * @param {Request} req Express request object.
   * @param {Response} res Express response object.
   * @param {NextFunction} next Express next function.
   */
  private enableUser(req: Request, res: Response, next: NextFunction): void {
    User.findByIdAndUpdate(req.query.id, {
      $set: {
        enabled: true,
        activated: true,
      },
    }).exec().then((user) => {
      if (!user) {
        throw new Error('User not found');
      }
      req.flash('success', `Successfully enabled user ${user.firstName} ${user.lastName}`);

      return this.sendAdminUserEmail('userEnabled', user);
    }).catch((err) => {
      this.logger.error(`Error enabling user: ${err}`);
      req.flash('error', 'Failed to enable user');
    }).then(() => next());
  }

  /**
   * @description Sets a user to 'disabled'.
   * @private
   * @param {Request} req Express request object.
   * @param {Response} res Express response object.
   * @param {NextFunction} next Express next function.
   */
  private disableUser(req: Request, res: Response, next: NextFunction): void {
    User.findByIdAndUpdate(req.query.id, {
      $set: {
        enabled: false,
      },
    }).exec().then((user) => {
      if (!user) {
        throw new Error('User not found');
      }
      req.flash('success', `Successfully disabled user ${user.firstName} ${user.lastName}`);
    }).catch((err) => {
      this.logger.error(`Error disabling user: ${err}`);
      req.flash('error', 'Failed to disable user');
    }).then(() => next());
  }

  /**
   * @description Delete's a user from the system.
   * @private
   * @param {Request} req Express request object.
   * @param {Response} res Express response object.
   * @param {NextFunction} next Express next function.
   */
  private deleteUser(req: Request, res: Response, next: NextFunction): void {
    User.findOneAndRemove({
      _id: ObjectId(req.query.id),
      enabled: false,
    }).exec().then((user) => {
      if (!user) {
        throw new Error('User not found');
      }
      req.flash('success', `Successfully deleted user ${user.firstName} ${user.lastName}`);
    }).catch((err) => {
      this.logger.error(`Error deleting user: ${err}`);
      req.flash('error', 'Failed to delete user');
    }).then(() => next());
  }

  /**
   * @description Helper function to send an email to a user in which
   *  all admin users are CC'd.
   * @private
   * @param {string} template The email template to render.
   * @param {IUser} user The user to send the email to.
   * @param {*} [additionalContext] Any additional context needed to render the email.
   * @returns {Promise<void>} Resolved when the email is sent.
   */
  private sendAdminUserEmail(template: string, user: IUser, additionalContext?: any): Promise<void> {
    return this.config.mailer.sendMail(
      template,
      {
        user,
        ...additionalContext,
      },
      [user.email],
      User.find({
        roles: 'admin',
      }),
    ).catch((err) => this.logger.error(`Error sending email template ${template}: ${err}`));
  }
}

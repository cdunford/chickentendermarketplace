import { NextFunction, Request, Response, Router } from 'express';
import { body, query } from 'express-validator/check';
import { sanitizeBody, sanitizeQuery } from 'express-validator/filter';
import { emptyDir, pathExists, unlink, writeFile } from 'fs-extra';
import { extension } from 'mime-types';
import { ClientSession } from 'mongodb';
import mongoose = require('mongoose');
import * as multer from 'multer';
import { join } from 'path';
import * as uuid from 'uuid/v4';
import { audit } from '../../audit';
import { ILogger } from '../../logging';
import { IMailer } from '../../mailing';
import { RouterBase } from '../../routing';
import { Transaction } from '../../transactions';
import { IUser, User } from '../models';

/**
 * @description Router/controller exposing functionality related to users.
 * @export
 * @class UserRouter
 * @extends {RouterBase}
 */
export class UserRouter extends RouterBase {

  /**
   * @description Multer instance for uploading files.
   * @private
   * @type {multer.Instance}
   * @memberof UserRouter
   */
  private upload: multer.Instance;

  /**
   * @description Page size to use for paged data.
   * @private
   * @type {number}
   * @memberof UserRouter
   */
  private pageSize: number;

  /**
   * @description Mailer service for sending mail.
   * @private
   * @type {IMailer}
   * @memberof UserRouter
   */
  private mailer: IMailer;

  /**
   * @description Path where avatar files are saved.
   * @private
   * @type {string}
   * @memberof UserRouter
   */
  private avatarPath: string;

  /**
   * Creates an instance of UserRouter.
   * @param systemState The current system state.
   * @param config This router's configuration.
   * @memberof UserRouter
   */
  public constructor(
    systemState: {
      app: Router,
    },
    config: {
      maxAvatarSize: number,
      pageSize: number,
      logger: ILogger,
      mailer: IMailer,
      avatarPath: string,
    },
  ) {
    super(systemState, config);

    this.upload = multer({
      storage: multer.memoryStorage(),
      limits: {
        fileSize: config.maxAvatarSize,
      },
      fileFilter: (req, file, cb) => this.validateAvatarFile(req, file, cb),
    });

    this.pageSize = config.pageSize;
    this.mailer = config.mailer;
    this.avatarPath = config.avatarPath;

    pathExists(this.avatarPath).then((exists) => {
      if (!exists) {
        emptyDir(this.avatarPath);
      }
    });
  }

  /**
   * @description Registers the routes exposed by this controller.
   * @param {string} mountPoint The URI under which to mount the routes.
   * @memberof UserRouter
   */
  public registerRoutes(mountPoint: string): void {
    const router = Router();

    router.get('/profiles', (req, res) => this.renderUsers(req, res));
    router.get('/wealth', (req, res) => this.renderUserWealth(req, res));
    router.get('/editProfile', (req, res) => this.renderEditProfile(req, res));

    router.post('/editProfile',
      this.upload.single('avatar'),
      body('firstName').exists().not().isEmpty().isAlpha(),
      body('lastName').exists().not().isEmpty().isAlpha(),
      body('email').exists().not().isEmpty().isEmail(),
      sanitizeBody('firstName').trim(),
      sanitizeBody('lastName').trim(),
      sanitizeBody('email').trim(),
      (req, res, next) => this.validateRequest(req, res, next),
      (req, res) => this.editProfile(req, res),
    );

    router.get(
      '/transfer',
      query('id').exists().not().isEmpty(),
      sanitizeQuery('id').trim(),
      (req, res, next) => this.validateRequest(req, res, next),
      (req, res, next) => this.storeReturnTo(req, res, next),
      (req, res, next) => this.renderTransferCoins(req, res, next),
      (req, res) => this.redirectToLast(req, res),
    );

    router.post(
      '/transfer',
      query('id').exists().not().isEmpty(),
      body('coins').exists().isInt({ min: 1 }),
      sanitizeQuery('id').trim(),
      (req, res, next) => this.validateRequest(req, res, next),
      (req, res, next) => this.transferCoins(req, res, next),
      (req, res) => this.redirectToLast(req, res),
    );

    this.app.use(mountPoint, router);
  }

  /**
   * @description Validates an avatar file.
   * @private
   * @param {Express.Request} req Express request object.
   * @param {Express.Multer.File} file Multer file object.
   * @param {((error: Error | null, accept: boolean) => void)} cb Multer callback.
   * @memberof UserRouter
   */
  private validateAvatarFile(
    req: Express.Request,
    file: Express.Multer.File,
    cb: (error: Error | null, accept: boolean) => void) {
    cb(null, file.mimetype.startsWith('image/'));
  }

  /**
   * @description Edits a user profile.
   * @private
   * @param {Request} req Express request object.
   * @param {Response} res Express response object.
   * @memberof UserRouter
   */
  private editProfile(req: Request, res: Response) {

    const setter: Partial<IUser> = {
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      email: req.body.email,
    };

    let avatarPromise = Promise.resolve();
    if (req.file) {
      const fileName = `${uuid()}.${extension(req.file.mimetype)}`;
      setter.avatar = fileName;

      avatarPromise = writeFile(join(this.avatarPath, fileName), req.file.buffer);
    }

    avatarPromise.then(() => {
      return User.findByIdAndUpdate(req.user._id, {
        $set: setter,
      }).exec();
    }).then((user) => {
      if (!user) {
        throw new Error('User not found');
      }

      if (req.file && user.avatar) {
        return unlink(join(this.avatarPath, user.avatar))
          .catch((err) => this.logger.error(`Failed to delete avatar: ${err}`));
      }
    }).then(() => req.flash('success', 'Profile saved!'))
      .catch((err) => {
        this.logger.error(`Error saving profile: ${err}`);
        req.flash('error', 'Failed to update profile');
      }).then(() => res.redirect('./editProfile'));
  }

  /**
   * @description Renders the edit profile page.
   * @private
   * @param {Request} req Express request object.
   * @param {Response} res Express response object.
   * @memberof UserRouter
   */
  private renderEditProfile(req: Request, res: Response): void {
    res.render('editProfile', {
      nav: 'profile',
    });
  }

  /**
   * @description Renders the main list of users.
   * @private
   * @param {Request} req Express request object.
   * @param {Response} res Express response object.
   * @memberof UserRouter
   */
  private renderUsers(req: Request, res: Response): void {
    User.paginate(
      req.user.roles.includes('admin')
        ? {}
        : { enabled: true }, {
        sort: '-enabled firstName lastName',
        page: req.query.page ? req.query.page : 1,
        limit: this.pageSize,
      }).then((result) => {
        res.render('users', {
          nav: 'users',
          users: result.docs,
          page: result.page,
          pages: result.pages,
        });
      }).catch((err) => {
        this.logger.error(`Error rendering users: ${err}`);
        res.sendStatus(500);
      });
  }

  /**
   * @description Renders the user wealth view.
   * @private
   * @param {Request} req Express request object.
   * @param {Response} res Express response object.
   * @memberof UserRouter
   */
  private renderUserWealth(req: Request, res: Response): void {
    const ascending = !!(req.query.ascending && parseInt(req.query.ascending, 10));
    User.find(
      {
        enabled: true,
      },
    ).sort(ascending ? 'coins' : '-coins').then((users) => {
      res.render('wealth', {
        users,
        ascending,
        nav: 'users',
      });
    }).catch((err) => {
      this.logger.error(`Error rendering user wealth: ${err}`);
      res.sendStatus(500);
    });
  }

  /**
   * @description Renders the coin transfer page.
   * @private
   * @param {Request} req Express request object.
   * @param {Response} res Express response object.
   * @param {NextFunction} next Express next function.
   * @memberof UserRouter
   */
  private renderTransferCoins(req: Request, res: Response, next: NextFunction): void {
    User.findById(req.query.id).exec().then((user) => {
      if (!user) {
        throw new Error('User is null');
      }

      res.render('transferCoins', {
        targetUser: user,
      });
    }).catch((err) => {
      this.logger.error(`Failed to renderTransferCoins: ${err}`);
      req.flash('error', 'Failed to transfer coins');
      next();
    });
  }

  /**
   * @description Transfers coins from one user to another.
   * @private
   * @param {Request} req Express request object.
   * @param {Response} res Express response object.
   * @param {NextFunction} next Express next function.
   * @returns {void}
   * @memberof UserRouter
   */
  private transferCoins(req: Request, res: Response, next: NextFunction): void {
    const coins = req.body.coins;
    if (coins > req.user.coins) {
      req.flash('error', `Can transfer at most ${req.user.coins} coins`);
      return next();
    }

    let session: ClientSession;
    let sourceUser: IUser;
    let targetUser: IUser;
    mongoose.startSession().then((s) => {
      session = s;
      session.startTransaction();

      return User.findByIdAndUpdate(req.query.id, {
        $inc: {
          coins,
        },
      }).session(session).exec();
    }).then((user) => {
      if (!user) {
        throw new Error('targetUser is null');
      }

      targetUser = user;
      return User.findByIdAndUpdate(req.user._id, {
        $inc: {
          coins: -1 * coins,
        },
      }).session(session).exec();
    }).then((user) => {
      if (!user) {
        throw new Error('sourceUser is null');
      }
      sourceUser = user;
    }).then(() => {
      return audit(
        session,
        `User (${sourceUser.firstName} ${sourceUser.lastName},${sourceUser._id}) transferred ` +
        `${coins} coins to user (${targetUser.firstName} ${targetUser.lastName},${targetUser._id})`,
      );
    }).then(() => {
      return Transaction.create([{
        description: 'Coin transfer',
        date: new Date(),
        entries: [{
          user: targetUser,
          previousValue: targetUser.coins,
          newValue: targetUser.coins + parseInt(coins, 10),
        }, {
          user: sourceUser,
          previousValue: sourceUser.coins,
          newValue: sourceUser.coins - parseInt(coins, 10),
        }],
      }], {
          session,
        });
    }).then(() => session.commitTransaction())
      .then(() => {
        req.flash('success', `Transferred ${coins} coins to '${targetUser.firstName} ${targetUser.lastName}'`);

        return this.mailer.sendMail(
          'coinTransfer',
          {
            sourceUser,
            targetUser,
            coins,
          },
          [sourceUser.email, targetUser.email],
          User.find({
            roles: 'admin',
          }),
        ).catch((err) => this.logger.error(`Failed to send transfer email: ${err}`));
      }).catch((err) => {
        this.logger.error(`Failed to transferCoins: ${err}`);
        req.flash('Failed to transfer coins');
        session.abortTransaction();
      }).then(() => next());
  }
}

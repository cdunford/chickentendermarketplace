import { Router } from 'express';
import { Passport } from 'passport';
import { ILogger } from '../../logging';
import { IMailer } from '../../mailing';
import { IRouter } from '../../routing';
import { IUser, User } from '../../users';
import { IOAuthProvider, IOAuthProviderDescription } from '../entities';

/**
 * @description Configuration for the {@see AuthenticationRouter}.
 * @interface IAuthenticationRouterConfig
 */
interface IAuthenticationRouterConfig {
  /**
   * @description Configured OAuth providers.
   * @type {IOAuthProviderDescription[]}
   * @memberof IAuthenticationRouterConfig
   */
  providers: IOAuthProviderDescription[];

  /**
   * @description Mail sending service.
   * @type {IMailer}
   * @memberof IAuthenticationRouterConfig
   */
  mailer: IMailer;

  /**
   * @description Logging service.
   * @type {ILogger}
   * @memberof IAuthenticationRouterConfig
   */
  logger: ILogger;
}

/**
 * @description A framework router/controller that provides user authentication routes
 *  for OAuth authentication using Passport.
 * @export
 * @class AuthenticationRouter
 * @implements {IRouter}
 */
export class AuthenticationRouter implements IRouter {

  /**
   * @description The system's main Express router.
   * @private
   * @type {Router}
   * @memberof AuthenticationRouter
   */
  private app: Router;

  /**
   * @description An instance of Passport used by the router.
   * @private
   * @type {Passport}
   * @memberof AuthenticationRouter
   */
  private passport: Passport;

  /**
   * @description The OAuth providers available.
   * @private
   * @type {IOAuthProviderDescription[]}
   * @memberof AuthenticationRouter
   */
  private providers: IOAuthProviderDescription[];

  /**
   * @description Mail sending service for delivering notifications.
   * @private
   * @type {IMailer}
   * @memberof AuthenticationRouter
   */
  private mailer: IMailer;

  /**
   * @description Logging service for logging messages.
   * @private
   * @type {ILogger}
   * @memberof AuthenticationRouter
   */
  private logger: ILogger;

  /**
   * Creates an instance of AuthenticationRouter.
   * @param systemState The framework state object
   * @param {IAuthenticationRouterConfig} config Configuration for this router.
   * @memberof AuthenticationRouter
   */
  public constructor(
    systemState: {
      app: Router,
      passport: Passport,
    },
    config: IAuthenticationRouterConfig,
  ) {
    this.app = systemState.app;
    this.passport = systemState.passport;
    this.providers = config.providers;
    this.mailer = config.mailer;
    this.logger = config.logger;

    this.passport.serializeUser<IUser, any>((user, done) => this.serializeUser(user, done));
    this.passport.deserializeUser<IUser, any>((id, done) => this.deserializeUser(id, done));
  }

  /**
   * @description Registers the routes handled by this router.
   * @param {string} mountPoint The URI under which to mount the routes.
   * @memberof AuthenticationRouter
   */
  public registerRoutes(mountPoint: string): void {
    const router = Router();

    router.get('/login', (req, res) => {
      res.render('login');
    });

    router.get('/logout', (req, res) => {
      req.logout();
      res.redirect('/');
    });

    router.get('/disabled', (req, res) => {
      res.render('disabledUser');
    });

    for (const providerDescription of this.providers) {
      const provider = new providerDescription.provider(providerDescription.config);
      this.passport.use(provider.getStrategy((
        accessToken: string,
        refreshToken: string,
        profile: any,
        done: (err: any, user?: any, options?: { message: string }) => void,
      ) => {
        this.authenticateFromProfile(providerDescription.name, provider, profile, done);
      }));

      router.get(`/${providerDescription.name}`, this.passport.authenticate(providerDescription.name, {
        scope: providerDescription.scope,
      }));

      router.get(`/${providerDescription.name}/callback`,
        this.passport.authenticate(providerDescription.name, {
          successReturnToOrRedirect: '/',
        }));
    }

    this.app.use(mountPoint, router);
    this.app.use((req, res, next) => {
      if (!req.isAuthenticated() || !req.user.enabled) {
        if (req.session) {
          req.session.returnTo = req.originalUrl;
        }

        return res.redirect('/');
      }

      res.locals.user = req.user;
      next();
    });
  }

  /**
   * @description Given an OAuth user representation, attempts to authenticate that user
   * within the system.
   * @private
   * @param {string} providerName The name of the provider from which the profile came.
   * @param {IOAuthProvider} provider The internal OAuth provider implementation.
   * @param {*} profile The provider's profile representation.
   * @param {(err: any, user?: any, options?: { message: string }) => void} done Done callback.
   * @memberof AuthenticationRouter
   */
  private authenticateFromProfile(
    providerName: string,
    provider: IOAuthProvider,
    profile: any,
    done: (err: any, user?: any, options?: { message: string }) => void,
  ): void {
    const oAuthUser = provider.parseProfile(profile);
    User.findOne({
      oAuthIds: {
        $elemMatch: {
          id: oAuthUser.id,
          authType: providerName,
        },
      },
    }).exec().then((user) => {
      if (!user) {
        const newUser = new User({
          oAuthIds: [
            {
              id: oAuthUser.id,
              authType: providerName,
            },
          ],
          firstName: oAuthUser.firstName,
          lastName: oAuthUser.lastName,
          email: oAuthUser.email,
        });

        return newUser.save().then((insertedUser) => {
          this.mailer.sendMail(
            'newUser',
            {
              user: insertedUser,
            },
            User.find({
              roles: 'admin',
            })).catch((err) => this.logger.error(`Failed to send new user email: ${err}`));
          done(null, insertedUser);
        });
      }
      done(null, user);
    }).catch((err) => {
      this.logger.error(`Caught error in authenticate from profile: ${err}`);
      done(err, null);
    });
  }

  /**
   * @description Serializes a user object to a simple unique representation.
   * @private
   * @param {IUser} user The user object to serialize.
   * @param {(err: any, user: any) => void} done Done callback, taking the serialized user.
   * @memberof AuthenticationRouter
   */
  private serializeUser(user: IUser, done: (err: any, user: any) => void): void {
    done(null, user._id);
  }

  /**
   * @description Deserializes a simple, unique user representation into a a proper
   *   user object.
   * @private
   * @param {*} id The serialized user object (ie the user id).
   * @param {(err: any, user?: IUser) => void} done Done function, taking the deserialized user
   *  object.
   * @memberof AuthenticationRouter
   */
  private deserializeUser(id: any, done: (err: any, user?: IUser) => void): void {
    User.findById(id).then((user) => {
      if (!user) {
        throw new Error('User is null');
      }
      done(null, user);
    }).catch((err) => {
      this.logger.error(`Error in deserializeUser: ${err}`);
      done(err);
    });
  }
}

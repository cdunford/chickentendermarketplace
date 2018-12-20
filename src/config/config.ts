import { userMorganToken } from '../users';
import dbMigration from './dbMigration';
import dustHelpers from './dustHelpers';
import { logger } from './objects';
import routes from './routes';
import staticConfig from './staticConfig';
import statics from './statics';

/**
 * @description The main DI / system configuration.
 */
const config = {
  /**
   * @description The HTTP listening port.
   */
  listenPort: 3000,

  /**
   * @description The morgan logging format to use.
   */
  morganFormat: ':method :url :status :res[content-length] - :response-time ms [:user]',

  /**
   * @description Secret string used to encrypt session cookie.
   */
  sessionSecret: staticConfig.sessionSecret,

  /**
   * @description Maximum session lifetime before expiry (ms).
   */
  sessionMaxAge: 900000,

  /**
   * @description URI used to connect to Mongo.
   */
  dbUri: process.env.DB_HOST
    ? `mongodb://${process.env.DB_HOST}/chickentender`
    : 'mongodb://127.0.0.1/chickentender',
  sessionCollection: 'sessions',

  /**
   * @description List of Mongo collections used by the application.
   */
  dbCollections: ['transactions', 'audits', 'users', 'orders', 'schemaVersion'],

  /**
   * @description Additional morgan logging functions.
   */
  morganTokenFunctions: [{
    name: 'user',
    func: userMorganToken,
  }],

  /**
   * @description System logging service.
   */
  logger,

  /**
   * @description Dust template helper functions.
   */
  dustHelpers,

  /**
   * @description Static asset/route configuration.
   */
  statics,

  /**
   * @description Dynamic router/controller configuration.
   */
  routes,

  /**
   * @description DB upgrade functions.
   */
  dbMigration,
};

export default config;

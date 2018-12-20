import { AuditRouter } from '../audit';
import { AuthenticationRouter } from '../auth';
import { OrderAdministrationRouter, OrderRouter } from '../orders';
import { TransactionRouter } from '../transactions';
import { UserAdministrationRouter, UserRedirectionRouter, UserRouter } from '../users';
import { AUDIT_PAGE_SIZE, AVATAR_PATH, ORDER_CLOSE_TIMEOUT, PAGE_SIZE } from './constants';
import oAuthProviders from './oAuthProviders';
import { logger, mailer } from './objects';
import staticConfig from './staticConfig';

/**
 * @description List of dynamic routes / controllers.
 */
const routes = [
  {
    router: UserRedirectionRouter,
    mount: '/',
    config: {
      authenticatedRedirect: '/app/orders',
      anonymousRedirect: '/app/auth/login',
      disabledUserRedirect: '/app/auth/disabled',
    },
  },
  {
    router: AuthenticationRouter,
    mount: '/auth',
    config: {
      providers: oAuthProviders,
      mailer,
      logger,
    },
  },
  {
    router: AuditRouter,
    mount: '/audit',
    config: {
      logger,
      pageSize: AUDIT_PAGE_SIZE,
    },
  },
  {
    router: OrderRouter,
    mount: '/orders',
    config: {
      orderTypes: staticConfig.orderTypes,
      pageSize: PAGE_SIZE,
      logger,
    },
  },
  {
    router: OrderAdministrationRouter,
    mount: '/orders/admin',
    config: {
      orderTypes: staticConfig.orderTypes,
      logger,
      mailer,
      orderCloseTimeout: ORDER_CLOSE_TIMEOUT,
    },
  },
  {
    router: UserRouter,
    mount: '/users',
    config: {
      maxAvatarSize: 2 * 1024 * 1024, // 2MB
      pageSize: PAGE_SIZE,
      logger,
      mailer,
      avatarPath: AVATAR_PATH,
    },
  },
  {
    router: UserAdministrationRouter,
    mount: '/users/admin',
    config: {
      oAuthProviders,
      logger,
      mailer,
    },
  },
  {
    router: TransactionRouter,
    mount: '/transactions',
    config: {
      pageSize: PAGE_SIZE,
      logger,
    },
  },
];

export default routes;

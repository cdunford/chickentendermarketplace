/**
 * @description Represents an object that registers endpoints to route to.
 * @export
 * @interface IRouter
 */
export interface IRouter {
  registerRoutes(mountPoint: string): void;
}

/**
 * @description Represents the configuration for a router.
 * @export
 * @interface IRouteConfig
 */
export interface IRouteConfig {
  router: { new(systemState: any, config?: any): IRouter };
  mount: string;
  config?: any;
}

import { Strategy } from 'passport';

/**
 * @description Represents a simple OAuth user profile.
 * @export
 * @interface IOAuthUser
 */
export interface IOAuthUser {
  /**
   * @description The user's id.
   * @type {string}
   * @memberof IOAuthUser
   */
  id: string;

  /**
   * @description The user's first name.
   * @type {string}
   * @memberof IOAuthUser
   */
  firstName: string;

  /**
   * @description The user's last name
   * @type {string}
   * @memberof IOAuthUser
   */
  lastName: string;

  /**
   * @description The user's email address.
   * @type {string}
   * @memberof IOAuthUser
   */
  email: string;
}

/**
 * @description OAuth/Passport validator function.
 */
export type ValidatorFunction = (
  accessToken: string,
  refreshToken: string,
  profile: any,
  done: (err: any, user?: any, options?: { message: string }) => void) => void;

/**
 * @description Represents an object that can perform OAuth authentication.
 * @export
 * @interface IOAuthProvider
 */
export interface IOAuthProvider {
  /**
   * @description Re
   * @param {ValidatorFunction} validator The validator function.
   * @returns {Strategy} A Passport authentication strategy.
   * @memberof IOAuthProvider
   */
  getStrategy(
    validator: ValidatorFunction,
  ): Strategy;

  /**
   * @description Parses a domain/provider specific profile into the standard form.
   * @param {*} profile The provider specific profile.
   * @returns {IOAuthUser} The parsed user object.
   * @memberof IOAuthProvider
   */
  parseProfile(profile: any): IOAuthUser;
}

/**
 * @description Describes an OAuth provider along with it's scope and configuration.
 * @export
 * @interface IOAuthProviderDescription
 */
export interface IOAuthProviderDescription {
  provider: { new(config: IOAuthProviderConfig): IOAuthProvider };
  name: string;
  config: IOAuthProviderConfig;
  scope?: string[];
}

/**
 * @description Describes the configuration used by an OAuth provider.
 * @export
 * @interface IOAuthProviderConfig
 */
export interface IOAuthProviderConfig {
  clientID: string;
  clientSecret: string;
  callbackURL: string;
}

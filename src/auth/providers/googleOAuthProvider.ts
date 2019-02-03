import { Strategy } from '@passport-next/passport-google-oauth2';
import { Strategy as StrategyBase } from 'passport';
import { IOAuthProvider, IOAuthProviderConfig, IOAuthUser, ValidatorFunction } from '../entities';

/**
 * @description Implements OAuth authentication via Google.
 * @export
 * @class GoogleOAuthProvider
 * @implements {IOAuthProvider}
 */
export class GoogleOAuthProvider implements IOAuthProvider {

  /**
   * Creates an instance of GoogleOAuthProvider.
   * @param {IOAuthProviderConfig} config The provider's configuration.
   * @memberof GoogleOAuthProvider
   */
  public constructor(private config: IOAuthProviderConfig) { }

  /**
   * @description Retrieves the Google Passport authentication strategy.
   * @param {ValidatorFunction} validator The Passport validator function.
   * @returns {StrategyBase} The Google authentication strategy.
   * @memberof GoogleOAuthProvider
   */
  public getStrategy(validator: ValidatorFunction): StrategyBase {
    return new Strategy({
      clientID: this.config.clientID,
      clientSecret: this.config.clientSecret,
      callbackURL: this.config.callbackURL,
    }, validator);
  }

  /**
   * @description Parses a Google user profile into the internal user representation.
   * @param {*} profile The Google user profile.
   * @returns {IOAuthUser} The parsed user object.
   * @memberof GoogleOAuthProvider
   */
  public parseProfile(profile: any): IOAuthUser {
    return {
      firstName: profile.name.givenName,
      lastName: profile.name.familyName,
      id: profile.id,
      email: profile.email,
    };
  }
}

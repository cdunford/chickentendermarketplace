import { Strategy as StrategyBase } from 'passport';
import { Profile, Strategy } from 'passport-facebook';
import { IOAuthProvider, IOAuthProviderConfig, IOAuthUser, ValidatorFunction } from '../entities';

/**
 * @description Implements OAuth authentication to Facebook.
 * @export
 * @class FacebookOAuthProvider
 * @implements {IOAuthProvider}
 */
export class FacebookOAuthProvider implements IOAuthProvider {

  /**
   * Creates an instance of FacebookOAuthProvider.
   * @param {IOAuthProviderConfig} config The provider's configuration.
   * @memberof FacebookOAuthProvider
   */
  public constructor(private config: IOAuthProviderConfig) { }

  /**
   * @description Creates the Passport authentication strategy for Facebook.
   * @param {ValidatorFunction} validator The Passport validator function.
   * @returns {StrategyBase} The Facebook strategy.
   * @memberof FacebookOAuthProvider
   */
  public getStrategy(validator: ValidatorFunction): StrategyBase {
    return new Strategy({
      clientID: this.config.clientID,
      clientSecret: this.config.clientSecret,
      callbackURL: this.config.callbackURL,
      profileFields: ['id', 'emails', 'name'],
    }, validator);
  }

  /**
   * @description Parses a Facebook profile into the standard OAuth user.
   * @param {Profile} profile The Facebook profile.
   * @returns {IOAuthUser} The parsed user object.
   * @memberof FacebookOAuthProvider
   */
  public parseProfile(profile: Profile): IOAuthUser {
    let email = '';
    if (profile.emails && profile.emails.length > 0) {
      const [profileEmail] = profile.emails;
      email = profileEmail.value;
    }

    return {
      id: profile.id,
      firstName: profile.name ? profile.name.givenName : '',
      lastName: profile.name ? profile.name.familyName : '',
      email,
    };
  }
}

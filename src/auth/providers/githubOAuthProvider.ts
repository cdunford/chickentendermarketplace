import { Strategy as StrategyBase } from 'passport';
import { Profile, Strategy } from 'passport-github2';
import { IOAuthProvider, IOAuthProviderConfig, IOAuthUser, ValidatorFunction } from '../entities';

/**
 * @description Implements Github OAuth authentication.
 * @export
 * @class GithubOAuthProvider
 * @implements {IOAuthProvider}
 */
export class GithubOAuthProvider implements IOAuthProvider {

  /**
   * Creates an instance of GithubOAuthProvider.
   * @param {IOAuthProviderConfig} config The provider's configuration.
   * @memberof GithubOAuthProvider
   */
  public constructor(private config: IOAuthProviderConfig) { }

  /**
   * @description Returns the Passport authentication strategy.
   * @param {ValidatorFunction} validator Passport validator function.
   * @returns {StrategyBase} The strategy.
   * @memberof GithubOAuthProvider
   */
  public getStrategy(validator: ValidatorFunction): StrategyBase {
    return new Strategy({
      clientID: this.config.clientID,
      clientSecret: this.config.clientSecret,
      callbackURL: this.config.callbackURL,
    }, validator);
  }

  /**
   * @description Parses a Github profile into an internal OAuth user.
   * @param {Profile} profile The profile to parse.
   * @returns {IOAuthUser} The parsed user object.
   * @memberof GithubOAuthProvider
   */
  public parseProfile(profile: Profile): IOAuthUser {
    const names: string[] = profile.displayName.split(' ');
    while (names.length < 2) {
      names.push('Unknown');
    }

    const [firstName, lastName] = names;

    let email = '';
    if (profile.emails && profile.emails.length > 0) {
      const [profileEmail] = profile.emails;
      email = profileEmail.value;
    }

    return {
      id: profile.id,
      firstName,
      lastName,
      email,
    };
  }
}

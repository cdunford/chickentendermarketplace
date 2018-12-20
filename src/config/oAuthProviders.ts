import { FacebookOAuthProvider, GithubOAuthProvider, GoogleOAuthProvider } from '../auth';
import staticConfig from './staticConfig';

/**
 * @description List of OAuth providers.
 */
const oAuthProviders = [
  {
    provider: GoogleOAuthProvider,
    name: 'google',
    scope: ['profile', 'email'],
    config: {
      clientID: staticConfig.oAuth.google.clientID,
      clientSecret: staticConfig.oAuth.google.clientSecret,
      callbackURL: staticConfig.oAuth.google.callbackURL,
    },
  },
  {
    provider: GithubOAuthProvider,
    name: 'github',
    scope: ['read:user', 'user:email'],
    config: {
      clientID: staticConfig.oAuth.github.clientID,
      clientSecret: staticConfig.oAuth.github.clientSecret,
      callbackURL: staticConfig.oAuth.github.callbackURL,
    },
  },
  {
    provider: FacebookOAuthProvider,
    name: 'facebook',
    scope: ['email'],
    config: {
      clientID: staticConfig.oAuth.facebook.clientID,
      clientSecret: staticConfig.oAuth.facebook.clientSecret,
      callbackURL: staticConfig.oAuth.facebook.callbackURL,
    },
  },
];

export default oAuthProviders;

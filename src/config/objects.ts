import { ConsoleLogger } from '../logging';
import { DustSmtpMailer } from '../mailing';
import staticConfig from './staticConfig';

/**
 * @description Logging service.
 */
export const logger = new ConsoleLogger();

/**
 * @description Email sending service.
 */
export const mailer = new DustSmtpMailer({
  smtpService: staticConfig.smtp.service,
  userName: staticConfig.smtp.user,
  password: staticConfig.smtp.password,
  smtpFrom: staticConfig.smtp.from,
  templateFile: `${__dirname}/../views/email.js`,
  siteRoot: staticConfig.siteRoot,
});

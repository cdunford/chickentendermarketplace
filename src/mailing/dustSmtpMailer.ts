import { loadSource, render } from 'dustjs-helpers';
import { readFile } from 'fs-extra';
import { DocumentQuery } from 'mongoose';
import { createTransport } from 'nodemailer';
import { IUser } from '../users';
import { IMailer } from './mailer';

/**
 * @description Represents the configuration for the {@see DustSmtpMailer}.
 * @export
 * @interface IDustSmtpMailerConfig
 */
export interface IDustSmtpMailerConfig {
  smtpService: string;
  smtpFrom: string;
  userName: string;
  password: string;
  templateFile: string;
  siteRoot: string;
}

/**
 * @description A mailer that sends emails over SMTP and renders messages
 *  using Dust.
 * @export
 * @class DustSmtpMailer
 * @implements {IMailer}
 */
export class DustSmtpMailer implements IMailer {
  /**
   * Creates an instance of DustSmtpMailer.
   * @param {IDustSmtpMailerConfig} config Mailer configuration.
   * @memberof DustSmtpMailer
   */
  constructor(
    private config: IDustSmtpMailerConfig,
  ) {
    readFile(config.templateFile).then((data) => {
      loadSource(data.toString());
    });
  }

  /**
   * @description Sends a mail.
   * @param {string} template The name of the template to render for the mail.
   * @param {*} context Context object to use for template rendering.
   * @param {(DocumentQuery<IUser[], IUser> | string[])} to Who to send the mail to.
   * @param {(DocumentQuery<IUser[], IUser> | string[])} [cc] Who to CC on the mail.
   * @returns {Promise<void>} Resolved when mail is sent successfully, or rejected if there
   *  is an error.
   * @memberof DustSmtpMailer
   */
  public sendMail(
    template: string,
    context: any,
    to: DocumentQuery<IUser[], IUser> | string[],
    cc?: DocumentQuery<IUser[], IUser> | string[],
  ): Promise<void> {
    const newContext = {
      ...context,
      ...{
        root: this.config.siteRoot,
      },
    };

    return Promise.all([
      this.renderTemplate(template, newContext),
      this.renderTemplate(`${template}.subject`, newContext),
      this.getAddresses(to),
      this.getAddresses(cc),
    ]).then(([body, subject, toAddresses, ccAddresses]) => {
      const transport = createTransport({
        service: this.config.smtpService,
        auth: {
          user: this.config.userName,
          pass: this.config.password,
        },
      });

      return transport.sendMail({
        from: this.config.smtpFrom,
        to: toAddresses,
        cc: ccAddresses,
        subject,
        html: body,
      });
    });
  }

  /**
   * @description Unpacks the source addresses to a semicolon delimited list of email
   *  addresses.
   * @private
   * @param {(DocumentQuery<IUser[], IUser> | string[])} [source] The source addresses to unpack.
   * @returns {Promise<string>} Resolved with the comma delimited list of addresses.
   * @memberof DustSmtpMailer
   */
  private getAddresses(source?: DocumentQuery<IUser[], IUser> | string[]): Promise<string> {
    if (!source) {
      return Promise.resolve('');
    }

    if (Array.isArray(source)) {
      return Promise.resolve(source.reduce((prev, current) => `${prev}${current};`, ''));
    }

    return source.exec().then((users) => {
      return users
        .map((user) => user.email)
        .reduce((prev, current) => `${prev}${current};`, '');
    });
  }

  /**
   * @description Renders an email template using Dust.
   * @private
   * @param {string} template The name of the template to render.
   * @param {*} context The context object to provider to the renderer.
   * @returns {Promise<string>} Resolved with the rendered template, or rejected
   *  if there is an error.
   * @memberof DustSmtpMailer
   */
  private renderTemplate(template: string, context: any) {
    return new Promise<string>((resolve, reject) => {
      render(template, context, (err: any, data: string) => {
        if (err) {
          return reject(err);
        }
        resolve(data);
      });
    });
  }
}

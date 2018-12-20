import { DocumentQuery } from 'mongoose';
import { IUser } from '../users';

/**
 * @description Represents a service for sending mail.
 * @export
 * @interface IMailer
 */
export interface IMailer {
  sendMail(
    template: string,
    context: any,
    to: DocumentQuery<IUser[], IUser> | string[],
    cc?: DocumentQuery<IUser[], IUser> | string[],
  ): Promise<void>;
}

import { ClientSession } from 'mongodb';
import { Audit } from './models';

/**
 * @description A simple function to allow other components to audit to the audit
 *  collection.
 * @export
 * @param {ClientSession} session A mongo session to use when creating the document.
 * @param {string} message The message to audit.
 * @returns {Promise<IAudit>} A promise resolved when the audit document has been saved.
 */
export function audit(session: ClientSession, message: string) {
  return Audit.create([{
    date: new Date(),
    log: message,
  }], {
      session,
    });
}

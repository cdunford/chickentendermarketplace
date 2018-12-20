/* tslint:disable:no-console */
import { ILogger } from './logger';

/**
 * @description Simple console logger implementation.
 * @export
 * @class ConsoleLogger
 * @implements {ILogger}
 */
export class ConsoleLogger implements ILogger {
  /**
   * @description Logs an error message.
   * @param {string} message The error message to log.
   * @memberof ConsoleLogger
   */
  public error(message: string): void {
    console.error(message);
  }

  /**
   * @description Logs an info message.
   * @param {string} message The message to log.
   * @memberof ConsoleLogger
   */
  public info(message: string): void {
    console.info(message);
  }
}

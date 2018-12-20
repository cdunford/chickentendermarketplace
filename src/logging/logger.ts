/**
 * @description Represents a service for logging diagnostic messages.
 * @export
 * @interface ILogger
 */
export interface ILogger {
  error(message: string): void;
  info(message: string): void;
}

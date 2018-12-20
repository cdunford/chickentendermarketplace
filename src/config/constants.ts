import { join } from 'path';

/**
 * @description Page size to use for paged data.
 */
export const PAGE_SIZE = 20;

/**
 * @description Page size to use for paged audit data.
 */
export const AUDIT_PAGE_SIZE = 100;

/**
 * @description Time before order close to change order state
 *  to CLOSING.
 */
export const ORDER_CLOSE_TIMEOUT = 1800000;

/**
 * @description Path to save avatar images.
 */
export const AVATAR_PATH = join(__dirname, '../dynamicContent/avatars');

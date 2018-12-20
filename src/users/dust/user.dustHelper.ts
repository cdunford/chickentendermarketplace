import { Chunk, Context } from 'dustjs-linkedin';
import { IUser } from '../models';

/**
 * @description Dust helper to determine if the current user has the specified role.
 * @export
 * @param {Chunk} chunk Dust chunk.
 * @param {Context} context Dust context.
 * @param {*} bodies Dust bodies.
 * @param {*} params Dust params.
 * @returns {Boolean} Whether the current user has the specified role.
 */
export function currentUserHasRole(chunk: Chunk, context: Context, bodies: any, params: any) {
  const user: IUser = context.get('user');
  const role: string = params.role;
  if (!user || !role) {
    return false;
  }

  return user.roles.includes(role);
}

/**
 * @description Dust helper to determine if the given id belongs to the current user.
 * @export
 * @param {Chunk} chunk Dust chunk.
 * @param {Context} context Dust context.
 * @param {*} bodies Dust bodies.
 * @param {*} params Dust params.
 * @returns {Boolean} Whether the given id belongs to the current user.
 */
export function isCurrentUserId(chunk: Chunk, context: Context, bodies: any, params: any) {
  const user: IUser = context.get('user');
  let id: any = params.id;
  if (!user || !id) {
    return false;
  }

  if (typeof id !== 'string') {
    id = id.toString();
  }

  return user._id.toString() === id;
}

/**
 * @description Dust helper to determine if the given id does not belong to the current user.
 * @export
 * @param {Chunk} chunk Dust chunk.
 * @param {Context} context Dust context.
 * @param {*} bodies Dust bodies.
 * @param {*} params Dust params.
 * @returns {Boolean} Whether the given id does not belong to the current user.
 */
export function isNotCurrentUserId(chunk: Chunk, context: Context, bodies: any, params: any) {
  return !isCurrentUserId(chunk, context, bodies, params);
}

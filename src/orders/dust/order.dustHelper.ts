import { Chunk, Context } from 'dustjs-linkedin';
import { IUser } from '../../users';
import { IOrder } from '../models';

/**
 * @description Determines if the provided user is a participant in the provided order.
 * @export
 * @param {Chunk} chunk The dust template chunk.
 * @param {Context} context The dust context.
 * @param {*} bodies The dust bodies.
 * @param {*} params The dust helper parameters.
 * @returns {Boolean} Whether the provided user is in the order.
 */
export function currentUserInOrder(chunk: Chunk, context: Context, bodies: any, params: any) {
  const user: IUser = context.get('user');
  const order: IOrder = params.order;

  return order.userOrders.some((x) => {
    const orderUser = x.user;
    return orderUser.id === user.id;
  });
}

/**
 * @description Determines if the provided user is not a participant in the provided order.
 * @export
 * @param {Chunk} chunk The dust template chunk.
 * @param {Context} context The dust context.
 * @param {*} bodies The dust bodies.
 * @param {*} params The dust helper parameters.
 * @returns {Boolean} Whether the provided user is not in the order.
 */
export function currentUserNotInOrder(chunk: Chunk, context: Context, bodies: any, params: any) {
  return !currentUserInOrder(chunk, context, bodies, params);
}

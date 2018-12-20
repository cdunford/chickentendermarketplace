import { Document, model, Schema } from 'mongoose';
import * as mongoosePaginate from 'mongoose-paginate';
import { IUser } from '../../users';

/**
 * @description The state of an order.
 * @export
 * @enum {number}
 */
export enum OrderState {
  /**
   * @description The order is closing soon.
   */
  Closing = 0,

  /**
   * @description The order is open.
   */
  Open = 1,

  /**
   * @description The order is closed.
   */
  Closed = 2,

  /**
   * @description The order is archived/logged.
   */
  Archived = 3,

  /**
   * @description The order is closed.
   */
  Cancelled = 4,
}

/**
 * @description Mongoose schema for an order.
 */
const orderSchema = new Schema({
  openDate: {
    required: true,
    type: Date,
  },
  closeDate: {
    required: true,
    type: Date,
  },
  location: {
    required: true,
    type: String,
  },
  description: {
    required: true,
    type: String,
  },
  cost: {
    required: true,
    type: Number,
  },
  state: {
    required: true,
    default: OrderState.Open,
    type: Number,
    enum: [
      OrderState.Open,
      OrderState.Closing,
      OrderState.Closed,
      OrderState.Archived,
      OrderState.Cancelled,
    ],
  },
  userOrders: [
    {
      user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
      details: [String],
    },
  ],
  purchaser: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
});

orderSchema.plugin(mongoosePaginate);

/**
 * @description Represents a single user's order details.
 * @export
 * @interface IUserOrder
 */
export interface IUserOrder {
  user: IUser;
  details: string[];
}

/**
 * @description Represents a single order.
 * @export
 * @interface IOrder
 * @extends {Document}
 */
export interface IOrder extends Document {
  /**
   * @description When the order was opened.
   * @type {Date}
   * @memberof IOrder
   */
  openDate: Date;

  /**
   * @description When the order was/is closing.
   * @type {Date}
   * @memberof IOrder
   */
  closeDate: Date;

  /**
   * @description Where the order is from.
   * @type {string}
   * @memberof IOrder
   */
  location: string;

  /**
   * @description Description of the order.
   * @type {string}
   * @memberof IOrder
   */
  description: string;

  /**
   * @description Individual user cost to join the order.
   * @type {number}
   * @memberof IOrder
   */
  cost: number;

  /**
   * @description Current order state.
   * @type {OrderState}
   * @memberof IOrder
   */
  state: OrderState;

  /**
   * @description Individual users' orders.
   * @type {IUserOrder[]}
   * @memberof IOrder
   */
  userOrders: IUserOrder[];

  /**
   * @description The purchaser of the order.
   * @type {IUser}
   * @memberof IOrder
   */
  purchaser?: IUser;
}

const Order = model<IOrder>('Order', orderSchema);

export { Order };

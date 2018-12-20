import { Document, model, Schema } from 'mongoose';
import * as mongoosePaginate from 'mongoose-paginate';
import { IUser } from '../../users';

/**
 * @description Mongoose schema representing a transaction.
 */
const transactionSchema = new Schema({
  description: {
    required: true,
    type: String,
  },
  date: {
    required: true,
    type: Date,
  },
  entries: [
    {
      user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
      previousValue: {
        type: Number,
        required: true,
      },
      newValue: {
        type: Number,
        required: true,
      },
    },
  ],
});

transactionSchema.plugin(mongoosePaginate);

/**
 * @description Represents an entry in a transaction.
 * @export
 * @interface ITransactionEntry
 */
export interface ITransactionEntry {
  /**
   * @description The user associated with the entry.
   * @type {IUser}
   * @memberof ITransactionEntry
   */
  user: IUser;

  /**
   * @description The previous coin value.
   * @type {number}
   * @memberof ITransactionEntry
   */
  previousValue: number;

  /**
   * @description The new coin value.
   * @type {number}
   * @memberof ITransactionEntry
   */
  newValue: number;
}

/**
 * @description Represents a transaction.
 * @export
 * @interface ITransaction
 * @extends {Document}
 */
export interface ITransaction extends Document {
  /**
   * @description A description of the transaction.
   * @type {string}
   * @memberof ITransaction
   */
  description: string;

  /**
   * @description The date/time the transaction occurred.
   * @type {Date}
   * @memberof ITransaction
   */
  date: Date;

  /**
   * @description The transaction entries.
   * @type {ITransactionEntry[]}
   * @memberof ITransaction
   */
  entries: ITransactionEntry[];
}

const Transaction = model<ITransaction>('Transaction', transactionSchema);

export { Transaction };

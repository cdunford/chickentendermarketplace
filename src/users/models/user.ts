import { Document, model, Schema } from 'mongoose';
import * as mongoosePaginate from 'mongoose-paginate';

/**
 * @description Mongoose schema representing a user.
 */
const userSchema = new Schema({
  firstName: {
    required: true,
    type: String,
  },
  lastName: {
    required: true,
    type: String,
  },
  oAuthIds: [{
    id: String,
    authType: String,
  }],
  enabled: {
    type: Boolean,
    default: false,
  },
  roles: [String],
  email: {
    required: true,
    type: String,
  },
  coins: {
    type: Number,
    default: 0,
  },
  avatar: String,
  activated: {
    type: Boolean,
    default: false,
  },
});

userSchema.plugin(mongoosePaginate);

/**
 * @description User model.
 * @export
 * @interface IUser
 * @extends {Document}
 */
export interface IUser extends Document {
  /**
   * @description User's first name.
   * @type {string}
   * @memberof IUser
   */
  firstName: string;

  /**
   * @description User's last name.
   * @type {string}
   * @memberof IUser
   */
  lastName: string;

  /**
   * @description User's OAuth id values.
   * @memberof IUser
   */
  oAuthIds: [{
    id: string,
    authType: string,
  }];

  /**
   * @description Whether the user is currently enabled.
   * @type {boolean}
   * @memberof IUser
   */
  enabled: boolean;

  /**
   * @description The roles belonging to the user.
   * @type {string[]}
   * @memberof IUser
   */
  roles: string[];

  /**
   * @description The user's email address.
   * @type {string}
   * @memberof IUser
   */
  email: string;

  /**
   * @description The user's current coin count.
   * @type {number}
   * @memberof IUser
   */
  coins: number;

  /**
   * @description The file name of the user's avatar.
   * @type {string}
   * @memberof IUser
   */
  avatar: string;

  /**
   * @description Whether this user has been activated/initialized.
   * @type {boolean}
   * @memberof IUser
   */
  activated: boolean;
}

const User = model<IUser>('User', userSchema);

export { User };

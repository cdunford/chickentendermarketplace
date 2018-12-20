import { Document, model, Schema } from 'mongoose';
import * as mongoosePaginate from 'mongoose-paginate';

/**
 * @description Mongo schema representing a simple
 *  audit document.
 */
const auditSchema = new Schema({
  date: {
    required: true,
    type: Date,
  },
  log: {
    required: true,
    type: String,
  },
});

auditSchema.plugin(mongoosePaginate);

/**
 * @description Type representing a document that matches the audit
 *  schema.
 * @export
 * @interface IAudit
 * @extends {Document}
 */
export interface IAudit extends Document {

  /**
   * @description The date/time of the audit.
   * @type {Date}
   * @memberof IAudit
   */
  date: Date;

  /**
   * @description The actual audit string.
   * @type {string}
   * @memberof IAudit
   */
  log: string;
}

const Audit = model<IAudit>('Audit', auditSchema);

export { Audit };

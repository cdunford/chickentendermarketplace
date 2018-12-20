/**
 * @description Represents a single field in an order.
 * @export
 * @interface IOrderField
 */
export interface IOrderField {
  /**
   * @description The name of the field.
   * @type {string}
   * @memberof IOrderField
   */
  name: string;

  /**
   * @description Valid values for the field.
   * @type {string[]}
   * @memberof IOrderField
   */
  values: string[];
}

/**
 * @description Represents a type of order that can be created.
 * @export
 * @interface IOrderType
 */
export interface IOrderType {
  /**
   * @description The name of the type of order.
   * @type {string}
   * @memberof IOrderType
   */
  name: string;

  /**
   * @description A description of the type of order.
   * @type {string}
   * @memberof IOrderType
   */
  description: string;

  /**
   * @description The cost of the type of order.
   * @type {number}
   * @memberof IOrderType
   */
  cost: number;

  /**
   * @description The selectable fields in the type of order.
   * @type {IOrderField[]}
   * @memberof IOrderType
   */
  fields: IOrderField[];
}

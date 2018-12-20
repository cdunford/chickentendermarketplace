import { Chunk, Context } from 'dustjs-linkedin';

/**
 * @description Dust helper to determine if an array includes a specified value.
 * @export
 * @param {Chunk} chunk The dust chunk.
 * @param {Context} context The dust context.
 * @param {*} bodies The dust bodies.
 * @param {*} params The dust params.
 * @returns {Boolean} Whether the array contains the value.
 */
export function arrayContains(chunk: Chunk, context: Context, bodies: any, params: any) {
  if (!params.array || !params.value) {
    return false;
  }

  const array = context.get(params.array);

  if (!array || !(array instanceof Array)) {
    return false;
  }

  return array.includes(params.value);
}

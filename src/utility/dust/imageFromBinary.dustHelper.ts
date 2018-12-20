import { Chunk, Context } from 'dustjs-linkedin';

/**
 * @description Dust helper that converts binary image data to a base64 data URI.
 * @param {Chunk} chunk The dust chunk.
 * @param {Context} context The dust context.
 * @param {*} bodies The dust bodies.
 * @param {*} params The dust params.
 * @returns {Chunk} The modified dust chunk.
 */
export function imageFromBinary(chunk: Chunk, context: Context, bodies: any, params: any) {
  if (params.data
    && params.data instanceof Buffer
    && params.type
    && typeof params.type === 'string') {
    chunk.write(`data:${params.type};base64,${params.data.toString('base64')}`);
  }

  return chunk;
}

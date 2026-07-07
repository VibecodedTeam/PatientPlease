// jest-environment-jsdom doesn't implement TextEncoder/TextDecoder, which
// undici (loaded in jest.setup.js's setupFilesAfterEnv phase) requires at
// import time. Runs as a separate, earlier `setupFiles` entry rather than
// living in jest.setup.js itself, since ES import hoisting would otherwise
// load undici before this polyfill had a chance to run.
const { TextDecoder, TextEncoder } = require('node:util');
const { ReadableStream, WritableStream, TransformStream } = require('node:stream/web');
const { MessageChannel, MessagePort } = require('node:worker_threads');

if (typeof globalThis.TextEncoder === 'undefined') {
  Object.assign(globalThis, { TextEncoder, TextDecoder });
}
if (typeof globalThis.ReadableStream === 'undefined') {
  Object.assign(globalThis, { ReadableStream, WritableStream, TransformStream });
}
if (typeof globalThis.MessageChannel === 'undefined') {
  Object.assign(globalThis, { MessageChannel, MessagePort });
}

import assert from 'node:assert/strict';
import {
  isCorsOriginAllowed,
  parseAllowedCorsOrigins,
  resolveApiHost,
  resolveApiPort,
} from '../src/serverConfig';

const defaultOrigins = parseAllowedCorsOrigins();

assert.equal(resolveApiHost({}), '127.0.0.1');
assert.equal(resolveApiHost({ HOST: '0.0.0.0' }), '0.0.0.0');
assert.equal(resolveApiHost({ API_HOST: 'localhost' }), 'localhost');
assert.equal(resolveApiPort({}), 3001);
assert.equal(resolveApiPort({ PORT: '4000' }), 4000);
assert.throws(() => resolveApiPort({ PORT: 'not-a-port' }), /Invalid PORT/);

assert.equal(isCorsOriginAllowed(undefined, defaultOrigins), true);
assert.equal(isCorsOriginAllowed('http://localhost:5173', defaultOrigins), true);
assert.equal(isCorsOriginAllowed('http://127.0.0.1:4173', defaultOrigins), true);
assert.equal(isCorsOriginAllowed('https://evil.example', defaultOrigins), false);

const configuredOrigins = parseAllowedCorsOrigins('https://inventory.example, http://localhost:3000');
assert.equal(isCorsOriginAllowed('https://inventory.example', configuredOrigins), true);
assert.equal(isCorsOriginAllowed('http://localhost:3000', configuredOrigins), true);
assert.equal(isCorsOriginAllowed('http://localhost:5173', configuredOrigins), false);

console.log('serverConfig tests passed');

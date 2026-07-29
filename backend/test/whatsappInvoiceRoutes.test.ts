import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { createApp } from '../src/index';

async function closeServer(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
}

async function run() {
  const app = createApp({} as never);
  const server = app.listen(0);

  try {
    const address = server.address() as AddressInfo;
    const baseUrl = `http://127.0.0.1:${address.port}`;

    const getResponse = await fetch(`${baseUrl}/api/whatsapp-invoices`);
    assert.equal(getResponse.status, 404);

    const postResponse = await fetch(`${baseUrl}/api/whatsapp-invoices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: 'invoice-1',
        transactionId: 'txn-1',
        customerPhone: '911234567890',
        billTotal: 100,
        messageText: 'private invoice text',
        sentAt: new Date().toISOString(),
      }),
    });
    assert.equal(postResponse.status, 404);
  } finally {
    await closeServer(server);
  }
}

run()
  .then(() => {
    console.log('whatsapp invoice route tests passed');
  })
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });

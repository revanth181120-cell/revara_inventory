import express from 'express';
import cors from 'cors';
import { buildCorsOptions, resolveApiHost } from './serverConfig';
import {
  initDatabase,
  getAllProducts,
  getAllSales,
  syncProducts,
  syncSales,
  getSuppliers,
} from './db';

const PORT = process.env.PORT || 3001;

async function main() {
  const db = await initDatabase();
  const app = express();
  const host = resolveApiHost();

  app.use(cors(buildCorsOptions()));
  app.use(express.json({ limit: '50mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', database: 'sqlite' });
  });

  app.get('/api/products', async (_req, res) => {
    try {
      const products = await getAllProducts(db);
      res.json(products);
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  app.get('/api/sales', async (_req, res) => {
    try {
      const sales = await getAllSales(db);
      res.json(sales);
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  app.get('/api/suppliers', async (_req, res) => {
    try {
      const suppliers = await getSuppliers(db);
      res.json(suppliers);
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  app.post('/api/products/sync', async (req, res) => {
    try {
      await syncProducts(db, req.body);
      res.json({ success: true, count: req.body.length });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  app.post('/api/sales/sync', async (req, res) => {
    try {
      await syncSales(db, req.body);
      res.json({ success: true, count: req.body.length });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  app.listen(PORT, host, () => {
    console.log(`Revara API running on http://${host}:${PORT}`);
  });
}

main().catch(console.error);

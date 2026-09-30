import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import api from './routes/api.js';
import Product from './models/Product.js';
import { products } from './data/products.js';

const app = express();
app.disable('x-powered-by');
const allowedClientOrigins = new Set((process.env.CLIENT_URL || 'http://localhost:5173').split(',').map((origin) => origin.trim()));
if (process.env.RENDER_EXTERNAL_URL) allowedClientOrigins.add(process.env.RENDER_EXTERNAL_URL);
app.use(cors({ origin: (origin, callback) => {
  // Vite may move from 5173 to the next free localhost port when 5173 is occupied.
  if (!origin || allowedClientOrigins.has(origin) || /^https?:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) return callback(null, true);
  return callback(new Error('Origin is not allowed by CORS'));
} }));
app.use(express.json({ limit: '100kb' }));
app.use('/api', api);
const clientDist = fileURLToPath(new URL('../../client/dist', import.meta.url));
if (existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}
app.use((error, _req, res, _next) => { console.error(error); res.status(500).json({ error: 'Something went wrong. Please try again.' }); });

const port = Number(process.env.PORT || 4000);
app.listen(port, () => console.log(`Meridian API listening on http://localhost:${port}`));

if (process.env.MONGODB_URI) {
  mongoose.connect(process.env.MONGODB_URI)
    .then(async () => {
      console.log('Connected to MongoDB');
    await mongoose.model('User').init();
      if (await Product.countDocuments() === 0) await Product.insertMany(products);
    })
    .catch((error) => console.warn(`MongoDB unavailable; using sample catalog and in-memory orders. ${error.message}`));
}

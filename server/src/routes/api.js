import { Router } from 'express';
import mongoose from 'mongoose';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import User from '../models/User.js';
import { createToken, hashPassword, verifyPassword } from '../services/auth.js';
import { products as sampleProducts } from '../data/products.js';
import { isSalesforceConfigured, syncOrderToSalesforce } from '../services/salesforce.js';

const router = Router();
const memoryOrders = [];
const catalog = () => sampleProducts.map((product, i) => ({ ...product, _id: `sample-${i + 1}` }));

router.get('/health', (_req, res) => res.json({ ok: true, database: mongoose.connection.readyState === 1 ? 'connected' : 'sample-data', salesforce: isSalesforceConfigured() ? 'configured' : 'not-configured' }));

router.post('/auth/signup', async (req, res, next) => {
  try {
    if (mongoose.connection.readyState !== 1) return res.status(503).json({ error: 'Account service is unavailable until the database connects.' });
    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    if (name.length < 2 || name.length > 100) return res.status(400).json({ error: 'Enter your name (2–100 characters).' });
    if (email.length > 254 || !/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: 'Enter a valid email address.' });
    if (password.length < 8 || password.length > 128) return res.status(400).json({ error: 'Password must be 8–128 characters.' });
    const { salt, hash } = await hashPassword(password);
    const user = await User.create({ name, email, passwordSalt: salt, passwordHash: hash });
    return res.status(201).json({ token: createToken(user.id), user: { id: user.id, name: user.name, email: user.email } });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ error: 'An account with that email already exists.' });
    return next(error);
  }
});

router.post('/auth/login', async (req, res, next) => {
  try {
    if (mongoose.connection.readyState !== 1) return res.status(503).json({ error: 'Account service is unavailable until the database connects.' });
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    if (!email || !password || password.length > 128) return res.status(400).json({ error: 'Enter your email and password.' });
    const user = await User.findOne({ email }).select('+passwordHash +passwordSalt');
    if (!user || !(await verifyPassword(password, user.passwordSalt, user.passwordHash))) return res.status(401).json({ error: 'Email or password is incorrect.' });
    return res.json({ token: createToken(user.id), user: { id: user.id, name: user.name, email: user.email } });
  } catch (error) { return next(error); }
});

router.get('/products', async (req, res, next) => {
  try {
    const filter = req.query.category && req.query.category !== 'All' ? { category: req.query.category, active: true } : { active: true };
    let results = mongoose.connection.readyState === 1 ? await Product.find(filter).lean() : catalog().filter((p) => filter.category === undefined || p.category === filter.category);
    if (req.query.search) {
      const term = String(req.query.search).toLowerCase();
      results = results.filter((p) => `${p.name} ${p.category} ${p.description}`.toLowerCase().includes(term));
    }
    res.json(results);
  } catch (error) { next(error); }
});

router.post('/orders', async (req, res, next) => {
  try {
    const { customer, items } = req.body;
    if (!customer?.name?.trim() || !/^\S+@\S+\.\S+$/.test(customer.email || '') || !customer?.address?.trim()) {
      return res.status(400).json({ error: 'Please provide your name, a valid email, and a shipping address.' });
    }
    if (!Array.isArray(items) || items.length === 0 || items.length > 50) return res.status(400).json({ error: 'Your cart is empty or contains too many items.' });
    const available = mongoose.connection.readyState === 1 ? await Product.find({ active: true }).lean() : catalog();
    const byId = new Map(available.map((product) => [String(product._id), product]));
    const safeItems = [];
    for (const item of items) {
      const product = byId.get(String(item.productId));
      const quantity = Math.floor(Number(item.quantity));
      if (!product || !Number.isFinite(quantity) || quantity < 1 || quantity > 20) return res.status(400).json({ error: 'One of the selected items is unavailable. Please refresh your cart.' });
      safeItems.push({ productId: String(product._id), name: product.name, quantity, unitPrice: product.price, image: product.image });
    }
    const subtotal = Number(safeItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0).toFixed(2));
    const shipping = subtotal >= 150 ? 0 : 8;
    const order = { orderNumber: `MRD-${Date.now().toString().slice(-7)}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`, customer: { name: customer.name.trim(), email: customer.email.trim().toLowerCase(), address: customer.address.trim() }, items: safeItems, subtotal, shipping, total: subtotal + shipping, currency: 'USD', salesforce: { synced: false } };
    let savedOrder;
    if (mongoose.connection.readyState === 1) savedOrder = await Order.create(order);
    else { savedOrder = { ...order, _id: `local-${Date.now()}`, createdAt: new Date() }; memoryOrders.push(savedOrder); }
    try {
      const sync = await syncOrderToSalesforce(savedOrder);
      if (sync.synced) {
        savedOrder.salesforce = { synced: true, recordId: sync.recordId };
        if (savedOrder.save) await savedOrder.save();
      }
    } catch (salesforceError) {
      savedOrder.salesforce = { synced: false, error: salesforceError.message };
      console.warn(`[Salesforce] Failed to sync order ${savedOrder.orderNumber}: ${salesforceError.message}`);
      if (savedOrder.save) await savedOrder.save();
    }
    res.status(201).json({ order: { orderNumber: savedOrder.orderNumber, subtotal: savedOrder.subtotal, shipping: savedOrder.shipping, total: savedOrder.total, salesforce: savedOrder.salesforce } });
  } catch (error) { next(error); }
});

export default router;

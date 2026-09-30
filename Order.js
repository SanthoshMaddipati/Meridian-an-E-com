import mongoose from 'mongoose';
const orderSchema = new mongoose.Schema({
  orderNumber: { type: String, required: true, unique: true },
  customer: { name: { type: String, required: true }, email: { type: String, required: true }, address: { type: String, required: true } },
  items: [{ productId: String, name: String, quantity: Number, unitPrice: Number, image: String }],
  subtotal: Number, shipping: Number, total: Number, currency: { type: String, default: 'USD' },
  salesforce: { synced: { type: Boolean, default: false }, recordId: String, error: String },
}, { timestamps: true });
export default mongoose.model('Order', orderSchema);

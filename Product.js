import mongoose from 'mongoose';
const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true }, category: { type: String, required: true },
  price: { type: Number, required: true, min: 0 }, compareAtPrice: Number,
  image: { type: String, required: true }, badge: { type: String, default: '' },
  color: { type: String, default: '' }, description: { type: String, default: '' },
  active: { type: Boolean, default: true },
}, { timestamps: true });
export default mongoose.model('Product', productSchema);

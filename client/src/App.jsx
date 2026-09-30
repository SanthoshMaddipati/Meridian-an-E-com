import { useEffect, useState } from 'react';
import { ArrowDownRight, ArrowRight, Check, ChevronDown, Heart, Menu, Minus, Plus, Search, ShoppingBag, UserRound, X } from 'lucide-react';

const money = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
const categories = ['All', 'Objects', 'Textiles', 'Lighting', 'Accessories', 'Furniture'];

export default function App() {
  const [products, setProducts] = useState([]);
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState(() => { try { return JSON.parse(localStorage.getItem('meridian-cart') || '[]'); } catch { return []; } });
  const [cartOpen, setCartOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [checkout, setCheckout] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [health, setHealth] = useState(null);
  const [order, setOrder] = useState(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const [accountMode, setAccountMode] = useState('login');
  const [accountUser, setAccountUser] = useState(() => { try { return JSON.parse(localStorage.getItem('meridian-user') || 'null'); } catch { return null; } });
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState('');

  useEffect(() => { fetch('/api/health').then((r) => r.json()).then(setHealth).catch(() => setHealth({ ok: false })); }, []);
  useEffect(() => {
    const params = new URLSearchParams({ category, search });
    fetch(`/api/products?${params}`).then((r) => r.json()).then((data) => { if (Array.isArray(data)) setProducts(data); }).catch(() => setProducts([]));
  }, [category, search]);
  useEffect(() => { localStorage.setItem('meridian-cart', JSON.stringify(cart)); }, [cart]);

  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shipping = subtotal === 0 || subtotal >= 150 ? 0 : 8;
  const add = (product) => {
    setCart((current) => { const found = current.find((item) => item._id === product._id); return found ? current.map((item) => item._id === product._id ? { ...item, quantity: item.quantity + 1 } : item) : [...current, { ...product, quantity: 1 }]; });
    setNotice(`${product.name} added to your bag`); window.setTimeout(() => setNotice(''), 2400);
  };
  const changeQuantity = (id, amount) => setCart((current) => current.map((item) => item._id === id ? { ...item, quantity: item.quantity + amount } : item).filter((item) => item.quantity > 0));
  const submitAuth = async (event) => {
    event.preventDefault(); setAuthBusy(true); setAuthError('');
    const form = new FormData(event.currentTarget);
    const body = { email: form.get('email'), password: form.get('password') };
    if (accountMode === 'signup') body.name = form.get('name');
    try {
      const response = await fetch(`/api/auth/${accountMode}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Could not sign in. Please try again.');
      localStorage.setItem('meridian-token', payload.token);
      localStorage.setItem('meridian-user', JSON.stringify(payload.user));
      setAccountUser(payload.user); setAccountOpen(false); setNotice(`Welcome${accountMode === 'signup' ? '' : ' back'}, ${payload.user.name.split(' ')[0]}`); window.setTimeout(() => setNotice(''), 2800);
    } catch (error) { setAuthError(error.message); }
    finally { setAuthBusy(false); }
  };
  const submitOrder = async (event) => {
    event.preventDefault(); setBusy(true);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ customer: { name: form.get('name'), email: form.get('email'), address: form.get('address') }, items: cart.map((item) => ({ productId: item._id, quantity: item.quantity })) }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'We could not place your order.');
      setOrder(payload.order); setCart([]); setCheckout(false);
    } catch (error) { setNotice(error.message); window.setTimeout(() => setNotice(''), 3500); }
    finally { setBusy(false); }
  };

  return <>
    <div className="announcement">A little something for the everyday <span>—</span> complimentary shipping over $150 <ArrowRight size={13} /></div>
    <header className="site-header">
      <button className="icon-button mobile-menu" aria-label="Open menu" onClick={() => setMobileOpen(!mobileOpen)}><Menu size={21} /></button>
      <nav className={`main-nav ${mobileOpen ? 'nav-open' : ''}`}><a href="#shop" onClick={() => setMobileOpen(false)}>Shop all</a><a href="#shop" onClick={() => { setCategory('Objects'); setMobileOpen(false); }}>Objects</a><a href="#story" onClick={() => setMobileOpen(false)}>Our story</a></nav>
      <a className="wordmark" href="#top">meridian<span>®</span></a>
      <div className="header-actions"><label className="search-box"><Search size={16} /><input value={search} onChange={(e) => { setSearch(e.target.value); document.getElementById('shop')?.scrollIntoView({ behavior: 'smooth' }); }} placeholder="Search" aria-label="Search products" />{search && <button onClick={() => setSearch('')} aria-label="Clear search"><X size={14} /></button>}</label><button className="account-button" onClick={() => { setAccountMode('login'); setAuthError(''); setAccountOpen(true); }} aria-label={accountUser ? `Account for ${accountUser.name}` : 'Sign in'}><UserRound size={18} /><span>{accountUser?.name?.split(' ')[0] || 'Account'}</span></button><button className="bag-button" onClick={() => setCartOpen(true)} aria-label={`Shopping bag, ${count} items`}><ShoppingBag size={19} /><span>Bag</span><b>{count}</b></button></div>
    </header>
    <main id="top">
      <section className="hero">
        <img className="hero-image" src="https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=2200&q=90" alt="A sunlit, thoughtfully furnished living room" />
        <div className="hero-shade" />
        <div className="hero-copy"><span className="eyebrow light">THE AUTUMN EDIT — NO. 04</span><h1>A softer kind<br />of <em>everyday.</em></h1><p>Considered pieces for slower mornings<br />and evenings that linger.</p><a href="#shop" className="hero-link">Explore the collection <ArrowDownRight size={17} /></a></div>
        <div className="hero-index">01 <span>/</span> 04</div><div className="hero-note"><span className="note-dot" /> Made for the way you live</div>
      </section>
      <section className="intro-strip" id="story"><div className="intro-label"><span className="tiny-line" /> A NOTE FROM MERIDIAN</div><p>Good things make room for <em>living.</em> Thoughtful details, honest materials, and pieces that feel like they’ve always belonged.</p><a href="#shop" className="text-link">OUR POINT OF VIEW <ArrowRight size={15} /></a></section>
      <section className="shop-section" id="shop">
        <div className="section-heading"><div><span className="eyebrow">A FEW THINGS WE LOVE</span><h2>Objects for <em>living.</em></h2></div><a href="#shop" className="desktop-see-all">View all objects <ArrowRight size={16} /></a></div>
        <div className="shop-toolbar"><div className="category-list">{categories.map((item) => <button key={item} className={category === item ? 'category active' : 'category'} onClick={() => setCategory(item)}>{item}</button>)}</div><button className="sort-button">Featured <ChevronDown size={14} /></button></div>
        {products.length ? <div className="product-grid">{products.map((product, index) => <article className="product-card" key={product._id}><div className="product-photo"><img src={product.image} alt={product.name} loading={index > 3 ? 'lazy' : 'eager'} /><div className="product-label">{product.badge || product.category.toUpperCase()}</div><button className="wish-button" aria-label={`Save ${product.name}`}><Heart size={17} /></button><button className="quick-add" onClick={() => add(product)}>Add to bag <Plus size={15} /></button></div><div className="product-meta"><div><h3>{product.name}</h3><span>{product.color || product.category}</span></div><div className="product-price">{product.compareAtPrice && <del>{money(product.compareAtPrice)}</del>}{money(product.price)}</div></div></article>)}</div> : <div className="empty-results"><span>Nothing on this shelf.</span><button onClick={() => { setSearch(''); setCategory('All'); }}>Show everything <ArrowRight size={14} /></button></div>}
        <a href="#shop" className="mobile-see-all">View all objects <ArrowRight size={16} /></a>
      </section>
      <section className="feature-banner"><img src="https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1800&q=85" alt="Natural textures in a peaceful home" loading="lazy" /><div className="feature-scrim" /><div className="feature-copy"><span className="eyebrow light">GOOD MATERIALS. GOOD COMPANY.</span><h2>Made to be<br /><em>kept close.</em></h2><a href="#story" className="hero-link">Get to know us <ArrowRight size={16} /></a></div><span className="feature-caption">NATURAL LINEN · RESPONSIBLY SOURCED OAK · ALWAYS THOUGHTFUL</span></section>
      <section className="values"><div><span>01</span><h3>Made with intention</h3><p>Every material and maker is chosen with the long view in mind.</p></div><div><span>02</span><h3>Better, not more</h3><p>Fewer things, thoughtfully made, and loved for a long time.</p></div><div><span>03</span><h3>Here for you</h3><p>A real person, a thoughtful answer. Any time you need us.</p></div></section>
    </main>
    <footer className="footer"><a className="wordmark footer-mark" href="#top">meridian<span>®</span></a><p>Considered living, since 2018.</p><div className="footer-bottom"><span>© 2026 MERIDIAN STUDIO</span><span>MADE WITH CARE, FOR EVERYWHERE.</span><a href="mailto:hello@meridian.studio">SAY HELLO <ArrowRight size={13} /></a></div></footer>
    {health?.salesforce === 'configured' && <div className="integration-pill"><span /> Salesforce configured</div>}
    {notice && <div className="toast"><Check size={16} /> {notice}</div>}
    {accountOpen && <div className="overlay account-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setAccountOpen(false); }}><section className="account-panel" aria-labelledby="account-title"><button className="icon-button account-close" onClick={() => setAccountOpen(false)} aria-label="Close account"><X size={20} /></button><span className="eyebrow">YOUR MERIDIAN ACCOUNT</span><h2 id="account-title">{accountMode === 'signup' ? 'Create your account.' : 'Welcome back.'}</h2><p className="account-intro">{accountMode === 'signup' ? 'Save your details and make checkout a little easier.' : 'Sign in to continue to your account.'}</p><form className="account-form" onSubmit={submitAuth}>{accountMode === 'signup' && <label>Your name<input name="name" autoComplete="name" required minLength="2" maxLength="100" placeholder="Your name" /></label>}<label>Email address<input name="email" type="email" autoComplete="email" required maxLength="254" placeholder="you@example.com" /></label><label>Password<input name="password" type="password" autoComplete={accountMode === 'signup' ? 'new-password' : 'current-password'} required minLength={accountMode === 'signup' ? 8 : undefined} maxLength="128" placeholder={accountMode === 'signup' ? 'At least 8 characters' : 'Your password'} /></label>{authError && <p className="auth-error" role="alert">{authError}</p>}<button className="checkout-button" disabled={authBusy}>{authBusy ? 'Please wait…' : accountMode === 'signup' ? 'Create account' : 'Sign in'} <ArrowRight size={16} /></button></form><p className="account-switch">{accountMode === 'signup' ? 'Already have an account?' : 'New to Meridian?'} <button onClick={() => { setAccountMode(accountMode === 'signup' ? 'login' : 'signup'); setAuthError(''); }}>{accountMode === 'signup' ? 'Sign in' : 'Create an account'}</button></p></section></div>}
    {cartOpen && <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) { setCartOpen(false); setCheckout(false); } }}><aside className="cart-drawer">
      <div className="drawer-head"><div><span className="eyebrow">YOUR LITTLE FINDS</span><h2>{checkout ? 'Checkout' : 'Your bag'} <span>({count})</span></h2></div><button className="icon-button" onClick={() => { setCartOpen(false); setCheckout(false); }} aria-label="Close bag"><X size={21} /></button></div>
      {order ? <div className="order-success"><div className="success-icon"><Check size={26} /></div><span className="eyebrow">ORDER PLACED</span><h3>Thank you,<br /><em>you have good taste.</em></h3><p>Your order <strong>{order.orderNumber}</strong> is in good hands. A confirmation is on its way to your inbox.</p><p className="sync-status">{order.salesforce?.synced ? 'Your order is synced with Salesforce.' : `Salesforce did not sync this order: ${order.salesforce?.error || 'No error details were returned.'}`}</p><button className="checkout-button" onClick={() => { setOrder(null); setCartOpen(false); }}>Keep exploring <ArrowRight size={16} /></button></div> : checkout ? <form className="checkout-form" onSubmit={submitOrder}><button type="button" className="back-to-bag" onClick={() => setCheckout(false)}>← Back to your bag</button><label>Full name<input name="name" autoComplete="name" required placeholder="Your name" /></label><label>Email address<input name="email" type="email" autoComplete="email" required placeholder="you@example.com" /></label><label>Shipping address<textarea name="address" autoComplete="street-address" required rows="3" placeholder="Street, city, postal code, country" /></label><div className="checkout-total"><span>Total</span><strong>{money(subtotal + shipping)}</strong></div><p className="demo-note">Development checkout · Does not collect payment.</p><button className="checkout-button" disabled={busy}>{busy ? 'Placing your order…' : 'Place order'} <ArrowRight size={16} /></button></form> : cart.length ? <><div className="shipping-progress">{subtotal >= 150 ? <><Check size={14} /> You unlocked complimentary shipping.</> : <>You’re {money(150 - subtotal)} away from complimentary shipping.</>}<div className="progress-track"><span style={{ width: `${Math.min(100, subtotal / 150 * 100)}%` }} /></div></div><div className="cart-items">{cart.map((item) => <div className="cart-item" key={item._id}><img src={item.image} alt=""/><div className="cart-item-info"><h3>{item.name}</h3><span>{item.color || item.category} · {money(item.price)}</span><div className="quantity"><button onClick={() => changeQuantity(item._id, -1)} aria-label="Remove one"><Minus size={13} /></button><span>{item.quantity}</span><button onClick={() => changeQuantity(item._id, 1)} aria-label="Add one"><Plus size={13} /></button></div></div><strong>{money(item.price * item.quantity)}</strong></div>)}</div><div className="cart-summary"><div><span>Subtotal</span><span>{money(subtotal)}</span></div><div><span>Shipping</span><span>{shipping === 0 ? 'Complimentary' : money(shipping)}</span></div><div className="summary-total"><strong>Total</strong><strong>{money(subtotal + shipping)}</strong></div><button className="checkout-button" onClick={() => setCheckout(true)}>Continue to checkout <ArrowRight size={16} /></button><p className="secure-note">Taxes calculated at checkout</p></div></> : <div className="empty-cart"><ShoppingBag size={28} /><h3>A little room for something lovely.</h3><p>Your bag is taking a quiet moment.</p><button className="checkout-button" onClick={() => setCartOpen(false)}>Explore the collection <ArrowRight size={16} /></button></div>}
    </aside></div>}
  </>;
}

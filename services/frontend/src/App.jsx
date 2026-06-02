import { useState, useEffect } from "react";
import "./App.css";

const API_BASE = {
  products: process.env.REACT_APP_PRODUCT_SERVICE || "http://localhost:3001",
  orders: process.env.REACT_APP_ORDER_SERVICE || "http://localhost:3002",
  users: process.env.REACT_APP_USER_SERVICE || "http://localhost:3003",
  payments: process.env.REACT_APP_PAYMENT_SERVICE || "http://localhost:3004",
};

export default function App() {
  const [page, setPage] = useState("home");
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState(null);
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [checkoutForm, setCheckoutForm] = useState({ cardNumber: "4242424242424242", cardExpiry: "12/26", cardCvc: "123" });

  const notify = (msg, type = "success") => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  useEffect(() => {
    fetchProducts();
    const saved = localStorage.getItem("user");
    if (saved) setUser(JSON.parse(saved));
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE.products}/products`);
      const data = await res.json();
      setProducts(data);
    } catch {
      // Use mock data if service unavailable
      setProducts([
        { id: "1", name: "Wireless Headphones", price: 89.99, category: "Electronics", image: "🎧", stock: 15, description: "Premium noise-cancelling wireless headphones with 30hr battery." },
        { id: "2", name: "Mechanical Keyboard", price: 149.99, category: "Electronics", image: "⌨️", stock: 8, description: "Tactile mechanical switches, RGB backlit, USB-C." },
        { id: "3", name: "Running Shoes", price: 119.99, category: "Sports", image: "👟", stock: 20, description: "Lightweight foam sole, breathable mesh upper." },
        { id: "4", name: "Leather Wallet", price: 49.99, category: "Accessories", image: "👜", stock: 30, description: "Slim genuine leather bifold with RFID blocking." },
        { id: "5", name: "Coffee Grinder", price: 79.99, category: "Kitchen", image: "☕", stock: 12, description: "Burr grinder with 15 grind settings, 200g hopper." },
        { id: "6", name: "Yoga Mat", price: 39.99, category: "Sports", image: "🧘", stock: 25, description: "Non-slip 6mm thick with alignment lines." },
      ]);
    }
    setLoading(false);
  };

  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === product.id);
      if (existing) return prev.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { ...product, qty: 1 }];
    });
    notify(`${product.name} added to cart!`);
  };

  const removeFromCart = (id) => setCart(prev => prev.filter(i => i.id !== id));
  const cartTotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const cartCount = cart.reduce((s, i) => s + i.qty, 0);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE.users}/auth/login`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginForm),
      });
      const data = await res.json();
      if (data.user) { setUser(data.user); localStorage.setItem("user", JSON.stringify(data.user)); notify("Welcome back!"); setPage("home"); }
      else notify("Invalid credentials", "error");
    } catch {
      // Mock login for demo
      const mockUser = { id: "u1", name: loginForm.email.split("@")[0], email: loginForm.email };
      setUser(mockUser); localStorage.setItem("user", JSON.stringify(mockUser)); notify("Welcome!"); setPage("home");
    }
  };

  const handleLogout = () => { setUser(null); localStorage.removeItem("user"); notify("Logged out"); };

  const handleCheckout = async () => {
    if (!user) { notify("Please log in to checkout", "error"); setPage("login"); return; }
    setLoading(true);
    try {
      // Process payment
      const payRes = await fetch(`${API_BASE.payments}/payments/process`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: cartTotal, card: checkoutForm, userId: user.id }),
      });
      const payData = await payRes.json();
      const paymentId = payData.paymentId || `pay_${Date.now()}`;

      // Create order
      await fetch(`${API_BASE.orders}/orders`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, items: cart, total: cartTotal, paymentId }),
      });

      setCart([]);
      notify("Order placed successfully! 🎉");
      setPage("orders");
      fetchOrders();
    } catch {
      notify("Order placed! (demo mode) 🎉");
      setCart([]);
      setPage("home");
    }
    setLoading(false);
  };

  const fetchOrders = async () => {
    if (!user) return;
    try {
      const res = await fetch(`${API_BASE.orders}/orders/user/${user.id}`);
      const data = await res.json();
      setOrders(data);
    } catch {
      setOrders([{ id: "ord_001", total: 89.99, status: "delivered", createdAt: new Date().toISOString(), items: [{ name: "Wireless Headphones", qty: 1 }] }]);
    }
  };

  useEffect(() => { if (page === "orders") fetchOrders(); }, [page]);

  return (
    <div className="app">
      {notification && <div className={`notification ${notification.type}`}>{notification.msg}</div>}

      <nav className="nav">
        <div className="nav-brand" onClick={() => setPage("home")}>⚡ ShopCloud</div>
        <div className="nav-links">
          <button onClick={() => setPage("home")} className={page === "home" ? "active" : ""}>Shop</button>
          {user && <button onClick={() => setPage("orders")} className={page === "orders" ? "active" : ""}>My Orders</button>}
          {user ? (
            <><span className="user-badge">👤 {user.name}</span><button onClick={handleLogout} className="btn-ghost">Logout</button></>
          ) : (
            <button onClick={() => setPage("login")} className="btn-primary">Login</button>
          )}
          <button onClick={() => setPage("cart")} className="cart-btn">
            🛒 <span className="cart-badge">{cartCount}</span>
          </button>
        </div>
      </nav>

      <main className="main">
        {page === "home" && (
          <div>
            <div className="hero">
              <h1>Next-Gen Shopping<br /><span className="accent">Microservices Powered</span></h1>
              <p>Running on AWS EKS · Docker · Kubernetes · Terraform</p>
              <div className="tech-badges">
                {["🐳 Docker","☸️ Kubernetes","🏗️ Terraform","⚡ GitHub Actions","☁️ AWS EKS"].map(t => (
                  <span key={t} className="badge">{t}</span>
                ))}
              </div>
            </div>
            {loading ? <div className="loader">Loading products...</div> : (
              <div className="products-grid">
                {products.map(p => (
                  <div key={p.id} className="product-card">
                    <div className="product-image">{p.image}</div>
                    <div className="product-info">
                      <span className="product-category">{p.category}</span>
                      <h3>{p.name}</h3>
                      <p className="product-desc">{p.description}</p>
                      <div className="product-footer">
                        <span className="price">${p.price}</span>
                        <button onClick={() => addToCart(p)} className="btn-primary">Add to Cart</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {page === "cart" && (
          <div className="cart-page">
            <h2>Shopping Cart</h2>
            {cart.length === 0 ? <p className="empty">Your cart is empty. <button onClick={() => setPage("home")} className="btn-link">Shop now →</button></p> : (
              <>
                <div className="cart-items">
                  {cart.map(item => (
                    <div key={item.id} className="cart-item">
                      <span className="cart-img">{item.image}</span>
                      <div className="cart-item-info">
                        <strong>{item.name}</strong>
                        <span>Qty: {item.qty}</span>
                      </div>
                      <span className="cart-price">${(item.price * item.qty).toFixed(2)}</span>
                      <button onClick={() => removeFromCart(item.id)} className="btn-ghost">✕</button>
                    </div>
                  ))}
                </div>
                <div className="cart-summary">
                  <div className="total">Total: <strong>${cartTotal.toFixed(2)}</strong></div>
                  <div className="checkout-form">
                    <h3>Payment Details</h3>
                    <input placeholder="Card Number" value={checkoutForm.cardNumber} onChange={e => setCheckoutForm(p => ({...p, cardNumber: e.target.value}))} />
                    <div className="row">
                      <input placeholder="MM/YY" value={checkoutForm.cardExpiry} onChange={e => setCheckoutForm(p => ({...p, cardExpiry: e.target.value}))} />
                      <input placeholder="CVC" value={checkoutForm.cardCvc} onChange={e => setCheckoutForm(p => ({...p, cardCvc: e.target.value}))} />
                    </div>
                  </div>
                  <button onClick={handleCheckout} className="btn-primary btn-lg" disabled={loading}>
                    {loading ? "Processing..." : `Place Order · $${cartTotal.toFixed(2)}`}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {page === "login" && (
          <div className="auth-page">
            <div className="auth-card">
              <h2>Sign In</h2>
              <form onSubmit={handleLogin}>
                <input type="email" placeholder="Email" value={loginForm.email} onChange={e => setLoginForm(p => ({...p, email: e.target.value}))} required />
                <input type="password" placeholder="Password" value={loginForm.password} onChange={e => setLoginForm(p => ({...p, password: e.target.value}))} required />
                <button type="submit" className="btn-primary btn-lg">Sign In</button>
              </form>
              <p className="hint">Demo: any email/password works</p>
            </div>
          </div>
        )}

        {page === "orders" && (
          <div className="orders-page">
            <h2>My Orders</h2>
            {orders.length === 0 ? <p className="empty">No orders yet.</p> : (
              <div className="orders-list">
                {orders.map(o => (
                  <div key={o.id} className="order-card">
                    <div className="order-header">
                      <span className="order-id">#{o.id}</span>
                      <span className={`status status-${o.status}`}>{o.status}</span>
                    </div>
                    <div className="order-items">{o.items?.map(i => i.name).join(", ")}</div>
                    <div className="order-footer">
                      <span>${o.total?.toFixed(2)}</span>
                      <span>{new Date(o.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="footer">
        <p>ShopCloud · Built with microservices · Deployed on AWS EKS</p>
        <p className="footer-tech">Frontend · Product Service · Order Service · User Service · Payment Service · Notification Service</p>
      </footer>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
    ShoppingBag,
    History,
    LogOut,
    Plus,
    Minus,
    Trash2,
    CheckCircle,
    Search,
    ShoppingCart,
    Clock,
    Key,
    Image as ImageIcon,
    ChevronDown,
    ChevronUp,
    Download
} from 'lucide-react';
import { downloadOrderPDF } from '../utils/pdfGenerator';
import ChangePassword from './ChangePassword';
import { toast } from 'react-toastify';

const RetailerDashboard = () => {
    const [products, setProducts] = useState([]);
    const [page, setPage] = useState(1);
    const [pageSize] = useState(10);
    const [totalCount, setTotalCount] = useState(0);
    const [loadingProducts, setLoadingProducts] = useState(false);
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
    const [orders, setOrders] = useState([]);
    const [cart, setCart] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [view, setView] = useState('shop'); // 'shop' or 'history'
    const [expandedOrderId, setExpandedOrderId] = useState(null);
    const [collapsedSections, setCollapsedSections] = useState({ pending: false, approved: false, delivered: false, rejected: false });
    const { user, logout } = useAuth();

    useEffect(() => {
        fetchMyOrders();
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm.trim());
        }, 350);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    useEffect(() => {
        fetchProducts();
    }, [page, debouncedSearchTerm]);

    useEffect(() => {
        const maxPages = Math.max(1, Math.ceil(totalCount / pageSize));
        if (page > maxPages) {
            setPage(maxPages);
        }
    }, [totalCount, page, pageSize]);

    const fetchProducts = async () => {
        setLoadingProducts(true);
        try {
            const parseProductsResponse = (res) => {
                if (res.data && typeof res.data === 'object' && !Array.isArray(res.data)) {
                    const items = Array.isArray(res.data.items) ? res.data.items : [];
                    const serverTotal = Number(res.data.totalCount);
                    return {
                        items,
                        totalCount: Number.isFinite(serverTotal) ? serverTotal : items.length,
                    };
                }
                if (Array.isArray(res.data)) {
                    const headerTotal = Number(res.headers?.['x-total-count']);
                    return {
                        items: res.data,
                        totalCount: Number.isFinite(headerTotal) ? headerTotal : res.data.length,
                    };
                }
                return { items: [], totalCount: 0 };
            };

            const query = debouncedSearchTerm.toLowerCase();

            // Global search fallback: collect full dataset when searching,
            // then filter client-side and paginate 10 per page.
            if (debouncedSearchTerm) {
                const requestPageSize = 100;
                const firstRes = await api.get('/Products', { params: { page: 1, pageSize: requestPageSize } });
                const firstParsed = parseProductsResponse(firstRes);
                let allProducts = [...firstParsed.items];
                const expectedTotal = firstParsed.totalCount;
                const seenIds = new Set(allProducts.map((p) => p.productId));
                let currentPage = 2;

                while (allProducts.length < expectedTotal) {
                    const nextRes = await api.get('/Products', { params: { page: currentPage, pageSize: requestPageSize } });
                    const nextParsed = parseProductsResponse(nextRes);
                    if (!nextParsed.items.length) break;

                    let added = 0;
                    nextParsed.items.forEach((item) => {
                        if (!seenIds.has(item.productId)) {
                            seenIds.add(item.productId);
                            allProducts.push(item);
                            added += 1;
                        }
                    });
                    if (added === 0) break;
                    currentPage += 1;
                }

                const filtered = allProducts.filter((p) =>
                    (p.productName || '').toLowerCase().includes(query) ||
                    (p.description || '').toLowerCase().includes(query)
                );

                const start = (page - 1) * pageSize;
                setTotalCount(filtered.length);
                setProducts(filtered.slice(start, start + pageSize));
                return;
            }

            const res = await api.get('/Products', { params: { page, pageSize } });
            const parsed = parseProductsResponse(res);
            setProducts(parsed.items);
            setTotalCount(parsed.totalCount);
        } catch (err) { console.error(err); }
        finally { setLoadingProducts(false); }
    };

    const fetchMyOrders = async () => {
        try {
            const res = await api.get('/Orders/my-history');
            setOrders(res.data);
        } catch (err) { console.error(err); }
    };

    const addToCart = (product) => {
        setCart(prev => {
            const existing = prev.find(item => item.productId === product.productId);
            if (existing) {
                return prev.map(item => item.productId === product.productId ? { ...item, quantity: item.quantity + 1 } : item);
            }
            return [...prev, { ...product, quantity: 1 }];
        });
    };

    const removeFromCart = (productId) => {
        setCart(prev => prev.filter(item => item.productId !== productId));
    };

    const updateQuantity = (productId, delta) => {
        setCart(prev => prev.map(item => {
            if (item.productId === productId) {
                const newQty = Math.max(1, item.quantity + delta);
                return { ...item, quantity: newQty };
            }
            return item;
        }));
    };

    const placeOrder = async () => {
        if (cart.length === 0) return;
        try {
            await api.post('/Orders', {
                items: cart.map(item => ({ productId: item.productId, quantity: item.quantity }))
            });
            setCart([]);
            setView('history');
            fetchMyOrders();
            toast.success("Order sent to Wholesaler successfully!");
        } catch (err) {
            toast.error(err.response?.data || "Failed to place order.");
        }
    };

    const filteredProducts = Array.isArray(products) ? products : [];

    const cartTotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

    const renderCartContent = () => (
        <>
            <div style={{ flex: 1, overflowY: 'auto', marginBottom: '1.5rem' }}>
                {cart.map(item => (
                    <div key={item.productId} style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid #f1f5f9' }}>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: '600', fontSize: '1rem' }}>{item.productName}</div>
                            <div style={{ color: 'var(--secondary)', fontSize: '0.9rem' }}>₹{item.price.toFixed(2)} / {item.unit || 'pcs'}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.75rem' }}>
                                <button onClick={() => updateQuantity(item.productId, -1)} style={{ width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #e2e8f0', borderRadius: '6px', background: 'white', cursor: 'pointer' }}><Minus size={16} /></button>
                                <span style={{ fontWeight: '700', fontSize: '1rem' }}>{item.quantity}</span>
                                <button onClick={() => updateQuantity(item.productId, 1)} style={{ width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #e2e8f0', borderRadius: '6px', background: 'white', cursor: 'pointer' }}><Plus size={16} /></button>
                            </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <button onClick={() => removeFromCart(item.productId)} style={{ color: '#ef4444', border: 'none', background: 'none', cursor: 'pointer', marginBottom: '0.5rem', padding: '0.5rem' }}><Trash2 size={18} /></button>
                            <div style={{ fontWeight: '800', fontSize: '1.1rem' }}>₹{(item.price * item.quantity).toFixed(2)}</div>
                        </div>
                    </div>
                ))}
                {cart.length === 0 && (
                    <div style={{ textAlign: 'center', color: '#94a3b8', padding: '3rem 0' }}>
                        <ShoppingBag size={64} style={{ opacity: 0.1, marginBottom: '1.5rem' }} />
                        <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Empty Cart awaits!</h3>
                        <p>Explore our marketplace and add items.</p>
                        <button onClick={() => setView('shop')} className="btn btn-primary" style={{ marginTop: '1.5rem' }}>Shop Now</button>
                    </div>
                )}
            </div>

            {cart.length > 0 && (
                <div style={{ borderTop: '2px solid #f1f5f9', paddingTop: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center' }}>
                        <span style={{ fontSize: '1.2rem', fontWeight: '600' }}>Total Order Cost</span>
                        <span style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--primary)' }}>₹{cartTotal.toFixed(2)}</span>
                    </div>
                    <button
                        className="btn btn-primary"
                        style={{ width: '100%', padding: '1.25rem', justifyContent: 'center', fontSize: '1.1rem', borderRadius: '12px' }}
                        disabled={cart.length === 0}
                        onClick={placeOrder}
                    >
                        Place Wholesale Order
                    </button>
                </div>
            )}
        </>
    );

    const renderOrderHistoryCard = (order) => (
        <div key={order.orderId} className="order-card">
            <h3>Order #{order.orderId}</h3>
            <p>Status: {order.status}</p>
            <button
                onClick={() => downloadOrderPDF(order, user?.name)}
                className="btn btn-primary"
                style={{ marginTop: '1.5rem', width: '100%', justifyContent: 'center', background: '#334155' }}
            >
                <Download size={18} /> Download Items List
            </button>
        </div>
    );

    return (
        <div className="dashboard-layout">
            {/* Sidebar */}
            <aside className="sidebar">
                <div style={{ padding: '0 1rem 2rem 1rem' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: '800', letterSpacing: '-0.5px' }}>Retailer<span style={{ color: 'var(--primary-light)' }}>Pro</span></h2>
                </div>

                <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <button onClick={() => setView('shop')} className="sidebar-btn" style={{ background: view === 'shop' ? 'rgba(255,255,255,0.1)' : 'transparent', border: 'none', color: 'white', width: '100%', textAlign: 'left', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', borderRadius: '8px' }}>
                        <ShoppingBag size={20} /> <span className="nav-label">Browse Marketplace</span>
                    </button>
                    <button onClick={() => setView('cart')} className="sidebar-btn" style={{ background: view === 'cart' ? 'rgba(255,255,255,0.1)' : 'transparent', border: 'none', color: 'white', width: '100%', textAlign: 'left', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', borderRadius: '8px', position: 'relative' }}>
                        <ShoppingCart size={20} />
                        <span className="nav-label">My Cart</span>
                        {cart.length > 0 && (
                            <span style={{ position: 'absolute', right: '1rem', background: 'var(--danger)', color: 'white', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '10px', fontWeight: '700' }}>
                                {cart.length}
                            </span>
                        )}
                    </button>
                    <button onClick={() => setView('history')} className="sidebar-btn" style={{ background: view === 'history' ? 'rgba(255,255,255,0.1)' : 'transparent', border: 'none', color: 'white', width: '100%', textAlign: 'left', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', borderRadius: '8px' }}>
                        <History size={20} /> <span className="nav-label">My Orders</span>
                    </button>
                    <button onClick={() => setView('security')} className="sidebar-btn" style={{ background: view === 'security' ? 'rgba(255,255,255,0.1)' : 'transparent', border: 'none', color: 'white', width: '100%', textAlign: 'left', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', borderRadius: '8px' }}>
                        <Key size={20} /> <span className="nav-label">Security</span>
                    </button>
                </nav>

                {/* Desktop Profile & Logout */}
                <div className="sidebar-profile" style={{ marginTop: 'auto', padding: '1.5rem 1rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', color: 'white' }}>
                            {user?.name?.charAt(0)}
                        </div>
                        <div style={{ overflow: 'hidden' }}>
                            <div style={{ fontWeight: '600', fontSize: '0.9rem', whiteSpace: 'nowrap', textOverflow: 'ellipsis', color: 'white' }}>{user?.name}</div>
                            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>{user?.role}</div>
                        </div>
                    </div>
                    <button onClick={logout} className="sidebar-btn" style={{ width: '100%', background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', border: 'none', padding: '0.6rem', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <LogOut size={18} /> Logout
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="content-wrapper" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <main className="main-content responsive-flex-gap">
                    <div style={{ flex: 1 }}>
                        {view === 'security' ? (
                            <ChangePassword />
                        ) : view === 'shop' ? (
                            <>
                                <header style={{ marginBottom: '2.5rem' }}>
                                    <h1 style={{ fontSize: '1.8rem', fontWeight: '700' }}>Wholesale Marketplace</h1>
                                    <p style={{ color: 'var(--secondary)' }}>Select products to add to your order list.</p>
                                    <div style={{ marginTop: '1.5rem', position: 'relative', maxWidth: '400px' }}>
                                        <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                        <input
                                            type="text"
                                            className="form-input"
                                            style={{ paddingLeft: '3rem' }}
                                            placeholder="Search medical supplies..."
                                            value={searchTerm}
                                            onChange={(e) => {
                                                setSearchTerm(e.target.value);
                                                setPage(1);
                                            }}
                                        />
                                    </div>
                                </header>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
                                    {filteredProducts.map(product => (
                                        <div key={product.productId} className="glass-card" style={{ padding: '0', overflow: 'hidden', background: 'white', display: 'flex', flexDirection: 'column', border: '1px solid #e2e8f0' }}>
                                            <div style={{ height: '180px', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                {product.imageUrl ? (
                                                    <img src={product.imageUrl} alt={product.productName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                ) : (
                                                    <ImageIcon size={48} style={{ color: '#cbd5e1' }} />
                                                )}
                                            </div>
                                            <div style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                                                <h3 style={{ fontWeight: '700', marginBottom: '0.5rem' }}>{product.productName}</h3>
                                                <p style={{ color: 'var(--secondary)', fontSize: '0.85rem', marginBottom: '1.5rem', flex: 1 }}>{product.description}</p>
                                                <div style={{ marginBottom: '1rem', fontSize: '0.85rem', color: 'var(--secondary)' }}>
                                                    <strong>Unit:</strong> {product.unit}
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid #f1f5f9' }}>
                                                    <span style={{ fontWeight: '800', fontSize: '1.2rem', color: 'var(--primary)' }}>₹{product.price.toFixed(2)}</span>
                                                    <button
                                                        className="btn btn-primary"
                                                        style={{ padding: '0.5rem 1rem' }}
                                                        onClick={() => addToCart(product)}
                                                        disabled={product.stockQuantity === 0}
                                                    >
                                                        {product.stockQuantity === 0 ? 'Out of Stock' : <><Plus size={16} /> Add</>}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {!loadingProducts && filteredProducts.length === 0 && (
                                    <div style={{ marginTop: '1.5rem', textAlign: 'center', color: 'var(--secondary)', fontStyle: 'italic' }}>
                                        No products found for your search.
                                    </div>
                                )}

                                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.75rem', marginTop: '1.25rem' }}>
                                    <button
                                        className="btn"
                                        onClick={() => setPage(Math.max(1, page - 1))}
                                        disabled={page <= 1 || loadingProducts}
                                        style={{ padding: '0.5rem 0.75rem' }}
                                    >
                                        Prev
                                    </button>
                                    <div style={{ fontWeight: '700' }}>
                                        Page {page} of {Math.max(1, Math.ceil(totalCount / pageSize))}
                                    </div>
                                    <button
                                        className="btn"
                                        onClick={() => setPage(Math.min(Math.max(1, Math.ceil(totalCount / pageSize)), page + 1))}
                                        disabled={loadingProducts || page >= Math.max(1, Math.ceil(totalCount / pageSize))}
                                        style={{ padding: '0.5rem 0.75rem' }}
                                    >
                                        Next
                                    </button>
                                </div>
                            </>
                        ) : view === 'cart' ? (
                            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                                <header style={{ marginBottom: '2.5rem' }}>
                                    <h1 style={{ fontSize: '1.8rem', fontWeight: '700' }}>Your Shopping Cart</h1>
                                    <p style={{ color: 'var(--secondary)' }}>Review your items and place your order.</p>
                                </header>
                                <div className="glass-card" style={{ background: 'white', padding: '2rem' }}>
                                    {renderCartContent()}
                                </div>
                            </div>
                        ) : (
                            <>
                                <header style={{ marginBottom: '2.5rem' }}>
                                    <h1 style={{ fontSize: '1.8rem', fontWeight: '700' }}>Order History & Tracking</h1>
                                    <p style={{ color: 'var(--secondary)' }}>Track your recent orders and delivery status.</p>
                                </header>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                                    {/* Pending Orders Section */}
                                    <div>
                                        <div
                                            onClick={() => setCollapsedSections(prev => ({ ...prev, pending: !prev.pending }))}
                                            style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}
                                        >
                                            <h4 style={{ fontSize: '0.9rem', color: '#f59e0b', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <Clock size={16} /> Pending Orders ({orders.filter(o => o.status === 'Pending').length})
                                            </h4>
                                            {collapsedSections.pending ? <ChevronDown size={18} color="#f59e0b" /> : <ChevronUp size={18} color="#f59e0b" />}
                                        </div>
                                        {!collapsedSections.pending && (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                                {orders.filter(o => o.status === 'Pending').map(order => (
                                                    <OrderHistoryCard key={order.orderId} order={order} expandedOrderId={expandedOrderId} setExpandedOrderId={setExpandedOrderId} user={user} />
                                                ))}
                                                {orders.filter(o => o.status === 'Pending').length === 0 && <div style={{ fontSize: '0.85rem', color: 'var(--secondary)', fontStyle: 'italic', paddingLeft: '1rem' }}>No pending orders.</div>}
                                            </div>
                                        )}
                                    </div>

                                    {/* Approved Orders Section */}
                                    <div>
                                        <div
                                            onClick={() => setCollapsedSections(prev => ({ ...prev, approved: !prev.approved }))}
                                            style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}
                                        >
                                            <h4 style={{ fontSize: '0.9rem', color: '#3b82f6', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <CheckCircle size={16} /> Approved Orders ({orders.filter(o => (o.status === 'Approved' || o.status === 'Processing')).length})
                                            </h4>
                                            {collapsedSections.approved ? <ChevronDown size={18} color="#3b82f6" /> : <ChevronUp size={18} color="#3b82f6" />}
                                        </div>
                                        {!collapsedSections.approved && (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                                {orders.filter(o => (o.status === 'Approved' || o.status === 'Processing')).map(order => (
                                                    <OrderHistoryCard key={order.orderId} order={order} expandedOrderId={expandedOrderId} setExpandedOrderId={setExpandedOrderId} user={user} />
                                                ))}
                                                {orders.filter(o => (o.status === 'Approved' || o.status === 'Processing')).length === 0 && <div style={{ fontSize: '0.85rem', color: 'var(--secondary)', fontStyle: 'italic', paddingLeft: '1rem' }}>No approved orders.</div>}
                                            </div>
                                        )}
                                    </div>

                                    {/* Delivered Orders Section */}
                                    <div>
                                        <div
                                            onClick={() => setCollapsedSections(prev => ({ ...prev, delivered: !prev.delivered }))}
                                            style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}
                                        >
                                            <h4 style={{ fontSize: '0.9rem', color: '#10b981', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <ShoppingBag size={16} /> Delivered Orders ({orders.filter(o => o.status === 'Delivered').length})
                                            </h4>
                                            {collapsedSections.delivered ? <ChevronDown size={18} color="#10b981" /> : <ChevronUp size={18} color="#10b981" />}
                                        </div>
                                        {!collapsedSections.delivered && (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                                {orders.filter(o => o.status === 'Delivered').map(order => (
                                                    <OrderHistoryCard key={order.orderId} order={order} expandedOrderId={expandedOrderId} setExpandedOrderId={setExpandedOrderId} user={user} />
                                                ))}
                                                {orders.filter(o => o.status === 'Delivered').length === 0 && <div style={{ fontSize: '0.85rem', color: 'var(--secondary)', fontStyle: 'italic', paddingLeft: '1rem' }}>No delivered orders.</div>}
                                            </div>
                                        )}
                                    </div>

                                    {/* Rejected Orders Section */}
                                    <div>
                                        <div
                                            onClick={() => setCollapsedSections(prev => ({ ...prev, rejected: !prev.rejected }))}
                                            style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}
                                        >
                                            <h4 style={{ fontSize: '0.9rem', color: '#ef4444', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <Trash2 size={16} /> Rejected Orders ({orders.filter(o => o.status === 'Rejected').length})
                                            </h4>
                                            {collapsedSections.rejected ? <ChevronDown size={18} color="#ef4444" /> : <ChevronUp size={18} color="#ef4444" />}
                                        </div>
                                        {!collapsedSections.rejected && (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                                {orders.filter(o => o.status === 'Rejected').map(order => (
                                                    <OrderHistoryCard key={order.orderId} order={order} expandedOrderId={expandedOrderId} setExpandedOrderId={setExpandedOrderId} user={user} />
                                                ))}
                                                {orders.filter(o => o.status === 'Rejected').length === 0 && <div style={{ fontSize: '0.85rem', color: 'var(--secondary)', fontStyle: 'italic', paddingLeft: '1rem' }}>No rejected orders.</div>}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Shopping Cart Sidebar (Desktop only) */}
                    {view === 'shop' && (
                        <div className="cart-sidebar mobile-hide" style={{ width: '350px' }}>
                            <div className="glass-card" style={{ padding: '1.5rem', position: 'sticky', top: '2rem', display: 'flex', flexDirection: 'column' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
                                    <ShoppingCart size={24} style={{ color: 'var(--primary)' }} />
                                    <h2 style={{ fontSize: '1.25rem' }}>Your Current Cart</h2>
                                </div>
                                {renderCartContent()}
                            </div>
                        </div>
                    )}
                </main>
            </div>

            {/* Mobile Footer (Profile & Logout) */}
            <div className="mobile-only-footer">
                <div className="glass-card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '1rem', background: 'white' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#ec4899', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', color: 'white' }}>
                            {user?.name?.charAt(0)}
                        </div>
                        <div>
                            <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>{user?.name}</div>
                            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{user?.role}</div>
                        </div>
                    </div>
                    <button onClick={logout} className="btn" style={{ background: '#fee2e2', color: '#ef4444', padding: '0.5rem 1rem' }}>
                        <LogOut size={18} /> Logout
                    </button>
                </div>
            </div>
        </div>
    );
};

const OrderHistoryCard = ({ order, expandedOrderId, setExpandedOrderId, user }) => (
    <div key={order.orderId} className="glass-card" style={{ padding: '1.5rem', background: 'white' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
            <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--secondary)' }}>Order #{order.orderId}</div>
                <div style={{ fontWeight: '600' }}>{new Date(order.orderDate).toLocaleString()}</div>
            </div>
            <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div>
                    <div style={{ marginBottom: '0.5rem' }}><span className={`badge badge-${order.status.toLowerCase()}`}>{order.status}</span></div>
                    <div style={{ fontWeight: '800', fontSize: '1.2rem' }}>₹{order.totalAmount.toFixed(2)}</div>
                </div>
                <button
                    onClick={() => setExpandedOrderId(expandedOrderId === order.orderId ? null : order.orderId)}
                    className="btn"
                    style={{ padding: '0.5rem', background: '#f1f5f9', color: 'var(--primary)', borderRadius: '50%' }}
                >
                    {expandedOrderId === order.orderId ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>
            </div>
        </div>

        {expandedOrderId === order.orderId && (
            <>
                <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px' }}>
                    <h4 style={{ fontSize: '0.85rem', marginBottom: '0.5rem', color: 'var(--secondary)' }}>Ordered Items</h4>
                    {order.items.map((item, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '0.25rem' }}>
                            <span>{item.quantity}{item.unit ? ` ${item.unit}` : ''} x {item.productName}</span>
                            <span style={{ fontWeight: '600' }}>₹{(item.quantity * item.price).toFixed(2)}</span>
                        </div>
                    ))}
                    <button
                        onClick={() => downloadOrderPDF(order, user?.name)}
                        className="btn btn-primary"
                        style={{ marginTop: '1.5rem', width: '100%', justifyContent: 'center', background: '#334155' }}
                    >
                        <Download size={18} /> Download Items List
                    </button>
                </div>
            </>
        )}
    </div>
);

export default RetailerDashboard;

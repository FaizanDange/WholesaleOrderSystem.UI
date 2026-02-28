import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
    Package,
    ShoppingCart,
    Users,
    LogOut,
    Plus,
    Trash2,
    CheckCircle,
    Clock,
    TrendingUp,
    Key,
    Search,
    Filter,
    Image as ImageIcon,
    ChevronUp,
    ChevronDown,
    ShieldCheck,
    UserPlus,
    Eye,
    EyeOff,
    Download,
    Phone,
    MapPin
} from 'lucide-react';
import { downloadOrderPDF } from '../utils/pdfGenerator';
import ChangePassword from './ChangePassword';

const AdminDashboard = () => {
    const [products, setProducts] = useState([]);
    const [orders, setOrders] = useState([]);
    const [showProductModal, setShowProductModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [expandedOrderId, setExpandedOrderId] = useState(null);
    const [expandedHistoryOrderId, setExpandedHistoryOrderId] = useState(null);
    const [activeTab, setActiveTab] = useState('inventory'); // 'inventory', 'orders', 'customers'
    const [customers, setCustomers] = useState([]);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [customerOrders, setCustomerOrders] = useState([]);
    const [newProduct, setNewProduct] = useState({ productName: '', description: '', price: '', stockQuantity: '', unit: 'pcs', imageUrl: '', imageFile: null });
    const [searchTerm, setSearchTerm] = useState('');
    const [stockFilter, setStockFilter] = useState('all'); // 'all', 'instock', 'outofstock'
    const [collapsedSections, setCollapsedSections] = useState({ pending: false, approved: false, delivered: false });
    const [admins, setAdmins] = useState([]);
    const [showAdminModal, setShowAdminModal] = useState(false);
    const [showAdminPassword, setShowAdminPassword] = useState(false);
    const [newAdmin, setNewAdmin] = useState({ name: '', email: '', password: '' });
    const { user, logout } = useAuth();

    useEffect(() => {
        fetchProducts();
        fetchOrders();
        fetchCustomers();
        fetchAdmins();
    }, []);

    // Image validation settings
    const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
    const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB
    const validateImage = (file) => {
        if (!file) return { valid: true };
        if (!ALLOWED_IMAGE_TYPES.includes(file.type)) return { valid: false, message: 'Only JPEG, PNG or WebP images are allowed.' };
        if (file.size > MAX_IMAGE_SIZE) return { valid: false, message: 'Image must be smaller than 2MB.' };
        return { valid: true };
    };

    const fetchAdmins = async () => {
        try {
            const res = await api.get('/Users/admins');
            setAdmins(res.data);
        } catch (err) { console.error(err); }
    };

    const fetchCustomers = async () => {
        try {
            const res = await api.get('/Users/customers');
            setCustomers(res.data);
        } catch (err) { console.error(err); }
    };

    const fetchCustomerHistory = async (customer) => {
        try {
            const res = await api.get(`/Orders/customer/${customer.userId}`);
            setCustomerOrders(res.data);
            setSelectedCustomer(customer);
        } catch (err) { console.error(err); }
    };

    const fetchProducts = async () => {
        try {
            const res = await api.get('/Products');
            setProducts(res.data);
        } catch (err) { console.error(err); }
    };

    const fetchOrders = async () => {
        try {
            const res = await api.get('/Orders');
            // We need to fetch full details for each order to see items
            const fullOrders = await Promise.all(res.data.map(async (order) => {
                const detailRes = await api.get(`/Orders/customer/${order.userId}`);
                const specificOrder = detailRes.data.find(o => o.orderId === order.orderId);
                return { ...order, items: specificOrder?.items || [] };
            }));
            setOrders(fullOrders);
        } catch (err) { console.error(err); }
    };

    const handleSaveProduct = async (e) => {
        e.preventDefault();
        // Validate image file before building FormData
        const imgValidation = validateImage(newProduct.imageFile);
        if (!imgValidation.valid) {
            alert(imgValidation.message);
            return;
        }
        const formData = new FormData();
        formData.append('ProductName', newProduct.productName);
        formData.append('Description', newProduct.description);
        formData.append('Price', newProduct.price);
        formData.append('StockQuantity', newProduct.stockQuantity);
        formData.append('Unit', newProduct.unit);

        if (newProduct.imageFile) {
            formData.append('image', newProduct.imageFile);
        } else if (newProduct.imageUrl) {
            formData.append('ImageUrl', newProduct.imageUrl);
        }

        try {
            if (editingProduct) {
                await api.put(`/Products/${editingProduct.productId}`, formData);
            } else {
                await api.post('/Products', formData);
            }
            setShowProductModal(false);
            setEditingProduct(null);
            setNewProduct({ productName: '', description: '', price: '', stockQuantity: '', unit: 'pcs', imageUrl: '', imageFile: null });
            fetchProducts();
        } catch (err) { alert("Failed to save product"); }
    };

    const openEditModal = (product) => {
        setEditingProduct(product);
        setNewProduct({
            productName: product.productName,
            description: product.description,
            price: product.price,
            stockQuantity: product.stockQuantity,
            unit: product.unit || 'pcs',
            imageUrl: product.imageUrl || '',
            imageFile: null
        });
        setShowProductModal(true);
    };

    const openAddModal = () => {
        setEditingProduct(null);
        setNewProduct({ productName: '', description: '', price: '', stockQuantity: '', imageUrl: '', imageFile: null });
        setShowProductModal(true);
    };

    const handleDeleteProduct = async (id) => {
        if (window.confirm("Are you sure you want to remove this product?")) {
            try {
                await api.delete(`/Products/${id}`);
                fetchProducts();
            } catch (err) { alert("Delete failed"); }
        }
    };

    const handleCreateAdmin = async (e) => {
        e.preventDefault();
        try {
            await api.post('/Auth/create-admin', newAdmin);
            alert("Administrative account created successfully");
            setShowAdminModal(false);
            setNewAdmin({ name: '', email: '', password: '' });
            fetchAdmins();
        } catch (err) {
            alert(err.response?.data?.message || "Failed to create admin");
        }
    };

    const updateOrderStatus = async (id, status) => {
        try {
            await api.patch(`/Orders/${id}/status`, { status });
            fetchOrders();
            if (selectedCustomer) {
                fetchCustomerHistory(selectedCustomer);
            }
        } catch (err) { alert("Status update failed"); }
    };

    const renderOrderCard = (order) => (
        <div key={order.orderId} style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1rem', background: 'white', transition: 'transform 0.2s' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                    <span style={{ fontWeight: '700' }}>Order #{order.orderId}</span>
                    <div style={{ fontSize: '0.85rem', color: 'var(--secondary)' }}>{new Date(order.orderDate).toLocaleString()}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className={`badge badge-${order.status.toLowerCase()}`}>{order.status}</span>
                    <button
                        onClick={() => setExpandedHistoryOrderId(expandedHistoryOrderId === order.orderId ? null : order.orderId)}
                        className="btn"
                        style={{ padding: '0.4rem', background: '#f1f5f9', color: 'var(--primary)', borderRadius: '50%' }}
                    >
                        {expandedHistoryOrderId === order.orderId ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '0.75rem' }}>
                <span style={{ color: 'var(--secondary)' }}>Total Amount:</span>
                <span style={{ fontWeight: '800', color: 'var(--text-dark)' }}>₹{order.totalAmount.toFixed(2)}</span>
            </div>

            {expandedHistoryOrderId === order.orderId && (
                <div style={{ marginTop: '0.5rem', borderTop: '1px dashed #cbd5e1', paddingTop: '0.75rem' }}>
                    <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.5rem', fontWeight: '700' }}>PURCHASED ITEMS:</p>
                    {order.items?.map((item, idx) => (
                        <div key={idx} style={{ fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                            <span>{item.quantity}{item.unit ? ` ${item.unit}` : ''} x {item.productName}</span>
                            <span style={{ fontWeight: '600' }}>₹{(item.quantity * item.price).toFixed(2)}</span>
                        </div>
                    ))}
                    <button
                        onClick={() => downloadOrderPDF(order, selectedCustomer?.name || 'Customer')}
                        className="btn"
                        style={{ marginTop: '1.25rem', width: '100%', justifyContent: 'center', background: '#f1f5f9', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                    >
                        <Download size={16} /> Download Items List
                    </button>
                </div>
            )}
        </div>
    );

    return (
        <div className="dashboard-layout">
            {/* Sidebar */}
            <aside className="sidebar">
                <div style={{ padding: '0 1rem 2rem 1rem' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: '800', letterSpacing: '-0.5px' }}>Wholesale<span style={{ color: 'var(--primary-light)' }}>Box</span></h2>
                </div>

                <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <div className="mobile-hide" style={{ color: 'var(--secondary)', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', marginBottom: '1rem', padding: '0 1rem' }}>Admin Menu</div>
                    <button onClick={() => setActiveTab('inventory')} className="sidebar-btn" style={{ background: activeTab === 'inventory' ? 'rgba(255,255,255,0.1)' : 'transparent', border: 'none', color: 'white', width: '100%', textAlign: 'left', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', borderRadius: '8px' }}>
                        <Package size={20} /> <span className="nav-label">Inventory</span>
                    </button>
                    <button onClick={() => setActiveTab('orders')} className="sidebar-btn" style={{ background: activeTab === 'orders' ? 'rgba(255,255,255,0.1)' : 'transparent', border: 'none', color: 'white', width: '100%', textAlign: 'left', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', borderRadius: '8px' }}>
                        <ShoppingCart size={20} /> <span className="nav-label">Orders</span>
                    </button>
                    <button onClick={() => setActiveTab('customers')} className="sidebar-btn" style={{ background: activeTab === 'customers' ? 'rgba(255,255,255,0.1)' : 'transparent', border: 'none', color: 'white', width: '100%', textAlign: 'left', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', borderRadius: '8px' }}>
                        <Users size={20} /> <span className="nav-label">Retailers</span>
                    </button>
                    <button onClick={() => setActiveTab('security')} className="sidebar-btn" style={{ background: activeTab === 'security' ? 'rgba(255,255,255,0.1)' : 'transparent', border: 'none', color: 'white', width: '100%', textAlign: 'left', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', borderRadius: '8px' }}>
                        <Key size={20} /> <span className="nav-label">Security</span>
                    </button>
                    <button onClick={() => setActiveTab('admins')} className="sidebar-btn" style={{ background: activeTab === 'admins' ? 'rgba(255,255,255,0.1)' : 'transparent', border: 'none', color: 'white', width: '100%', textAlign: 'left', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', borderRadius: '8px' }}>
                        <ShieldCheck size={20} /> <span className="nav-label">Staff Management</span>
                    </button>
                </nav>

                {/* Desktop Profile & Logout */}
                <div className="sidebar-profile" style={{ marginTop: 'auto', padding: '1.5rem 1rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700' }}>
                            {user?.name?.charAt(0)}
                        </div>
                        <div style={{ overflow: 'hidden' }}>
                            <div style={{ fontWeight: '600', fontSize: '0.9rem', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{user?.name}</div>
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
                <main className="main-content">
                    <header className="header-actions" style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                        <div>
                            <h1 style={{ fontSize: '1.8rem', fontWeight: '700' }}>Admin Dashboard</h1>
                            <p style={{ color: 'var(--secondary)' }}>Manage your wholesale operations below.</p>
                        </div>
                        <button className="btn btn-primary" onClick={openAddModal} style={{ whiteSpace: 'nowrap' }}>
                            <Plus size={20} /> Add Product
                        </button>
                    </header>

                    {/* Stats */}
                    <div className="stats-grid">
                        <div className="glass-card stat-card">
                            <div style={{ padding: '0.75rem', borderRadius: '12px', background: '#dbeafe', color: '#1e40af' }}><Package size={24} /></div>
                            <div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--secondary)' }}>Total Products</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>{products.length}</div>
                            </div>
                        </div>
                        <div className="glass-card stat-card">
                            <div style={{ padding: '0.75rem', borderRadius: '12px', background: '#fef3c7', color: '#92400e' }}><ShoppingCart size={24} /></div>
                            <div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--secondary)' }}>Active Orders</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>{orders.filter(o => o.status === 'Pending').length}</div>
                            </div>
                        </div>
                    </div>

                    {/* Orders Section */}
                    {activeTab === 'orders' && (
                        <section id="orders" className="glass-card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
                            <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>Incoming Customer Orders</h2>
                            <div style={{ overflowX: 'auto' }}>
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Order ID</th>
                                            <th>Customer</th>
                                            <th>Date</th>
                                            <th>Items</th>
                                            <th>Total Amount</th>
                                            <th>Status</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {orders.map(order => (
                                            <React.Fragment key={order.orderId}>
                                                <tr>
                                                    <td style={{ fontWeight: '600' }}>#{order.orderId}</td>
                                                    <td>{order.customerName}</td>
                                                    <td>{new Date(order.orderDate).toLocaleDateString()}</td>
                                                    <td>{order.totalItems} Items</td>
                                                    <td style={{ fontWeight: '700' }}>₹{order.totalAmount.toFixed(2)}</td>
                                                    <td><span className={`badge badge-${order.status.toLowerCase()}`}>{order.status}</span></td>
                                                    <td>
                                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                            <button
                                                                onClick={() => setExpandedOrderId(expandedOrderId === order.orderId ? null : order.orderId)}
                                                                className="btn"
                                                                style={{ padding: '0.4rem 0.8rem', background: '#94a3b8', color: 'white', fontSize: '0.75rem' }}
                                                            >
                                                                {expandedOrderId === order.orderId ? 'Hide Items' : 'View Items'}
                                                            </button>
                                                            {order.status === 'Pending' && (
                                                                <>
                                                                    <button onClick={() => updateOrderStatus(order.orderId, 'Approved')} className="btn" style={{ padding: '0.4rem', background: 'var(--success)', color: 'white' }} title="Approve"><CheckCircle size={16} /></button>
                                                                    <button onClick={() => updateOrderStatus(order.orderId, 'Rejected')} className="btn" style={{ padding: '0.4rem', background: 'var(--danger)', color: 'white' }} title="Reject"><Trash2 size={16} /></button>
                                                                </>
                                                            )}
                                                            {order.status === 'Approved' && (
                                                                <button onClick={() => updateOrderStatus(order.orderId, 'Delivered')} className="btn" style={{ padding: '0.4rem 0.8rem', background: '#3b82f6', color: 'white', fontSize: '0.75rem' }}>
                                                                    Mark as Delivered
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                                {expandedOrderId === order.orderId && (
                                                    <tr>
                                                        <td colSpan="7" style={{ padding: '0' }}>
                                                            <div style={{ background: '#f8fafc', padding: '1rem 2rem', borderTop: '1px solid #e2e8f0' }}>
                                                                <h4 style={{ fontSize: '0.85rem', marginBottom: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Purchase List</h4>
                                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '1rem', fontWeight: '600', fontSize: '0.9rem', color: '#1e293b', paddingBottom: '0.5rem', borderBottom: '1px solid #cbd5e1' }}>
                                                                    <span>Product Name</span>
                                                                    <span style={{ textAlign: 'center' }}>Qty</span>
                                                                    <span style={{ textAlign: 'right' }}>Price</span>
                                                                </div>
                                                                {order.items?.map((item, idx) => (
                                                                    <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '1rem', padding: '0.5rem 0', borderBottom: '1px solid #e2e8f0', fontSize: '0.9rem' }}>
                                                                        <span>{item.productName}</span>
                                                                        <span style={{ textAlign: 'center' }}>{item.quantity}{item.unit ? ` ${item.unit}` : ''}</span>
                                                                        <span style={{ textAlign: 'right' }}>₹{(item.price * item.quantity).toFixed(2)}</span>
                                                                    </div>
                                                                ))}
                                                                <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'center' }}>
                                                                    <button
                                                                        onClick={() => downloadOrderPDF(order, order.customerName)}
                                                                        className="btn"
                                                                        style={{ padding: '0.5rem 1.5rem', background: '#334155', color: 'white', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                                                                    >
                                                                        <Download size={14} /> Download Items List
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    )}

                    {/* Inventory Section */}
                    {activeTab === 'inventory' && (
                        <section id="inventory" className="glass-card" style={{ padding: '1.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', gap: '1rem', flexWrap: 'wrap' }}>
                                <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Product Inventory</h2>

                                <div style={{ display: 'flex', gap: '1rem', flex: 1, minWidth: '300px', justifyContent: 'flex-end' }}>
                                    <div style={{ position: 'relative', flex: 1, maxWidth: '300px' }}>
                                        <Search size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                        <input
                                            type="text"
                                            placeholder="Search inventory..."
                                            className="form-input"
                                            style={{ paddingLeft: '2.5rem' }}
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                        />
                                    </div>
                                    <select
                                        className="form-input"
                                        style={{ width: '150px' }}
                                        value={stockFilter}
                                        onChange={(e) => setStockFilter(e.target.value)}
                                    >
                                        <option value="all">All Products</option>
                                        <option value="instock">In Stock</option>
                                        <option value="outofstock">Out of Stock</option>
                                    </select>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
                                {products
                                    .filter(p => {
                                        const matchesSearch = p.productName.toLowerCase().includes(searchTerm.toLowerCase());
                                        const matchesFilter = stockFilter === 'all' ||
                                            (stockFilter === 'instock' && p.stockQuantity > 0) ||
                                            (stockFilter === 'outofstock' && p.stockQuantity === 0);
                                        return matchesSearch && matchesFilter;
                                    })
                                    .map(product => (
                                        <div key={product.productId} className="glass-card" style={{ padding: '0', overflow: 'hidden', border: '1px solid #e2e8f0', background: 'white', display: 'flex', flexDirection: 'column' }}>
                                            <div style={{ position: 'relative', height: '160px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                {product.imageUrl ? (
                                                    <img src={product.imageUrl} alt={product.productName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                ) : (
                                                    <ImageIcon size={48} style={{ color: '#cbd5e1' }} />
                                                )}
                                                <div style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', display: 'flex', gap: '0.25rem' }}>
                                                    <button onClick={() => openEditModal(product)} style={{ padding: '0.4rem', background: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', cursor: 'pointer', color: 'var(--primary)' }}>Edit</button>
                                                    <button onClick={() => handleDeleteProduct(product.productId)} style={{ padding: '0.4rem', background: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', cursor: 'pointer', color: '#ef4444' }}><Trash2 size={16} /></button>
                                                </div>
                                                {product.stockQuantity === 0 && (
                                                    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%) rotate(-15deg)', background: '#ef4444', color: 'white', padding: '0.25rem 1rem', fontWeight: '800', fontSize: '0.75rem', borderRadius: '4px', textTransform: 'uppercase' }}>Out of Stock</div>
                                                )}
                                            </div>
                                            <div style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                                                <h3 style={{ fontWeight: '700', marginBottom: '0.5rem' }}>{product.productName}</h3>
                                                <p style={{ color: 'var(--secondary)', fontSize: '0.85rem', marginBottom: '1.25rem', flex: 1 }}>{product.description}</p>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '1rem' }}>
                                                    <div>
                                                        <div style={{ fontSize: '0.7rem', color: 'var(--secondary)', textTransform: 'uppercase', fontWeight: '700' }}>Price</div>
                                                        <div style={{ fontWeight: '800', fontSize: '1.1rem', color: 'var(--primary)' }}>₹{product.price.toFixed(2)}</div>
                                                    </div>
                                                    <div style={{ textAlign: 'right' }}>
                                                        <div style={{ fontSize: '0.7rem', color: 'var(--secondary)', textTransform: 'uppercase', fontWeight: '700' }}>Quantity</div>
                                                        <div style={{ fontWeight: '600', color: product.stockQuantity === 0 ? 'var(--danger)' : 'inherit' }}>{product.stockQuantity} {product.unit}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        </section>
                    )}

                    {/* Retailers Section */}
                    {activeTab === 'customers' && (
                        <section id="customers" className="responsive-flex-gap">
                            {/* Customer List */}
                            <div className="glass-card" style={{ flex: '1', minWidth: '300px', padding: '1.5rem', height: 'fit-content' }}>
                                <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>Our Retailers</h2>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {customers.map(customer => (
                                        <div
                                            key={customer.userId}
                                            className="glass-card"
                                            style={{
                                                padding: '1rem',
                                                cursor: 'pointer',
                                                border: selectedCustomer?.userId === customer.userId ? '2px solid var(--primary)' : '1px solid #e2e8f0',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                background: 'white'
                                            }}
                                            onClick={() => fetchCustomerHistory(customer)}
                                        >
                                            <div>
                                                <div style={{ fontWeight: '700' }}>{customer.name}</div>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--secondary)' }}>{customer.email}</div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--secondary)' }}>Total Orders</div>
                                                <div style={{ fontWeight: '700', color: 'var(--primary)' }}>{customer.orderCount}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Customer Detail View */}
                            <div className="glass-card" style={{ flex: '2', minWidth: '300px', padding: '1.5rem' }}>
                                {selectedCustomer ? (
                                    <>
                                        <div style={{ borderBottom: '2px solid #f1f5f9', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
                                            <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{selectedCustomer.name}</h2>
                                            <p style={{ color: 'var(--secondary)' }}>Customer Data & Order History</p>
                                            <div style={{ marginTop: '1rem', display: 'flex', gap: '2rem', flexWrap: 'wrap', fontSize: '0.9rem' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-dark)' }}>
                                                    <Phone size={16} color="var(--primary)" /> {selectedCustomer.phoneNumber || 'No phone provided'}
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-dark)' }}>
                                                    <MapPin size={16} color="var(--primary)" /> {selectedCustomer.address || 'No address provided'}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="stats-grid" style={{ marginBottom: '2rem' }}>
                                            <div className="stat-card glass-card" style={{ padding: '1rem', background: '#f8fafc', borderRadius: '12px', textAlign: 'center', display: 'flex', flexDirection: 'column' }}>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--secondary)' }}>Joined Since</div>
                                                <div style={{ fontWeight: '700' }}>{new Date(selectedCustomer.createdDate).toLocaleDateString()}</div>
                                            </div>
                                            <div className="stat-card glass-card" style={{ padding: '1rem', background: '#f8fafc', borderRadius: '12px', textAlign: 'center', display: 'flex', flexDirection: 'column' }}>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--secondary)' }}>Account Status</div>
                                                <div style={{ fontWeight: '700', color: selectedCustomer.isActive ? 'var(--success)' : 'var(--danger)' }}>
                                                    {selectedCustomer.isActive ? 'Active' : 'Inactive'}
                                                </div>
                                            </div>
                                            <div className="stat-card glass-card" style={{ padding: '1rem', background: '#f8fafc', borderRadius: '12px', textAlign: 'center', display: 'flex', flexDirection: 'column' }}>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--secondary)' }}>Total Spending</div>
                                                <div style={{ fontWeight: '700' }}>₹{customerOrders.reduce((sum, o) => sum + o.totalAmount, 0).toFixed(2)}</div>
                                            </div>
                                        </div>

                                        <h3 style={{ marginBottom: '1.5rem', fontSize: '1.1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>Order History</h3>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                                            {/* Pending Section */}
                                            <div>
                                                <div
                                                    onClick={() => setCollapsedSections(prev => ({ ...prev, pending: !prev.pending }))}
                                                    style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}
                                                >
                                                    <h4 style={{ fontSize: '0.9rem', color: '#f59e0b', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                        <Clock size={16} /> Pending Orders ({customerOrders.filter(o => o.status === 'Pending').length})
                                                    </h4>
                                                    {collapsedSections.pending ? <ChevronDown size={18} color="#f59e0b" /> : <ChevronUp size={18} color="#f59e0b" />}
                                                </div>
                                                {!collapsedSections.pending && (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                                        {customerOrders.filter(o => o.status === 'Pending').map(order => renderOrderCard(order))}
                                                        {customerOrders.filter(o => o.status === 'Pending').length === 0 && <p style={{ fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic' }}>No pending orders.</p>}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Approved Section */}
                                            <div>
                                                <div
                                                    onClick={() => setCollapsedSections(prev => ({ ...prev, approved: !prev.approved }))}
                                                    style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}
                                                >
                                                    <h4 style={{ fontSize: '0.9rem', color: '#3b82f6', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                        <CheckCircle size={16} /> Approved Orders ({customerOrders.filter(o => o.status === 'Approved').length})
                                                    </h4>
                                                    {collapsedSections.approved ? <ChevronDown size={18} color="#3b82f6" /> : <ChevronUp size={18} color="#3b82f6" />}
                                                </div>
                                                {!collapsedSections.approved && (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                                        {customerOrders.filter(o => o.status === 'Approved').map(order => renderOrderCard(order))}
                                                        {customerOrders.filter(o => o.status === 'Approved').length === 0 && <p style={{ fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic' }}>No approved orders.</p>}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Delivered Section */}
                                            <div>
                                                <div
                                                    onClick={() => setCollapsedSections(prev => ({ ...prev, delivered: !prev.delivered }))}
                                                    style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}
                                                >
                                                    <h4 style={{ fontSize: '0.9rem', color: '#10b981', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                        <Package size={16} /> Delivered Orders ({customerOrders.filter(o => o.status === 'Delivered').length})
                                                    </h4>
                                                    {collapsedSections.delivered ? <ChevronDown size={18} color="#10b981" /> : <ChevronUp size={18} color="#10b981" />}
                                                </div>
                                                {!collapsedSections.delivered && (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                                        {customerOrders.filter(o => o.status === 'Delivered').map(order => renderOrderCard(order))}
                                                        {customerOrders.filter(o => o.status === 'Delivered').length === 0 && <p style={{ fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic' }}>No delivered orders.</p>}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div style={{ height: '300px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                                        <Users size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                                        <p>Select a retailer from the left to view their profile and orders.</p>
                                    </div>
                                )}
                            </div>
                        </section>
                    )}

                    {/* Security Section */}
                    {activeTab === 'security' && (
                        <ChangePassword />
                    )}

                    {/* Staff Management Section */}
                    {activeTab === 'admins' && (
                        <section id="admins" className="glass-card" style={{ padding: '2rem', marginBottom: '2rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                                <div>
                                    <h2 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><ShieldCheck size={24} color="var(--primary)" /> Administrative Team</h2>
                                    <p style={{ color: 'var(--secondary)', fontSize: '0.9rem' }}>Manage internal staff accounts and administrative panels.</p>
                                </div>
                                <button className="btn btn-primary" onClick={() => setShowAdminModal(true)}>
                                    <UserPlus size={18} /> Add Staff Admin
                                </button>
                            </div>

                            <div className="stats-grid" style={{ marginBottom: '2rem', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                                {admins.map(adm => (
                                    <div key={adm.userId} className="glass-card" style={{ padding: '1.5rem', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '0.8rem' }}>
                                                {adm.name.charAt(0)}
                                            </div>
                                            <div style={{ fontWeight: '700' }}>{adm.name}</div>
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--secondary)' }}>{adm.email}</div>
                                        <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.5rem' }}>Access since: {new Date(adm.createdDate).toLocaleDateString()}</div>
                                    </div>
                                ))}
                            </div>

                            {admins.length === 0 && <p style={{ textAlign: 'center', color: '#94a3b8', fontStyle: 'italic' }}>No additional staff found.</p>}
                        </section>
                    )}

                    {/* Create Admin Modal */}
                    {showAdminModal && (
                        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
                            <div className="glass-card" style={{ width: '100%', maxWidth: '400px', padding: '2rem', background: 'white' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                                    <ShieldCheck size={24} color="var(--primary)" />
                                    <h2 style={{ fontSize: '1.25rem' }}>Create Staff Admin</h2>
                                </div>
                                <p style={{ color: 'var(--secondary)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>Note: Administrative accounts have full access to products, orders, and customer data.</p>
                                <form onSubmit={handleCreateAdmin}>
                                    <div className="form-group">
                                        <label>Full Name</label>
                                        <input type="text" className="form-input" required value={newAdmin.name} onChange={(e) => setNewAdmin({ ...newAdmin, name: e.target.value })} placeholder="Staff Member Name" />
                                    </div>
                                    <div className="form-group">
                                        <label>Email</label>
                                        <input type="email" className="form-input" required value={newAdmin.email} onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })} placeholder="staff@wholesalebox.com" />
                                    </div>
                                    <div className="form-group">
                                        <label>Password</label>
                                        <div style={{ position: 'relative' }}>
                                            <input
                                                type={showAdminPassword ? "text" : "password"}
                                                className="form-input"
                                                required
                                                value={newAdmin.password}
                                                onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })}
                                                placeholder="••••••••"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowAdminPassword(!showAdminPassword)}
                                                style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                            >
                                                {showAdminPassword ? <EyeOff size={18} color="#94a3b8" /> : <Eye size={18} color="#94a3b8" />}
                                            </button>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                                        <button type="button" className="btn" style={{ flex: 1, background: '#f1f5f9' }} onClick={() => { setShowAdminModal(false); setShowAdminPassword(false); }}>Cancel</button>
                                        <button type="submit" className="btn btn-primary" style={{ flex: 2 }}>Create Account</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* Add Product Modal */}
                    {showProductModal && (
                        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
                            <div className="glass-card" style={{ width: '100%', maxWidth: '500px', padding: '2rem', background: 'white' }}>
                                <h2 style={{ marginBottom: '1.5rem' }}>{editingProduct ? 'Edit Product' : 'Add New Product'}</h2>
                                <form onSubmit={handleSaveProduct}>
                                    <div className="form-group">
                                        <label>Product Name</label>
                                        <input type="text" className="form-input" required value={newProduct.productName} onChange={(e) => setNewProduct({ ...newProduct, productName: e.target.value })} />
                                    </div>
                                    <div className="form-group">
                                        <label>Description</label>
                                        <textarea className="form-input" style={{ minHeight: '80px' }} value={newProduct.description} onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })} />
                                    </div>
                                    <div style={{ display: 'flex', gap: '1rem' }}>
                                        <div className="form-group" style={{ flex: 1 }}>
                                            <label>Price (₹)</label>
                                            <input type="number" step="0.01" className="form-input" required value={newProduct.price} onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })} />
                                        </div>
                                        <div className="form-group" style={{ flex: 1 }}>
                                            <label>Quantity</label>
                                            <input type="number" className="form-input" required value={newProduct.stockQuantity} onChange={(e) => setNewProduct({ ...newProduct, stockQuantity: e.target.value })} />
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label>Measurement Unit</label>
                                        <select className="form-input" value={newProduct.unit} onChange={(e) => setNewProduct({ ...newProduct, unit: e.target.value })}>
                                            <option value="pcs">Pieces (pcs)</option>
                                            <option value="kg">Kilograms (kg)</option>
                                            <option value="liter">Liters (liter)</option>
                                            <option value="meter">Meters (meter)</option>
                                            <option value="pkt">Packets (pkt)</option>
                                            <option value="box">Boxes (box)</option>
                                            <option value="dozen">Dozen</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Product Image</label>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                            <input
                                                type="file"
                                                className="form-input"
                                                accept="image/png, image/jpeg, image/webp"
                                                onChange={(e) => {
                                                    const file = e.target.files[0];
                                                    const v = validateImage(file);
                                                    if (!v.valid) {
                                                        alert(v.message);
                                                        e.target.value = null;
                                                        setNewProduct({ ...newProduct, imageFile: null });
                                                        return;
                                                    }
                                                    setNewProduct({ ...newProduct, imageFile: file });
                                                }}
                                            />
                                            {newProduct.imageUrl && !newProduct.imageFile && (
                                                <div style={{ fontSize: '0.75rem', color: 'var(--secondary)' }}>Current image will be kept if no new file is chosen.</div>
                                            )}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                        <button type="button" className="btn" style={{ flex: 1, background: '#e2e8f0' }} onClick={() => setShowProductModal(false)}>Cancel</button>
                                        <button type="submit" className="btn btn-primary" style={{ flex: 2 }}>Save Product</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}
                </main>

                {/* Mobile Footer (Profile & Logout) */}
                <div className="mobile-only-footer">
                    <div className="glass-card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '1rem', background: 'white' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', color: 'white' }}>
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
        </div>
    );
};

export default AdminDashboard;

import { useState, useEffect, useId } from 'react';
import { 
  Package, ShoppingCart, Plus, Edit2, Trash2, Star, 
  Check, X, Image, ChevronUp, ChevronDown, Eye, 
  User, Phone, MessageCircle, Clock, RefreshCw
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { 
  getStoreSettings, updateStoreSettings,
  getProducts, addProduct, updateProduct, deleteProduct,
  getOrders, updateOrderStatus, deleteOrder, convertStoreUserToRegular
} from '../../firebase/store';
import { uploadPartyImage } from '../../firebase/storage';
import Loader from '../Loader';
import PhoneLink from '../PhoneLink';
import Dialog from '../a11y/Dialog';
import './StoreSection.css';

const normalizePhoneNumber = (phoneNumber) => {
  if (!phoneNumber) return '';
  const digits = String(phoneNumber).replace(/\D/g, '');
  return digits;
};

const StoreSection = ({ showSaved }) => {
  const { t } = useLanguage();
  const editorTitleId = useId();
  const [activeTab, setActiveTab] = useState('products');
  const [loading, setLoading] = useState(true);
  const [storeSettings, setStoreSettings] = useState({ enabled: false });
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [existingUserByPhone, setExistingUserByPhone] = useState({});
  
  // Product editor state
  const [showProductEditor, setShowProductEditor] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    price: 0,
    priceOnRequest: false,
    discountParties: 0,
    discountExchange: 0,
    discountGold: 0,
    stock: 0,
    images: [],
    recommended: false,
    active: true,
    order: 0
  });
  const [uploadingImage, setUploadingImage] = useState(false);

  // Order details state
  const [selectedOrder, setSelectedOrder] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [settings, productsData, ordersData] = await Promise.all([
        getStoreSettings(),
        getProducts(),
        getOrders()
      ]);
      setStoreSettings(settings);
      setProducts(productsData);
      setOrders(ordersData);

      // If an order was created as a "store" customer, but the customer phone already exists
      // in our users collection, don't show "make regular user" action (it would be redundant).
      const storePhones = Array.from(
        new Set(
          (ordersData || [])
            .filter((o) => o?.userType === 'store')
            .map((o) => normalizePhoneNumber(o?.customerPhone))
            .filter(Boolean)
        )
      );

      if (storePhones.length === 0) {
        setExistingUserByPhone({});
      } else {
        // Use getAllUsers instead of multiple getUserByPhone calls to reduce database reads
        const { getAllUsers } = await import('../../firebase/users');
        const allUsers = await getAllUsers();
        const usersByPhone = new Map();
        allUsers.forEach(user => {
          if (user.phoneNumber) {
            usersByPhone.set(user.phoneNumber, user);
          }
        });
        
        const existingUserByPhoneMap = {};
        storePhones.forEach(phone => {
          existingUserByPhoneMap[phone] = usersByPhone.has(phone);
        });
        setExistingUserByPhone(existingUserByPhoneMap);
      }
    } catch (error) {
      console.error('Error loading store data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleStoreEnabled = async () => {
    try {
      const newSettings = { ...storeSettings, enabled: !storeSettings.enabled };
      await updateStoreSettings(newSettings);
      setStoreSettings(newSettings);
      showSaved();
    } catch (error) {
      console.error('Error toggling store:', error);
    }
  };

  // Product handlers
  const openProductEditor = (product = null) => {
    if (product) {
      setEditingProduct(product);
      setProductForm({
        name: product.name || '',
        description: product.description || '',
        price: typeof product.price === 'number' ? product.price : 0,
        priceOnRequest: product.priceOnRequest === true || product.price === null,
        discountParties: product.discountParties || 0,
        discountExchange: product.discountExchange || 0,
        discountGold: product.discountGold || 0,
        stock: product.stock || 0,
        images: product.images || [],
        recommended: product.recommended || false,
        active: product.active !== false,
        order: product.order || 0
      });
    } else {
      setEditingProduct(null);
      setProductForm({
        name: '',
        description: '',
        price: 0,
        priceOnRequest: false,
        discountParties: 0,
        discountExchange: 0,
        discountGold: 0,
        stock: 0,
        images: [],
        recommended: false,
        active: true,
        order: products.length
      });
    }
    setShowProductEditor(true);
  };

  const closeProductEditor = () => {
    setShowProductEditor(false);
    setEditingProduct(null);
    setProductForm({
      name: '',
      description: '',
      price: 0,
      priceOnRequest: false,
      discountRegistered: 0,
      discountGold: 0,
      stock: 0,
      images: [],
      recommended: false,
      active: true,
      order: 0
    });
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const result = await uploadPartyImage(file, `product_${Date.now()}`);
      if (result && result.url) {
        setProductForm(prev => ({
          ...prev,
          images: [...prev.images, result.url]
        }));
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      alert(t('admin.store.errorUploadingImage'));
    } finally {
      setUploadingImage(false);
    }
  };

  const removeImage = (index) => {
    setProductForm(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const moveImage = (index, direction) => {
    const newImages = [...productForm.images];
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= newImages.length) return;
    [newImages[index], newImages[newIndex]] = [newImages[newIndex], newImages[index]];
    setProductForm(prev => ({ ...prev, images: newImages }));
  };

  const saveProduct = async () => {
    if (!productForm.name.trim()) {
      alert(t('admin.store.enterProductName'));
      return;
    }

    try {
      if (editingProduct) {
        await updateProduct(editingProduct.id, productForm);
      } else {
        await addProduct(productForm);
      }
      await loadData();
      closeProductEditor();
      showSaved();
    } catch (error) {
      console.error('Error saving product:', error);
      alert(t('admin.store.errorSavingProduct'));
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (!confirm(t('admin.store.confirmDeleteProduct'))) return;

    try {
      await deleteProduct(productId);
      await loadData();
      showSaved();
    } catch (error) {
      console.error('Error deleting product:', error);
    }
  };

  // Order handlers
  const handleStatusChange = async (orderId, newStatus) => {
    try {
      await updateOrderStatus(orderId, newStatus);
      await loadData();
      showSaved();
    } catch (error) {
      console.error('Error updating order status:', error);
    }
  };

  const handleDeleteOrder = async (orderId) => {
    if (!confirm(t('admin.store.confirmDeleteOrder'))) return;

    try {
      await deleteOrder(orderId);
      await loadData();
      showSaved();
    } catch (error) {
      console.error('Error deleting order:', error);
    }
  };

  const handleMakeRegularUser = async (orderId) => {
    try {
      const order = orders.find(o => o.id === orderId);
      await convertStoreUserToRegular(orderId, order || null);
      await loadData();
      showSaved();
    } catch (error) {
      console.error('Error converting user:', error);
      alert(t('admin.store.errorConvertingUser'));
    }
  };

  const getStatusLabel = (status) => {
    const labels = {
      pending: t('admin.store.statusPending'),
      confirmed: t('admin.store.statusConfirmed'),
      completed: t('admin.store.statusCompleted'),
      cancelled: t('admin.store.statusCancelled')
    };
    return labels[status] || status;
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: '#eab308',
      confirmed: '#3b82f6',
      completed: '#22c55e',
      cancelled: '#ffb4ab'
    };
    return colors[status] || '#71717a';
  };

  const getUserTypeLabel = (userType) => {
    const labels = {
      store: t('admin.store.userTypeStore'),
      registered: t('admin.store.userTypeRegistered'),
      gold: t('admin.store.userTypeGold')
    };
    return labels[userType] || userType;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('he-IL', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="store-section-loading">
        <Loader />
      </div>
    );
  }

  return (
    <div className="store-section">
      {/* Store Settings */}
      <div className="store-settings-card">
        <div className="store-settings-header">
          <h3>{t('admin.store.settings')}</h3>
          <button
            className={`store-toggle-btn ${storeSettings.enabled ? 'enabled' : ''}`}
            onClick={toggleStoreEnabled}
          >
            {storeSettings.enabled ? (
              <>
                <Check size={16} />
                {t('admin.store.enabled')}
              </>
            ) : (
              <>
                <X size={16} />
                {t('admin.store.disabled')}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="store-tabs">
        <button
          className={`store-tab ${activeTab === 'products' ? 'active' : ''}`}
          onClick={() => setActiveTab('products')}
        >
          <Package size={18} />
          {t('admin.store.products')}
        </button>
        <button
          className={`store-tab ${activeTab === 'orders' ? 'active' : ''}`}
          onClick={() => setActiveTab('orders')}
        >
          <ShoppingCart size={18} />
          {t('admin.store.orders')}
          {orders.filter(o => o.status === 'pending').length > 0 && (
            <span className="store-tab-badge">
              {orders.filter(o => o.status === 'pending').length}
            </span>
          )}
        </button>
      </div>

      {/* Products Tab */}
      {activeTab === 'products' && (
        <div className="store-products-tab">
          <div className="store-products-header">
            <h3>{t('admin.store.products')}</h3>
            <div className="store-products-actions">
              <button className="store-refresh-btn" onClick={loadData}>
                <RefreshCw size={16} />
              </button>
              <button className="store-add-btn" onClick={() => openProductEditor()}>
                <Plus size={18} />
                {t('admin.store.addProduct')}
              </button>
            </div>
          </div>

          {products.length === 0 ? (
            <div className="store-empty-state">
              <Package size={48} />
              <p>{t('admin.store.noProducts')}</p>
            </div>
          ) : (
            <div className="store-products-list">
              {products.map((product) => (
                <div key={product.id} className={`store-product-item ${!product.active ? 'inactive' : ''}`}>
                  <div className="store-product-image">
                    {product.images && product.images.length > 0 ? (
                      <img src={product.images[0]} alt={product.name} />
                    ) : (
                      <div className="store-product-no-image">
                        <Package size={24} />
                      </div>
                    )}
                    {product.recommended && (
                      <div className="store-product-recommended">
                        <Star size={12} />
                      </div>
                    )}
                  </div>
                  <div className="store-product-details">
                    <h4>{product.name}</h4>
                    <p className="store-product-description">{product.description}</p>
                    <div className="store-product-meta">
                      <span className="store-product-price">
                        {product.priceOnRequest === true || product.price === null
                          ? t('store.priceOnRequest')
                          : `₪${product.price}`}
                      </span>
                      <span className="store-product-stock">
                        {t('admin.store.stock')} {product.stock}
                      </span>
                      {!product.active && (
                        <span className="store-product-inactive-badge">{t('admin.store.inactive')}</span>
                      )}
                    </div>
                  </div>
                  <div className="store-product-actions">
                    <button className="store-edit-btn" onClick={() => openProductEditor(product)}>
                      <Edit2 size={16} />
                    </button>
                    <button className="store-delete-btn" onClick={() => handleDeleteProduct(product.id)}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Orders Tab */}
      {activeTab === 'orders' && (
        <div className="store-orders-tab">
          <div className="store-orders-header">
            <h3>{t('admin.store.orders')}</h3>
            <button className="store-refresh-btn" onClick={loadData}>
              <RefreshCw size={16} />
            </button>
          </div>

          {orders.length === 0 ? (
            <div className="store-empty-state">
              <ShoppingCart size={48} />
              <p>{t('admin.store.noOrders')}</p>
            </div>
          ) : (
            <div className="store-orders-list">
              {orders.map((order) => (
                <div key={order.id} className="store-order-item">
                  <div className="store-order-header">
                    <div className="store-order-id">
                      {t('admin.store.orderNumber')}{order.id.slice(-6).toUpperCase()}
                    </div>
                    <div 
                      className="store-order-status"
                      style={{ backgroundColor: getStatusColor(order.status) + '20', color: getStatusColor(order.status) }}
                    >
                      {getStatusLabel(order.status)}
                    </div>
                  </div>

                  <div className="store-order-customer">
                    <div className="store-order-customer-info">
                      <User size={14} />
                      <span>{order.customerName}</span>
                    </div>
                    <div className="store-order-customer-info">
                      <Phone size={14} />
                      <PhoneLink phone={order.customerPhone}>{order.customerPhone}</PhoneLink>
                    </div>
                    {order.customerTelegram && (
                      <div className="store-order-customer-info">
                        <MessageCircle size={14} />
                        <span>{order.customerTelegram}</span>
                      </div>
                    )}
                  </div>

                  <div className="store-order-items-summary">
                    {order.items?.map((item, i) => (
                      <div key={i} className="store-order-item-row">
                        <span>{item.productName} x {item.quantity}</span>
                        <span>₪{item.price * item.quantity}</span>
                      </div>
                    ))}
                  </div>

                  <div className="store-order-footer">
                    <div className="store-order-total">
                      {t('admin.store.orderTotal')}: ₪{order.finalPrice || order.totalPrice}
                    </div>
                    <div className="store-order-date">
                      <Clock size={12} />
                      {formatDate(order.createdAt)}
                    </div>
                  </div>

                  <div className="store-order-user-type">
                    <span className={`store-user-type-badge ${order.userType}`}>
                      {getUserTypeLabel(order.userType)}
                    </span>
                    {order.userType === 'store' && !existingUserByPhone[normalizePhoneNumber(order.customerPhone)] && (
                      <button 
                        className="store-make-regular-btn"
                        onClick={() => handleMakeRegularUser(order.id)}
                      >
                        {t('admin.store.makeRegularUser')}
                      </button>
                    )}
                  </div>

                  <div className="store-order-actions">
                    <select
                      value={order.status}
                      onChange={(e) => handleStatusChange(order.id, e.target.value)}
                      className="store-status-select"
                    >
                      <option value="pending">{t('admin.store.statusPending')}</option>
                      <option value="confirmed">{t('admin.store.statusConfirmed')}</option>
                      <option value="completed">{t('admin.store.statusCompleted')}</option>
                      <option value="cancelled">{t('admin.store.statusCancelled')}</option>
                    </select>
                    <button 
                      className="store-delete-btn"
                      onClick={() => handleDeleteOrder(order.id)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Product Editor Modal */}
      <Dialog
        open={showProductEditor}
        onClose={closeProductEditor}
        labelledBy={editorTitleId}
        className="store-modal-overlay"
        panelClassName="store-modal"
      >
            <div className="store-modal-header">
              <h3 id={editorTitleId}>{editingProduct ? t('admin.store.editProduct') : t('admin.store.addProduct')}</h3>
              <button type="button" className="store-modal-close" onClick={closeProductEditor} aria-label={t('close')}>
                <X size={20} aria-hidden="true" />
              </button>
            </div>

            <div className="store-modal-body">
              <div className="store-form-group">
                <label>{t('admin.store.productName')} *</label>
                <input
                  type="text"
                  value={productForm.name}
                  onChange={(e) => setProductForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder={t('admin.store.enterProductNamePlaceholder')}
                />
              </div>

              <div className="store-form-group">
                <label>{t('admin.store.productDescription')}</label>
                <textarea
                  value={productForm.description}
                  onChange={(e) => setProductForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder={t('admin.store.enterDescriptionPlaceholder')}
                  rows={3}
                />
              </div>

              <div className="store-form-row">
                <div className="store-form-group">
                  <label>{t('admin.store.productPrice')}</label>
                  <input
                    type="number"
                    value={productForm.price}
                    onChange={(e) => setProductForm(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                    min="0"
                    step="0.01"
                    disabled={productForm.priceOnRequest}
                  />
                </div>
                <div className="store-form-group">
                  <label>{t('admin.store.productStock')}</label>
                  <input
                    type="number"
                    value={productForm.stock}
                    onChange={(e) => setProductForm(prev => ({ ...prev, stock: parseInt(e.target.value) || 0 }))}
                    min="0"
                  />
                </div>
              </div>

              <div className="store-form-row">
                <div className="store-form-group">
                  <label>{t('admin.store.discountParties')}</label>
                  <input
                    type="number"
                    value={productForm.discountParties}
                    onChange={(e) => setProductForm(prev => ({ ...prev, discountParties: parseInt(e.target.value) || 0 }))}
                    min="0"
                    max="100"
                  />
                </div>
                <div className="store-form-group">
                  <label>{t('admin.store.discountExchange')}</label>
                  <input
                    type="number"
                    value={productForm.discountExchange}
                    onChange={(e) => setProductForm(prev => ({ ...prev, discountExchange: parseInt(e.target.value) || 0 }))}
                    min="0"
                    max="100"
                  />
                </div>
                <div className="store-form-group">
                  <label>{t('admin.store.discountGold')}</label>
                  <input
                    type="number"
                    value={productForm.discountGold}
                    onChange={(e) => setProductForm(prev => ({ ...prev, discountGold: parseInt(e.target.value) || 0 }))}
                    min="0"
                    max="100"
                  />
                </div>
              </div>

              <div className="store-form-group">
                <label>{t('admin.store.order')}</label>
                <input
                  type="number"
                  value={productForm.order}
                  onChange={(e) => setProductForm(prev => ({ ...prev, order: parseInt(e.target.value) || 0 }))}
                  min="0"
                />
              </div>

              <div className="store-form-checkboxes">
                <label className="store-checkbox">
                  <input
                    type="checkbox"
                    checked={productForm.priceOnRequest}
                    onChange={(e) => setProductForm(prev => ({
                      ...prev,
                      priceOnRequest: e.target.checked,
                      // Keep a numeric fallback in form state for legacy UI; backend will store null.
                      price: e.target.checked ? 0 : prev.price
                    }))}
                  />
                  <Eye size={16} />
                  {t('admin.store.priceOnRequest')}
                </label>
              </div>

              <div className="store-form-checkboxes">
                <label className="store-checkbox">
                  <input
                    type="checkbox"
                    checked={productForm.recommended}
                    onChange={(e) => setProductForm(prev => ({ ...prev, recommended: e.target.checked }))}
                  />
                  <Star size={16} />
                  {t('admin.store.recommended')}
                </label>
                <label className="store-checkbox">
                  <input
                    type="checkbox"
                    checked={productForm.active}
                    onChange={(e) => setProductForm(prev => ({ ...prev, active: e.target.checked }))}
                  />
                  <Check size={16} />
                  {t('admin.store.active')}
                </label>
              </div>

              <div className="store-form-group">
                <label>{t('admin.store.productImages')}</label>
                <div className="store-images-grid">
                  {productForm.images.map((img, index) => (
                    <div key={index} className="store-image-item">
                      <img src={img} alt={`${t('admin.store.productImages')} ${index + 1}`} />
                      <div className="store-image-actions">
                        {index > 0 && (
                          <button type="button" onClick={() => moveImage(index, -1)} aria-label={t('a11y.moveUp')}>
                            <ChevronUp size={14} aria-hidden="true" />
                          </button>
                        )}
                        {index < productForm.images.length - 1 && (
                          <button type="button" onClick={() => moveImage(index, 1)} aria-label={t('a11y.moveDown')}>
                            <ChevronDown size={14} aria-hidden="true" />
                          </button>
                        )}
                        <button type="button" className="delete" onClick={() => removeImage(index)} aria-label={t('a11y.removeImage')}>
                          <X size={14} aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  ))}
                  <label className="store-add-image">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={uploadingImage}
                    />
                    {uploadingImage ? (
                      <Loader size="small" />
                    ) : (
                      <>
                        <Image size={24} />
                        <span>{t('admin.store.addImage')}</span>
                      </>
                    )}
                  </label>
                </div>
              </div>
            </div>

            <div className="store-modal-footer">
              <button type="button" className="store-cancel-btn" onClick={closeProductEditor}>
                {t('admin.cancel')}
              </button>
              <button type="button" className="store-save-btn" onClick={saveProduct}>
                {t('admin.save')}
              </button>
            </div>
      </Dialog>
    </div>
  );
};

export default StoreSection;

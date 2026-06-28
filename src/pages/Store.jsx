import { useState, useEffect, useId } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShoppingCart, Package, Star, Plus, Minus, Trash2, 
  Check, ChevronLeft, ChevronRight, X, ArrowRight 
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { useSiteAuth } from '../context/AuthContext';
import { getProducts, getStoreSettings, createOrder } from '../firebase/store';
import Loader from '../components/Loader';
import SEO from '../components/SEO';
import EditableLabel from '../components/EditableLabel';
import Dialog from '../components/a11y/Dialog';
import { isValidIsraeliPhone } from '../utils/phone';
import './Store.css';

const Store = () => {
  const { t } = useLanguage();
  const { siteUser } = useSiteAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [storeSettings, setStoreSettings] = useState({ enabled: false });
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const cartTitleId = useId();
  const checkoutTitleId = useId();
  const productTitleId = useId();
  const customerNameId = useId();
  const customerPhoneId = useId();
  const customerTelegramId = useId();
  const formErrorId = useId();
  
  // Checkout form
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerTelegram, setCustomerTelegram] = useState('');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (siteUser) {
      setCustomerName(siteUser.name || '');
      setCustomerPhone(siteUser.phoneNumber || '');
      setCustomerTelegram(siteUser.telegramUsername ? (siteUser.telegramUsername.startsWith('@') ? siteUser.telegramUsername : `@${siteUser.telegramUsername}`) : '');
    }
  }, [siteUser]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [productsData, settings] = await Promise.all([
        getProducts(true),
        getStoreSettings()
      ]);
      setProducts(productsData);
      setStoreSettings(settings);
    } catch (error) {
      console.error('Error loading store data:', error);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (product) => {
    // Products with "price on request" are handled as an inquiry:
    // we take user details and create an order with price = 0 + a flag.
    if (product?.priceOnRequest === true || product?.price === null) {
      setCart([{
        productId: product.id,
        productName: product.name,
        price: 0,
        priceOnRequest: true,
        quantity: 1,
        maxStock: product.stock,
        image: product.images?.[0] || ''
      }]);
      setShowCart(false);
      setShowCheckout(true);
      return;
    }

    const existingItem = cart.find(item => item.productId === product.id);
    if (existingItem) {
      if (existingItem.quantity < product.stock) {
        setCart(cart.map(item => 
          item.productId === product.id 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        ));
      }
    } else {
      setCart([...cart, {
        productId: product.id,
        productName: product.name,
        price: product.price,
        priceOnRequest: false,
        quantity: 1,
        maxStock: product.stock,
        image: product.images?.[0] || ''
      }]);
    }
  };

  const updateCartQuantity = (productId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(cart.map(item => 
      item.productId === productId 
        ? { ...item, quantity: Math.min(newQuantity, item.maxStock) }
        : item
    ));
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.productId !== productId));
  };

  const getCartTotal = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const hasPriceOnRequestItems = cart.some(item => item?.priceOnRequest);

  const getCartItemCount = () => {
    return cart.reduce((total, item) => total + item.quantity, 0);
  };

  const handleCheckout = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!customerName.trim()) {
      setFormError(t('store.enterName'));
      return;
    }

    if (!isValidIsraeliPhone(customerPhone)) {
      setFormError(t('store.enterValidPhone'));
      return;
    }

    setSubmitting(true);
    try {
      const cartHasPriceOnRequest = cart.some(item => item?.priceOnRequest);
      const total = getCartTotal();
      const orderData = {
        customerName,
        customerPhone,
        customerTelegram,
        items: cart.map(item => ({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          price: item.price,
          priceOnRequest: Boolean(item.priceOnRequest),
          discount: 0
        })),
        hasPriceOnRequestItems: cartHasPriceOnRequest,
        totalPrice: total,
        discountApplied: 0,
        finalPrice: total,
        userType: 'store'
      };

      await createOrder(orderData);
      setOrderSuccess(true);
      setCart([]);
      setShowCheckout(false);
      setShowCart(false);
    } catch (error) {
      console.error('Error placing order:', error);
      setFormError(t('store.errorPlacingOrder'));
    } finally {
      setSubmitting(false);
    }
  };

  const openProductModal = (product) => {
    setSelectedProduct(product);
    setCurrentImageIndex(0);
  };

  const closeProductModal = () => {
    setSelectedProduct(null);
    setCurrentImageIndex(0);
  };

  const nextImage = () => {
    if (selectedProduct && selectedProduct.images?.length > 1) {
      setCurrentImageIndex((prev) => 
        prev === selectedProduct.images.length - 1 ? 0 : prev + 1
      );
    }
  };

  const prevImage = () => {
    if (selectedProduct && selectedProduct.images?.length > 1) {
      setCurrentImageIndex((prev) => 
        prev === 0 ? selectedProduct.images.length - 1 : prev - 1
      );
    }
  };

  if (loading) {
    return (
      <div className="store-loading">
        <Loader />
      </div>
    );
  }

  if (!storeSettings.enabled) {
    return (
      <div className="store-disabled">
        <Package size={64} className="store-disabled-icon" />
        <h2><EditableLabel translationKey="store.closed" /></h2>
        <button onClick={() => navigate('/')} className="store-back-btn">
          <EditableLabel translationKey="store.backToHome" />
        </button>
      </div>
    );
  }

  if (orderSuccess) {
    return (
      <div className="store-success">
        <div className="store-success-icon">
          <Check size={64} />
        </div>
        <h2><EditableLabel translationKey="store.orderSuccess" /></h2>
        <p><EditableLabel translationKey="store.orderSuccessMessage" /></p>
        <button onClick={() => { setOrderSuccess(false); loadData(); }} className="store-back-btn">
          <EditableLabel translationKey="store.backToStore" />
        </button>
      </div>
    );
  }

  return (
    <div className="store-container">
      <SEO
        title="חנות | מדברים BDSM"
        description="חנות מדברים BDSM - מוצרים והזמנות. Store - Talking BDSM products and orders."
        canonicalPath="/store"
      />
      <header className="store-header">
        <h1 className="store-title logo-font">
          <span className="store-title-red"><EditableLabel translationKey="store.title" /></span>
        </h1>
        <p className="store-subtitle"><EditableLabel translationKey="store.subtitle" /></p>
      </header>

      {/* Cart Button */}
      {cart.length > 0 && (
        <button className="store-cart-floating" onClick={() => setShowCart(true)}>
          <ShoppingCart size={24} />
          <span className="store-cart-badge">{getCartItemCount()}</span>
        </button>
      )}

      {/* Products Grid */}
      {products.length === 0 ? (
        <div className="store-empty">
          <Package size={48} />
          <p><EditableLabel translationKey="store.emptyStore" /></p>
        </div>
      ) : (
        <div className="store-products-grid">
          {products.map((product) => (
            <div key={product.id} className={`store-product-card ${product.recommended ? 'recommended' : ''}`}>
              {product.recommended && (
                <div className="store-product-badge">
                  <Star size={14} /> <EditableLabel translationKey="store.recommended" />
                </div>
              )}
              <button
                type="button"
                className="store-product-image"
                onClick={() => openProductModal(product)}
                aria-label={`${t('a11y.openProduct') || 'פתח פרטי מוצר'}: ${product.name}`}
              >
                {product.images && product.images.length > 0 ? (
                  <img
                    src={product.images[0]}
                    alt={product.name || ''}
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <div className="store-product-no-image" aria-hidden="true">
                    <Package size={48} />
                  </div>
                )}
                {product.images && product.images.length > 1 && (
                  <div className="store-product-image-count" aria-hidden="true">
                    +{product.images.length - 1}
                  </div>
                )}
              </button>
              <div className="store-product-content">
                <h3 className="store-product-name">{product.name}</h3>
                <p className="store-product-description">{product.description}</p>
                <div className="store-product-price">
                  {product.priceOnRequest === true || product.price === null
                    ? <EditableLabel translationKey="store.priceOnRequest" />
                    : `₪${product.price}`}
                </div>
                
                {(product.priceOnRequest !== true && product.price !== null) && product.discountParties > 0 && (
                  <div className="store-product-discount">
                    <EditableLabel translationKey="store.discountForParties" />: {product.discountParties}%
                  </div>
                )}
                {(product.priceOnRequest !== true && product.price !== null) && product.discountExchange > 0 && (
                  <div className="store-product-discount">
                    <EditableLabel translationKey="store.discountForExchange" />: {product.discountExchange}%
                  </div>
                )}
                {(product.priceOnRequest !== true && product.price !== null) && product.discountGold > 0 && (
                  <div className="store-product-discount gold">
                    <EditableLabel translationKey="store.discountForGold" />: {product.discountGold}%
                  </div>
                )}

                <div className="store-product-stock">
                  {product.stock > 0 ? (
                    <span className="in-stock"><EditableLabel translationKey="store.inStock" /> ({product.stock} <EditableLabel translationKey="store.stockRemaining" />)</span>
                  ) : (
                    <span className="out-of-stock"><EditableLabel translationKey="store.outOfStock" /></span>
                  )}
                </div>

                <button 
                  className="store-add-to-cart-btn"
                  onClick={() => addToCart(product)}
                  disabled={product.stock <= 0 || cart.find(item => item.productId === product.id)?.quantity >= product.stock}
                >
                  <ShoppingCart size={18} />
                  {(product.priceOnRequest === true || product.price === null)
                    ? <EditableLabel translationKey="store.priceOnRequest" />
                    : <EditableLabel translationKey="store.addToCart" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Cart Sidebar */}
      <Dialog
        open={showCart}
        onClose={() => setShowCart(false)}
        labelledBy={cartTitleId}
        className="store-cart-overlay"
        panelClassName="store-cart-sidebar"
      >
            <div className="store-cart-header">
              <h2 id={cartTitleId}><ShoppingCart size={24} aria-hidden="true" /> <EditableLabel translationKey="store.cart" /></h2>
              <button type="button" className="store-cart-close" onClick={() => setShowCart(false)} aria-label={t('close')}>
                <X size={24} aria-hidden="true" />
              </button>
            </div>

            {cart.length === 0 ? (
              <div className="store-cart-empty">
                <ShoppingCart size={48} />
                <p><EditableLabel translationKey="store.emptyCart" /></p>
              </div>
            ) : (
              <>
                <div className="store-cart-items">
                  {cart.map((item) => (
                    <div key={item.productId} className="store-cart-item">
                      {item.image && (
                        <img
                          src={item.image}
                          alt={item.productName}
                          className="store-cart-item-image"
                          loading="lazy"
                          decoding="async"
                        />
                      )}
                      <div className="store-cart-item-details">
                        <h4>{item.productName}</h4>
                        <div className="store-cart-item-price">
                          {item.priceOnRequest
                            ? <EditableLabel translationKey="store.priceOnRequest" />
                            : `₪${item.price}`}
                        </div>
                      </div>
                      <div className="store-cart-item-quantity">
                        <button type="button" onClick={() => updateCartQuantity(item.productId, item.quantity - 1)} aria-label={t('a11y.delete')}>
                          <Minus size={16} aria-hidden="true" />
                        </button>
                        <span aria-label={`${t('store.cart')} ${item.quantity}`}>{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateCartQuantity(item.productId, item.quantity + 1)}
                          disabled={item.quantity >= item.maxStock}
                          aria-disabled={item.quantity >= item.maxStock}
                          aria-label={t('add')}
                        >
                          <Plus size={16} aria-hidden="true" />
                        </button>
                      </div>
                      <button type="button" className="store-cart-item-remove" onClick={() => removeFromCart(item.productId)} aria-label={`${t('a11y.removeFromCart') || t('a11y.delete')}: ${item.productName}`}>
                        <Trash2 size={18} aria-hidden="true" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="store-cart-footer">
                  <div className="store-cart-total">
                    <span><EditableLabel translationKey="store.total" />:</span>
                    <span className="store-cart-total-price">
                      {hasPriceOnRequestItems
                        ? <EditableLabel translationKey="store.priceOnRequest" />
                        : `₪${getCartTotal()}`}
                    </span>
                  </div>
                  <button type="button" className="store-checkout-btn" onClick={() => { setShowCart(false); setShowCheckout(true); }}>
                    <EditableLabel translationKey="store.checkout" /> <ArrowRight size={18} aria-hidden="true" />
                  </button>
                </div>
              </>
            )}
      </Dialog>

      {/* Checkout Modal */}
      <Dialog
        open={showCheckout}
        onClose={() => setShowCheckout(false)}
        labelledBy={checkoutTitleId}
        className="store-checkout-overlay"
        panelClassName="store-checkout-modal"
      >
            <button type="button" className="store-checkout-close" onClick={() => setShowCheckout(false)} aria-label={t('close')}>
              <X size={24} aria-hidden="true" />
            </button>
            <h2 id={checkoutTitleId}><EditableLabel translationKey="store.orderDetails" /></h2>
            
            <div className="store-checkout-summary">
              {cart.map((item) => (
                <div key={item.productId} className="store-checkout-item">
                  <span>{item.productName} x {item.quantity}</span>
                  <span>
                    {item.priceOnRequest
                      ? <EditableLabel translationKey="store.priceOnRequest" />
                      : `₪${item.price * item.quantity}`}
                  </span>
                </div>
              ))}
              <div className="store-checkout-total">
                <span><EditableLabel translationKey="store.total" />:</span>
                <span>
                  {hasPriceOnRequestItems
                    ? <EditableLabel translationKey="store.priceOnRequest" />
                    : `₪${getCartTotal()}`}
                </span>
              </div>
            </div>

            <form onSubmit={handleCheckout} className="store-checkout-form">
              <div className="store-form-group">
                <label htmlFor={customerNameId}><EditableLabel translationKey="store.customerName" /> *</label>
                <input
                  id={customerNameId}
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder={t('store.enterFullNamePlaceholder')}
                  required
                  autoComplete="name"
                />
              </div>

              <div className="store-form-group">
                <label htmlFor={customerPhoneId}><EditableLabel translationKey="store.customerPhone" /> *</label>
                <input
                  id={customerPhoneId}
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="05XXXXXXXX"
                  required
                  autoComplete="tel"
                  inputMode="numeric"
                />
              </div>

              <div className="store-form-group">
                <label htmlFor={customerTelegramId}><EditableLabel translationKey="store.customerTelegram" /></label>
                <input
                  id={customerTelegramId}
                  type="text"
                  value={customerTelegram}
                  onChange={(e) => setCustomerTelegram(e.target.value)}
                  placeholder="@username"
                />
              </div>

              {formError && (
                <div id={formErrorId} className="store-form-error" role="alert">{formError}</div>
              )}

              <button type="submit" className="store-submit-btn" disabled={submitting} aria-disabled={submitting}>
                {submitting ? <Loader size="small" /> : <EditableLabel translationKey="store.placeOrder" />}
              </button>
            </form>
      </Dialog>

      {/* Product Modal */}
      <Dialog
        open={!!selectedProduct}
        onClose={closeProductModal}
        labelledBy={productTitleId}
        className="store-product-modal-overlay"
        panelClassName="store-product-modal"
      >
        {selectedProduct && (
          <>
            <button type="button" className="store-product-modal-close" onClick={closeProductModal} aria-label={t('close')}>
              <X size={24} aria-hidden="true" />
            </button>
            
            <div className="store-product-modal-gallery">
              {selectedProduct.images && selectedProduct.images.length > 0 ? (
                <>
                  <img
                    src={selectedProduct.images[currentImageIndex]}
                    alt={selectedProduct.name}
                    className="store-product-modal-image"
                    decoding="async"
                  />
                  {selectedProduct.images.length > 1 && (
                    <>
                      <button type="button" className="store-gallery-nav prev" onClick={prevImage} aria-label={t('a11y.back') || 'הקודם'}>
                        <ChevronLeft size={24} aria-hidden="true" />
                      </button>
                      <button type="button" className="store-gallery-nav next" onClick={nextImage} aria-label={t('continue') || 'הבא'}>
                        <ChevronRight size={24} aria-hidden="true" />
                      </button>
                      <div className="store-gallery-dots" role="tablist">
                        {selectedProduct.images.map((_, index) => (
                          <button
                            type="button"
                            key={index}
                            role="tab"
                            aria-selected={index === currentImageIndex}
                            aria-label={`${index + 1} / ${selectedProduct.images.length}`}
                            className={`store-gallery-dot ${index === currentImageIndex ? 'active' : ''}`}
                            onClick={() => setCurrentImageIndex(index)}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className="store-product-modal-no-image" aria-hidden="true">
                  <Package size={64} />
                </div>
              )}
            </div>

            <div className="store-product-modal-content">
              <h2 id={productTitleId}>{selectedProduct.name}</h2>
              {selectedProduct.recommended && (
                <div className="store-product-modal-badge">
                  <Star size={16} /> <EditableLabel translationKey="store.recommended" />
                </div>
              )}
              <p className="store-product-modal-description">{selectedProduct.description}</p>
              <div className="store-product-modal-price">
                {selectedProduct.priceOnRequest === true || selectedProduct.price === null
                  ? <EditableLabel translationKey="store.priceOnRequest" />
                  : `₪${selectedProduct.price}`}
              </div>
              
              {(selectedProduct.priceOnRequest !== true && selectedProduct.price !== null) && selectedProduct.discountParties > 0 && (
                <div className="store-product-modal-discount">
                  <EditableLabel translationKey="store.discountForParties" />: {selectedProduct.discountParties}%
                </div>
              )}
              {(selectedProduct.priceOnRequest !== true && selectedProduct.price !== null) && selectedProduct.discountExchange > 0 && (
                <div className="store-product-modal-discount">
                  <EditableLabel translationKey="store.discountForExchange" />: {selectedProduct.discountExchange}%
                </div>
              )}
              {(selectedProduct.priceOnRequest !== true && selectedProduct.price !== null) && selectedProduct.discountGold > 0 && (
                <div className="store-product-modal-discount gold">
                  <EditableLabel translationKey="store.discountForGold" />: {selectedProduct.discountGold}%
                </div>
              )}

              <div className="store-product-modal-stock">
                {selectedProduct.stock > 0 ? (
                  <span className="in-stock"><EditableLabel translationKey="store.inStock" /> ({selectedProduct.stock} <EditableLabel translationKey="store.stockRemaining" />)</span>
                ) : (
                  <span className="out-of-stock"><EditableLabel translationKey="store.outOfStock" /></span>
                )}
              </div>

              <button 
                type="button"
                className="store-add-to-cart-btn large"
                onClick={() => { addToCart(selectedProduct); closeProductModal(); }}
                disabled={selectedProduct.stock <= 0}
                aria-disabled={selectedProduct.stock <= 0}
              >
                <ShoppingCart size={20} aria-hidden="true" />
                {(selectedProduct.priceOnRequest === true || selectedProduct.price === null)
                  ? <EditableLabel translationKey="store.priceOnRequest" />
                  : <EditableLabel translationKey="store.addToCart" />}
              </button>
            </div>
          </>
        )}
      </Dialog>
    </div>
  );
};

export default Store;

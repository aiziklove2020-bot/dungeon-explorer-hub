import { 
  doc, 
  getDoc, 
  setDoc,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  orderBy,
  where,
  increment
} from 'firebase/firestore';
import { db } from './config';
import { getUserByPhone } from './users';
import { getStoreSettings as getStoreSettingsFromDataAccess, invalidateCache } from './dataAccess';

const PRODUCTS_COLLECTION = 'storeProducts';
const ORDERS_COLLECTION = 'storeOrders';
const STORE_SETTINGS_COLLECTION = 'settings';
const STORE_SETTINGS_DOC_ID = 'storeSettings';

// Store Settings - Re-export from dataAccess for caching
export const getStoreSettings = getStoreSettingsFromDataAccess;

export const updateStoreSettings = async (settings) => {
  try {
    const settingsRef = doc(db, STORE_SETTINGS_COLLECTION, STORE_SETTINGS_DOC_ID);
    await setDoc(settingsRef, settings, { merge: true });
    
    // Clear cache after update
    await invalidateCache('storeSettings');
  } catch (error) {
    console.error('Error updating store settings:', error);
    throw error;
  }
};

// Products
export const getProducts = async (onlyActive = false) => {
  try {
    const productsRef = collection(db, PRODUCTS_COLLECTION);
    const mapDocs = (querySnapshot) =>
      querySnapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));

    // NOTE:
    // `where('active', '==', true)` + `orderBy('order')` requires a composite index in Firestore.
    // If the index is missing, Firestore throws and we end up returning an empty store.
    // To keep the store usable, we fall back to a simple query and sort client-side.
    if (onlyActive) {
      try {
        const q = query(
          productsRef,
          where('active', '==', true),
          orderBy('order', 'asc')
        );
        const querySnapshot = await getDocs(q);
        return mapDocs(querySnapshot);
      } catch (error) {
        console.warn(
          'getProducts(active=true) query with orderBy failed; falling back to client-side sort.',
          error
        );
        const fallbackQuery = query(productsRef, where('active', '==', true));
        const querySnapshot = await getDocs(fallbackQuery);
        return mapDocs(querySnapshot).sort(
          (a, b) => (Number(a.order) || 0) - (Number(b.order) || 0)
        );
      }
    }

    const q = query(productsRef, orderBy('order', 'asc'));
    const querySnapshot = await getDocs(q);
    return mapDocs(querySnapshot);
  } catch (error) {
    console.error('Error getting products:', error);
    return [];
  }
};

export const getProduct = async (productId) => {
  try {
    const productRef = doc(db, PRODUCTS_COLLECTION, productId);
    const productDoc = await getDoc(productRef);
    
    if (productDoc.exists()) {
      return {
        id: productDoc.id,
        ...productDoc.data()
      };
    }
    return null;
  } catch (error) {
    console.error('Error getting product:', error);
    return null;
  }
};

export const addProduct = async (productData) => {
  try {
    const productsRef = collection(db, PRODUCTS_COLLECTION);
    const priceOnRequest = Boolean(productData.priceOnRequest);
    const rawPrice = productData.price;
    const parsedPrice =
      typeof rawPrice === 'number'
        ? rawPrice
        : rawPrice === null || rawPrice === undefined
          ? 0
          : Number(rawPrice);

    const newProduct = {
      name: productData.name || '',
      description: productData.description || '',
      // If price is "on request", we intentionally store `null` so UI can distinguish
      // it from a real free item (price 0).
      priceOnRequest,
      price: priceOnRequest ? null : (Number.isNaN(parsedPrice) ? 0 : parsedPrice),
      discountRegistered: productData.discountRegistered || 0, // Discount for registered users (%)
      discountGold: productData.discountGold || 0, // Discount for gold users (%)
      stock: productData.stock || 0,
      images: productData.images || [],
      recommended: productData.recommended || false,
      active: productData.active !== false,
      order: productData.order || 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const docRef = await addDoc(productsRef, newProduct);
    const result = { id: docRef.id, ...newProduct };
    try {
      const { sendNewStoreItemTelegram } = await import('./telegram');
      await sendNewStoreItemTelegram(result, 'he');
    } catch (err) {
      // Telegram is best-effort; do not block the product create.
      console.error('store.addProduct telegram notify:', err);
    }
    return result;
  } catch (error) {
    console.error('Error adding product:', error);
    throw error;
  }
};

export const updateProduct = async (productId, productData) => {
  try {
    const productRef = doc(db, PRODUCTS_COLLECTION, productId);
    await updateDoc(productRef, {
      ...productData,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error updating product:', error);
    throw error;
  }
};

export const deleteProduct = async (productId) => {
  try {
    const productRef = doc(db, PRODUCTS_COLLECTION, productId);
    await deleteDoc(productRef);
  } catch (error) {
    console.error('Error deleting product:', error);
    throw error;
  }
};

// Update stock when order is placed
export const decreaseProductStock = async (productId, quantity = 1) => {
  try {
    const productRef = doc(db, PRODUCTS_COLLECTION, productId);
    await updateDoc(productRef, {
      stock: increment(-quantity),
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error decreasing product stock:', error);
    throw error;
  }
};

// Restore stock when order is cancelled/deleted
export const increaseProductStock = async (productId, quantity = 1) => {
  try {
    const productRef = doc(db, PRODUCTS_COLLECTION, productId);
    await updateDoc(productRef, {
      stock: increment(quantity),
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error increasing product stock:', error);
    throw error;
  }
};

// Orders
export const getOrders = async () => {
  try {
    const ordersRef = collection(db, ORDERS_COLLECTION);
    const q = query(ordersRef, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting orders:', error);
    return [];
  }
};

export const getOrder = async (orderId) => {
  try {
    const orderRef = doc(db, ORDERS_COLLECTION, orderId);
    const orderDoc = await getDoc(orderRef);
    
    if (orderDoc.exists()) {
      return {
        id: orderDoc.id,
        ...orderDoc.data()
      };
    }
    return null;
  } catch (error) {
    console.error('Error getting order:', error);
    return null;
  }
};

export const createOrder = async (orderData) => {
  try {
    const ordersRef = collection(db, ORDERS_COLLECTION);
    const newOrder = {
      customerName: orderData.customerName || '',
      customerPhone: orderData.customerPhone || '',
      customerTelegram: orderData.customerTelegram || '',
      items: orderData.items || [], // Array of { productId, productName, quantity, price, discount }
      totalPrice: orderData.totalPrice || 0,
      discountApplied: orderData.discountApplied || 0,
      finalPrice: orderData.finalPrice || 0,
      userType: orderData.userType || 'store', // 'store', 'registered', 'gold'
      status: 'pending', // 'pending', 'confirmed', 'completed', 'cancelled'
      stockRestored: false,
      stockRestoredAt: null,
      notes: orderData.notes || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Decrease stock for each item
    for (const item of newOrder.items) {
      await decreaseProductStock(item.productId, item.quantity);
    }
    
    const docRef = await addDoc(ordersRef, newOrder);
    const orderId = docRef.id;
    const itemsSummary = (newOrder.items || [])
      .map((i) => `${i.productName || 'Item'}${i.quantity > 1 ? ` x${i.quantity}` : ''}`)
      .filter(Boolean)
      .join(', ');
    const orderForNotify = {
      id: orderId,
      customerName: newOrder.customerName,
      customerPhone: newOrder.customerPhone,
      customerTelegram: newOrder.customerTelegram,
      finalPrice: newOrder.finalPrice,
      itemsSummary: itemsSummary || '',
      userType: newOrder.userType
    };
    try {
      const { sendNewStoreOrderTelegram } = await import('./telegram');
      await sendNewStoreOrderTelegram(orderForNotify, 'he');
    } catch (err) {
      // Telegram is best-effort; do not block the order create.
      console.error('store.createOrder telegram notify:', err);
    }
    return { id: orderId, ...newOrder };
  } catch (error) {
    console.error('Error creating order:', error);
    throw error;
  }
};

export const updateOrderStatus = async (orderId, status) => {
  try {
    const orderRef = doc(db, ORDERS_COLLECTION, orderId);
    // If cancelling, restore stock once.
    if (status === 'cancelled') {
      const orderDoc = await getDoc(orderRef);
      const orderData = orderDoc?.exists?.() ? orderDoc.data() : null;

      if (orderData && orderData.stockRestored !== true && Array.isArray(orderData.items)) {
        for (const item of orderData.items) {
          if (item?.productId && item?.quantity) {
            await increaseProductStock(item.productId, item.quantity);
          }
        }
        await updateDoc(orderRef, {
          status,
          stockRestored: true,
          stockRestoredAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        return;
      }
    }

    await updateDoc(orderRef, { status, updatedAt: new Date().toISOString() });
  } catch (error) {
    console.error('Error updating order status:', error);
    throw error;
  }
};

export const updateOrder = async (orderId, orderData) => {
  try {
    const orderRef = doc(db, ORDERS_COLLECTION, orderId);
    await updateDoc(orderRef, {
      ...orderData,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error updating order:', error);
    throw error;
  }
};

export const deleteOrder = async (orderId) => {
  try {
    const orderRef = doc(db, ORDERS_COLLECTION, orderId);
    // Restore stock before deleting (once), so deleting/cancelling won't permanently reduce stock.
    try {
      const orderDoc = await getDoc(orderRef);
      const orderData = orderDoc?.exists?.() ? orderDoc.data() : null;

      if (orderData && orderData.stockRestored !== true && Array.isArray(orderData.items)) {
        for (const item of orderData.items) {
          if (item?.productId && item?.quantity) {
            await increaseProductStock(item.productId, item.quantity);
          }
        }
        await updateDoc(orderRef, {
          stockRestored: true,
          stockRestoredAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
    } catch (e) {
      // If we can't read the order to restore stock, still proceed with deletion.
    }
    await deleteDoc(orderRef);
  } catch (error) {
    console.error('Error deleting order:', error);
    throw error;
  }
};

// Convert store user to regular user
export const convertStoreUserToRegular = async (orderId, orderDataOverride = null) => {
  try {
    const orderRef = doc(db, ORDERS_COLLECTION, orderId);

    // Prefer using order data from the caller (admin UI already has it).
    // This avoids needing read access to the orders collection.
    let orderData = orderDataOverride;
    if (!orderData) {
      const orderDoc = await getDoc(orderRef);
      if (!orderDoc?.exists?.()) {
        throw new Error('Order not found');
      }
      orderData = orderDoc.data() || {};
    }

    const phoneNumber = String(orderData.customerPhone || '').replace(/\D/g, '');
    if (!phoneNumber) {
      throw new Error('Missing customer phone');
    }

    const existingUser = await getUserByPhone(phoneNumber);

    let userId = existingUser?.id || null;
    if (!existingUser) {
      const usersRef = collection(db, 'users');
      const telegramUsername = String(orderData.customerTelegram || '').trim().replace(/^@+/g, '');
      const userData = {
        phoneNumber,
        name: orderData.customerName || '',
        gender: 'notDefined',
        level: 'regular',
        telegramUsername: telegramUsername || '',
        createdAt: new Date().toISOString()
      };

      const newUserRef = await addDoc(usersRef, userData);
      userId = newUserRef.id;
    }

    await updateDoc(orderRef, {
      userType: 'registered',
      userId,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error converting store user:', error);
    throw error;
  }
};

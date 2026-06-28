import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock Firestore functions
const mockGetDoc = vi.fn();
const mockSetDoc = vi.fn();
const mockAddDoc = vi.fn();
const mockUpdateDoc = vi.fn();
const mockDeleteDoc = vi.fn();
const mockGetDocs = vi.fn();
const mockDoc = vi.fn();
const mockCollection = vi.fn();
const mockQuery = vi.fn();
const mockOrderBy = vi.fn();
const mockWhere = vi.fn();
const mockIncrement = vi.fn();

vi.mock('firebase/firestore', () => ({
  doc: (...args) => mockDoc(...args),
  getDoc: (...args) => mockGetDoc(...args),
  setDoc: (...args) => mockSetDoc(...args),
  collection: (...args) => mockCollection(...args),
  addDoc: (...args) => mockAddDoc(...args),
  updateDoc: (...args) => mockUpdateDoc(...args),
  deleteDoc: (...args) => mockDeleteDoc(...args),
  getDocs: (...args) => mockGetDocs(...args),
  query: (...args) => mockQuery(...args),
  orderBy: (...args) => mockOrderBy(...args),
  where: (...args) => mockWhere(...args),
  increment: (val) => mockIncrement(val),
}));

vi.mock('./config', () => ({
  db: {}
}));

vi.mock('../utils/cache', () => ({
  getCached: () => null,
  setCached: vi.fn(),
  clearCache: vi.fn(),
  invalidateCache: vi.fn(),
  withDeduplication: async (_key, fn) => fn(),
}));

const mockGetUserByPhone = vi.fn();
vi.mock('./users', () => ({
  getUserByPhone: (...args) => mockGetUserByPhone(...args),
}));

// Import after mocking
import {
  getStoreSettings,
  updateStoreSettings,
  getProducts,
  getProduct,
  addProduct,
  updateProduct,
  deleteProduct,
  decreaseProductStock,
  getOrders,
  getOrder,
  createOrder,
  updateOrderStatus,
  updateOrder,
  deleteOrder,
  convertStoreUserToRegular
} from './store';

describe('Store Firebase Functions', () => {
  /** store.js logs errors on handled failure paths; keep test output clean */
  let consoleErrorSpy;
  let consoleWarnSpy;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    mockDoc.mockReturnValue('mockDocRef');
    mockCollection.mockReturnValue('mockCollectionRef');
    mockQuery.mockReturnValue('mockQueryRef');
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    vi.resetAllMocks();
  });

  // ==========================================
  // STORE SETTINGS TESTS
  // ==========================================
  describe('getStoreSettings', () => {
    it('should return store settings when document exists', async () => {
      const mockData = { enabled: true, storeName: 'Test Store', storeDescription: 'Test Description' };
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => mockData
      });

      const result = await getStoreSettings();

      expect(result).toEqual(mockData);
      expect(mockDoc).toHaveBeenCalled();
      expect(mockGetDoc).toHaveBeenCalled();
    });

    it('should return default settings when document does not exist', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => false
      });

      const result = await getStoreSettings();

      expect(result).toEqual({
        enabled: false,
        storeName: 'חנות',
        storeDescription: ''
      });
    });

    it('should return default settings on error', async () => {
      mockGetDoc.mockRejectedValue(new Error('Firebase error'));

      const result = await getStoreSettings();

      expect(result).toEqual({
        enabled: false,
        storeName: 'חנות',
        storeDescription: ''
      });
    });
  });

  describe('updateStoreSettings', () => {
    it('should update store settings successfully', async () => {
      mockSetDoc.mockResolvedValue(undefined);
      const settings = { enabled: true, storeName: 'New Store' };

      await expect(updateStoreSettings(settings)).resolves.not.toThrow();
      expect(mockSetDoc).toHaveBeenCalledWith('mockDocRef', settings, { merge: true });
    });

    it('should throw error on failure', async () => {
      const error = new Error('Update failed');
      mockSetDoc.mockRejectedValue(error);

      await expect(updateStoreSettings({ enabled: true })).rejects.toThrow('Update failed');
    });
  });

  // ==========================================
  // PRODUCTS TESTS
  // ==========================================
  describe('getProducts', () => {
    it('should return all products sorted by order', async () => {
      const mockProducts = [
        { id: '1', name: 'Product 1', order: 1 },
        { id: '2', name: 'Product 2', order: 2 }
      ];
      mockGetDocs.mockResolvedValue({
        docs: mockProducts.map(p => ({
          id: p.id,
          data: () => ({ name: p.name, order: p.order })
        }))
      });

      const result = await getProducts();

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Product 1');
    });

    it('should filter only active products when onlyActive is true', async () => {
      mockGetDocs.mockResolvedValue({ docs: [] });

      await getProducts(true);

      expect(mockWhere).toHaveBeenCalledWith('active', '==', true);
    });

    it('should return empty array on error', async () => {
      mockGetDocs.mockRejectedValue(new Error('Firebase error'));

      const result = await getProducts();

      expect(result).toEqual([]);
    });

    it('should return empty array when no products exist', async () => {
      mockGetDocs.mockResolvedValue({ docs: [] });

      const result = await getProducts();

      expect(result).toEqual([]);
    });
  });

  describe('getProduct', () => {
    it('should return product when it exists', async () => {
      const mockProduct = { name: 'Test Product', price: 100 };
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        id: 'product1',
        data: () => mockProduct
      });

      const result = await getProduct('product1');

      expect(result).toEqual({ id: 'product1', ...mockProduct });
    });

    it('should return null when product does not exist', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => false
      });

      const result = await getProduct('nonexistent');

      expect(result).toBeNull();
    });

    it('should return null on error', async () => {
      mockGetDoc.mockRejectedValue(new Error('Firebase error'));

      const result = await getProduct('product1');

      expect(result).toBeNull();
    });
  });

  describe('addProduct', () => {
    it('should add product with all fields', async () => {
      mockAddDoc.mockResolvedValue({ id: 'newProduct1' });
      const productData = {
        name: 'New Product',
        description: 'Description',
        price: 100,
        discountRegistered: 10,
        discountGold: 20,
        stock: 50,
        images: ['image1.jpg'],
        recommended: true,
        active: true,
        order: 1
      };

      const result = await addProduct(productData);

      expect(result.id).toBe('newProduct1');
      expect(result.name).toBe('New Product');
      expect(result.price).toBe(100);
      expect(result.discountRegistered).toBe(10);
      expect(result.discountGold).toBe(20);
      expect(result.recommended).toBe(true);
      expect(mockAddDoc).toHaveBeenCalled();
    });

    it('should add product with default values for missing fields', async () => {
      mockAddDoc.mockResolvedValue({ id: 'newProduct2' });

      const result = await addProduct({});

      expect(result.name).toBe('');
      expect(result.price).toBe(0);
      expect(result.stock).toBe(0);
      expect(result.discountRegistered).toBe(0);
      expect(result.discountGold).toBe(0);
      expect(result.images).toEqual([]);
      expect(result.recommended).toBe(false);
      expect(result.active).toBe(true);
    });

    it('should throw error on failure', async () => {
      mockAddDoc.mockRejectedValue(new Error('Add failed'));

      await expect(addProduct({ name: 'Test' })).rejects.toThrow('Add failed');
    });

    it('should set createdAt and updatedAt timestamps', async () => {
      mockAddDoc.mockResolvedValue({ id: 'newProduct3' });

      const result = await addProduct({ name: 'Test' });

      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
    });
  });

  describe('updateProduct', () => {
    it('should update product successfully', async () => {
      mockUpdateDoc.mockResolvedValue(undefined);

      await expect(updateProduct('product1', { name: 'Updated Name' })).resolves.not.toThrow();
      expect(mockUpdateDoc).toHaveBeenCalled();
    });

    it('should include updatedAt timestamp', async () => {
      mockUpdateDoc.mockResolvedValue(undefined);

      await updateProduct('product1', { name: 'Updated' });

      const updateCall = mockUpdateDoc.mock.calls[0][1];
      expect(updateCall.updatedAt).toBeDefined();
    });

    it('should throw error on failure', async () => {
      mockUpdateDoc.mockRejectedValue(new Error('Update failed'));

      await expect(updateProduct('product1', { name: 'Test' })).rejects.toThrow('Update failed');
    });
  });

  describe('deleteProduct', () => {
    it('should delete product successfully', async () => {
      mockDeleteDoc.mockResolvedValue(undefined);

      await expect(deleteProduct('product1')).resolves.not.toThrow();
      expect(mockDeleteDoc).toHaveBeenCalled();
    });

    it('should throw error on failure', async () => {
      mockDeleteDoc.mockRejectedValue(new Error('Delete failed'));

      await expect(deleteProduct('product1')).rejects.toThrow('Delete failed');
    });
  });

  describe('decreaseProductStock', () => {
    it('should decrease stock by 1 by default', async () => {
      mockUpdateDoc.mockResolvedValue(undefined);

      await decreaseProductStock('product1');

      expect(mockIncrement).toHaveBeenCalledWith(-1);
    });

    it('should decrease stock by specified quantity', async () => {
      mockUpdateDoc.mockResolvedValue(undefined);

      await decreaseProductStock('product1', 5);

      expect(mockIncrement).toHaveBeenCalledWith(-5);
    });

    it('should throw error on failure', async () => {
      mockUpdateDoc.mockRejectedValue(new Error('Stock update failed'));

      await expect(decreaseProductStock('product1')).rejects.toThrow('Stock update failed');
    });
  });

  // ==========================================
  // ORDERS TESTS
  // ==========================================
  describe('getOrders', () => {
    it('should return orders sorted by createdAt desc', async () => {
      const mockOrders = [
        { id: '1', customerName: 'Customer 1', createdAt: '2024-01-02' },
        { id: '2', customerName: 'Customer 2', createdAt: '2024-01-01' }
      ];
      mockGetDocs.mockResolvedValue({
        docs: mockOrders.map(o => ({
          id: o.id,
          data: () => ({ customerName: o.customerName, createdAt: o.createdAt })
        }))
      });

      const result = await getOrders();

      expect(result).toHaveLength(2);
      expect(mockOrderBy).toHaveBeenCalledWith('createdAt', 'desc');
    });

    it('should return empty array on error', async () => {
      mockGetDocs.mockRejectedValue(new Error('Firebase error'));

      const result = await getOrders();

      expect(result).toEqual([]);
    });
  });

  describe('getOrder', () => {
    it('should return order when it exists', async () => {
      const mockOrder = { customerName: 'Test Customer', totalPrice: 200 };
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        id: 'order1',
        data: () => mockOrder
      });

      const result = await getOrder('order1');

      expect(result).toEqual({ id: 'order1', ...mockOrder });
    });

    it('should return null when order does not exist', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => false
      });

      const result = await getOrder('nonexistent');

      expect(result).toBeNull();
    });

    it('should return null on error', async () => {
      mockGetDoc.mockRejectedValue(new Error('Firebase error'));

      const result = await getOrder('order1');

      expect(result).toBeNull();
    });
  });

  describe('createOrder', () => {
    it('should create order with all fields', async () => {
      mockAddDoc.mockResolvedValue({ id: 'newOrder1' });
      mockUpdateDoc.mockResolvedValue(undefined);
      
      const orderData = {
        customerName: 'Test Customer',
        customerPhone: '0501234567',
        customerTelegram: '@testuser',
        items: [
          { productId: 'p1', productName: 'Product 1', quantity: 2, price: 100 }
        ],
        totalPrice: 200,
        discountApplied: 20,
        finalPrice: 180,
        userType: 'registered'
      };

      const result = await createOrder(orderData);

      expect(result.id).toBe('newOrder1');
      expect(result.customerName).toBe('Test Customer');
      expect(result.status).toBe('pending');
      expect(mockAddDoc).toHaveBeenCalled();
    });

    it('should decrease stock for each item', async () => {
      mockAddDoc.mockResolvedValue({ id: 'newOrder2' });
      mockUpdateDoc.mockResolvedValue(undefined);
      
      const orderData = {
        items: [
          { productId: 'p1', quantity: 2 },
          { productId: 'p2', quantity: 3 }
        ]
      };

      await createOrder(orderData);

      // Should be called twice for stock decrease (once per item) + order creation
      expect(mockUpdateDoc).toHaveBeenCalledTimes(2);
    });

    it('should set default values for missing fields', async () => {
      mockAddDoc.mockResolvedValue({ id: 'newOrder3' });

      const result = await createOrder({});

      expect(result.customerName).toBe('');
      expect(result.customerPhone).toBe('');
      expect(result.items).toEqual([]);
      expect(result.totalPrice).toBe(0);
      expect(result.userType).toBe('store');
      expect(result.status).toBe('pending');
    });

    it('should throw error on failure', async () => {
      mockAddDoc.mockRejectedValue(new Error('Create order failed'));

      await expect(createOrder({ items: [] })).rejects.toThrow('Create order failed');
    });
  });

  describe('updateOrderStatus', () => {
    it('should update order status to confirmed', async () => {
      mockUpdateDoc.mockResolvedValue(undefined);

      await updateOrderStatus('order1', 'confirmed');

      expect(mockUpdateDoc).toHaveBeenCalled();
      const updateCall = mockUpdateDoc.mock.calls[0][1];
      expect(updateCall.status).toBe('confirmed');
    });

    it('should update order status to completed', async () => {
      mockUpdateDoc.mockResolvedValue(undefined);

      await updateOrderStatus('order1', 'completed');

      const updateCall = mockUpdateDoc.mock.calls[0][1];
      expect(updateCall.status).toBe('completed');
    });

    it('should update order status to cancelled', async () => {
      mockUpdateDoc.mockResolvedValue(undefined);
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          status: 'pending',
          stockRestored: false,
          items: [
            { productId: 'p1', quantity: 2 },
            { productId: 'p2', quantity: 1 }
          ]
        })
      });

      await updateOrderStatus('order1', 'cancelled');

      expect(mockGetDoc).toHaveBeenCalled();
      // Should restore stock (+2 and +1) and then mark order as cancelled.
      expect(mockIncrement).toHaveBeenCalledWith(2);
      expect(mockIncrement).toHaveBeenCalledWith(1);

      const cancelledUpdate = mockUpdateDoc.mock.calls.find((call) => call?.[1]?.status === 'cancelled');
      expect(cancelledUpdate).toBeTruthy();
      expect(cancelledUpdate[1].stockRestored).toBe(true);
    });

    it('should throw error on failure', async () => {
      mockUpdateDoc.mockRejectedValue(new Error('Status update failed'));

      await expect(updateOrderStatus('order1', 'confirmed')).rejects.toThrow('Status update failed');
    });
  });

  describe('updateOrder', () => {
    it('should update order successfully', async () => {
      mockUpdateDoc.mockResolvedValue(undefined);

      await expect(updateOrder('order1', { notes: 'Updated notes' })).resolves.not.toThrow();
      expect(mockUpdateDoc).toHaveBeenCalled();
    });

    it('should include updatedAt timestamp', async () => {
      mockUpdateDoc.mockResolvedValue(undefined);

      await updateOrder('order1', { notes: 'Test' });

      const updateCall = mockUpdateDoc.mock.calls[0][1];
      expect(updateCall.updatedAt).toBeDefined();
    });

    it('should throw error on failure', async () => {
      mockUpdateDoc.mockRejectedValue(new Error('Order update failed'));

      await expect(updateOrder('order1', {})).rejects.toThrow('Order update failed');
    });
  });

  describe('deleteOrder', () => {
    it('should delete order successfully', async () => {
      mockDeleteDoc.mockResolvedValue(undefined);
      mockUpdateDoc.mockResolvedValue(undefined);
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          status: 'pending',
          stockRestored: false,
          items: [
            { productId: 'p1', quantity: 3 },
            { productId: 'p2', quantity: 1 }
          ]
        })
      });

      await expect(deleteOrder('order1')).resolves.not.toThrow();
      expect(mockDeleteDoc).toHaveBeenCalled();
      // Stock should be restored before deletion.
      expect(mockIncrement).toHaveBeenCalledWith(3);
      expect(mockIncrement).toHaveBeenCalledWith(1);
    });

    it('should throw error on failure', async () => {
      mockDeleteDoc.mockRejectedValue(new Error('Delete order failed'));

      await expect(deleteOrder('order1')).rejects.toThrow('Delete order failed');
    });
  });

  describe('convertStoreUserToRegular', () => {
    it('should create a regular user and link order when user does not exist', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          customerName: 'Store Buyer',
          customerPhone: '0501234567',
          customerTelegram: '@buyer'
        })
      });
      mockGetUserByPhone.mockResolvedValue(null);
      mockAddDoc.mockResolvedValue({ id: 'newUser1' });
      mockUpdateDoc.mockResolvedValue(undefined);

      await convertStoreUserToRegular('order1');

      // User created as regular (no registrationExpiry)
      expect(mockAddDoc).toHaveBeenCalled();
      const createdUserData = mockAddDoc.mock.calls[0][1];
      expect(createdUserData.phoneNumber).toBe('0501234567');
      expect(createdUserData.level).toBe('regular');
      expect(createdUserData.registrationExpiry).toBeUndefined();

      // Order updated to show it now belongs to a system user
      const updateCall = mockUpdateDoc.mock.calls[mockUpdateDoc.mock.calls.length - 1][1];
      expect(updateCall.userType).toBe('registered');
      expect(updateCall.userId).toBe('newUser1');
    });

    it('should link existing user by phone and not create a new one', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({
          customerName: 'Existing Buyer',
          customerPhone: '0501234567',
          customerTelegram: ''
        })
      });
      mockGetUserByPhone.mockResolvedValue({ id: 'u1', phoneNumber: '0501234567' });
      mockUpdateDoc.mockResolvedValue(undefined);

      await convertStoreUserToRegular('order1');

      expect(mockAddDoc).not.toHaveBeenCalled();
      const updateCall = mockUpdateDoc.mock.calls[0][1];
      expect(updateCall.userType).toBe('registered');
      expect(updateCall.userId).toBe('u1');
    });

    it('should throw error on failure', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({ customerPhone: '0501234567' })
      });
      mockGetUserByPhone.mockResolvedValue({ id: 'u1', phoneNumber: '0501234567' });
      mockUpdateDoc.mockRejectedValue(new Error('Convert failed'));

      await expect(convertStoreUserToRegular('order1')).rejects.toThrow('Convert failed');
    });
  });

  // ==========================================
  // EDGE CASES AND NEGATIVE SCENARIOS
  // ==========================================
  describe('Edge Cases', () => {
    describe('Product Edge Cases', () => {
      it('should handle product with zero price', async () => {
        mockAddDoc.mockResolvedValue({ id: 'freeProduct' });

        const result = await addProduct({ name: 'Free Item', price: 0 });

        expect(result.price).toBe(0);
      });

      it('should handle product with zero stock', async () => {
        mockAddDoc.mockResolvedValue({ id: 'outOfStock' });

        const result = await addProduct({ name: 'Out of Stock', stock: 0 });

        expect(result.stock).toBe(0);
      });

      it('should handle product with 100% discount', async () => {
        mockAddDoc.mockResolvedValue({ id: 'fullDiscount' });

        const result = await addProduct({ 
          name: 'Full Discount', 
          discountRegistered: 100,
          discountGold: 100 
        });

        expect(result.discountRegistered).toBe(100);
        expect(result.discountGold).toBe(100);
      });

      it('should handle product with empty images array', async () => {
        mockAddDoc.mockResolvedValue({ id: 'noImages' });

        const result = await addProduct({ name: 'No Images', images: [] });

        expect(result.images).toEqual([]);
      });

      it('should handle product with multiple images', async () => {
        mockAddDoc.mockResolvedValue({ id: 'multiImage' });
        const images = ['img1.jpg', 'img2.jpg', 'img3.jpg', 'img4.jpg', 'img5.jpg'];

        const result = await addProduct({ name: 'Multi Image', images });

        expect(result.images).toHaveLength(5);
      });

      it('should handle product with very long name', async () => {
        mockAddDoc.mockResolvedValue({ id: 'longName' });
        const longName = 'A'.repeat(500);

        const result = await addProduct({ name: longName });

        expect(result.name).toBe(longName);
      });

      it('should handle product with special characters in name', async () => {
        mockAddDoc.mockResolvedValue({ id: 'specialChars' });
        const specialName = 'Product <script>alert("xss")</script> & "quotes" \'apostrophe\'';

        const result = await addProduct({ name: specialName });

        expect(result.name).toBe(specialName);
      });

      it('should handle product with Hebrew characters', async () => {
        mockAddDoc.mockResolvedValue({ id: 'hebrewProduct' });
        const hebrewName = 'מוצר בעברית';

        const result = await addProduct({ name: hebrewName });

        expect(result.name).toBe(hebrewName);
      });

      it('should handle product with emoji in description', async () => {
        mockAddDoc.mockResolvedValue({ id: 'emojiProduct' });
        const emojiDesc = 'Great product! 🎉👍🔥';

        const result = await addProduct({ description: emojiDesc });

        expect(result.description).toBe(emojiDesc);
      });
    });

    describe('Order Edge Cases', () => {
      it('should handle order with empty items array', async () => {
        mockAddDoc.mockResolvedValue({ id: 'emptyOrder' });

        const result = await createOrder({ items: [] });

        expect(result.items).toEqual([]);
      });

      it('should handle order with single item', async () => {
        mockAddDoc.mockResolvedValue({ id: 'singleItem' });
        mockUpdateDoc.mockResolvedValue(undefined);

        const result = await createOrder({
          items: [{ productId: 'p1', quantity: 1 }]
        });

        expect(result.items).toHaveLength(1);
      });

      it('should handle order with many items', async () => {
        mockAddDoc.mockResolvedValue({ id: 'manyItems' });
        mockUpdateDoc.mockResolvedValue(undefined);
        const items = Array(20).fill(null).map((_, i) => ({
          productId: `p${i}`,
          quantity: 1
        }));

        const result = await createOrder({ items });

        expect(result.items).toHaveLength(20);
      });

      it('should handle order with large quantity', async () => {
        mockAddDoc.mockResolvedValue({ id: 'largeQty' });
        mockUpdateDoc.mockResolvedValue(undefined);

        const result = await createOrder({
          items: [{ productId: 'p1', quantity: 999 }]
        });

        expect(mockIncrement).toHaveBeenCalledWith(-999);
      });

      it('should handle order with phone number without prefix', async () => {
        mockAddDoc.mockResolvedValue({ id: 'noPrefix' });

        const result = await createOrder({ customerPhone: '1234567890' });

        expect(result.customerPhone).toBe('1234567890');
      });

      it('should handle order without telegram username', async () => {
        mockAddDoc.mockResolvedValue({ id: 'noTelegram' });

        const result = await createOrder({ customerTelegram: '' });

        expect(result.customerTelegram).toBe('');
      });

      it('should handle order with zero total price', async () => {
        mockAddDoc.mockResolvedValue({ id: 'freeOrder' });

        const result = await createOrder({ totalPrice: 0, finalPrice: 0 });

        expect(result.totalPrice).toBe(0);
        expect(result.finalPrice).toBe(0);
      });

      it('should handle order with discount greater than total', async () => {
        mockAddDoc.mockResolvedValue({ id: 'bigDiscount' });

        const result = await createOrder({
          totalPrice: 100,
          discountApplied: 150,
          finalPrice: 0
        });

        expect(result.discountApplied).toBe(150);
      });
    });

    describe('Stock Edge Cases', () => {
      it('should handle decreasing stock to zero', async () => {
        mockUpdateDoc.mockResolvedValue(undefined);

        await decreaseProductStock('product1', 10);

        expect(mockIncrement).toHaveBeenCalledWith(-10);
      });

      it('should handle decreasing stock by zero', async () => {
        mockUpdateDoc.mockResolvedValue(undefined);

        await decreaseProductStock('product1', 0);

        expect(mockIncrement).toHaveBeenCalledWith(-0);
      });
    });

    describe('Concurrent Operations', () => {
      it('should handle multiple simultaneous product updates', async () => {
        mockUpdateDoc.mockResolvedValue(undefined);

        const updates = Promise.all([
          updateProduct('p1', { name: 'Update 1' }),
          updateProduct('p1', { name: 'Update 2' }),
          updateProduct('p1', { name: 'Update 3' })
        ]);

        await expect(updates).resolves.not.toThrow();
        expect(mockUpdateDoc).toHaveBeenCalledTimes(3);
      });

      it('should handle multiple simultaneous order creations', async () => {
        mockAddDoc.mockResolvedValue({ id: 'concurrent' });
        mockUpdateDoc.mockResolvedValue(undefined);

        const orders = Promise.all([
          createOrder({ items: [] }),
          createOrder({ items: [] }),
          createOrder({ items: [] })
        ]);

        await expect(orders).resolves.not.toThrow();
      });
    });

    describe('Invalid Input Handling', () => {
      it('should handle empty product data object', async () => {
        mockAddDoc.mockResolvedValue({ id: 'empty' });

        const result = await addProduct({});

        expect(result.name).toBe('');
        expect(result.price).toBe(0);
      });

      it('should handle null values in product data', async () => {
        mockAddDoc.mockResolvedValue({ id: 'nullValues' });

        const result = await addProduct({
          name: null,
          price: null,
          stock: null
        });

        // Should use defaults for null values
        expect(result).toBeDefined();
      });

      it('should handle negative price (though should be validated elsewhere)', async () => {
        mockAddDoc.mockResolvedValue({ id: 'negativePrice' });

        const result = await addProduct({ price: -100 });

        expect(result.price).toBe(-100);
      });

      it('should handle negative stock', async () => {
        mockAddDoc.mockResolvedValue({ id: 'negativeStock' });

        const result = await addProduct({ stock: -5 });

        expect(result.stock).toBe(-5);
      });

      it('should handle discount over 100%', async () => {
        mockAddDoc.mockResolvedValue({ id: 'overDiscount' });

        const result = await addProduct({ discountRegistered: 150 });

        expect(result.discountRegistered).toBe(150);
      });

      it('should handle negative discount', async () => {
        mockAddDoc.mockResolvedValue({ id: 'negativeDiscount' });

        const result = await addProduct({ discountGold: -10 });

        expect(result.discountGold).toBe(-10);
      });
    });
  });
});

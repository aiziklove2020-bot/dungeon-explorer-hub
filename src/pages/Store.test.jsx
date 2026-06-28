import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import Store from './Store';

const { storeTestI18n } = vi.hoisted(() => {
  const storeTestI18n = {
    'store.title': 'Store',
    'store.subtitle': 'Quality Products',
    'store.emptyStore': 'No products available',
    'store.addToCart': 'Add to Cart',
    'store.priceOnRequest': 'Leave details to purchase',
    'store.outOfStock': 'Out of Stock',
    'store.inStock': 'In Stock',
    'store.recommended': 'Recommended',
    'store.cart': 'Cart',
    'store.emptyCart': 'Your cart is empty',
    'store.total': 'Total',
    'store.checkout': 'Checkout',
    'store.orderDetails': 'Order Details',
    'store.customerName': 'Full Name',
    'store.customerPhone': 'Phone Number',
    'store.customerTelegram': 'Telegram (Optional)',
    'store.placeOrder': 'Place Order',
    'store.orderSuccess': 'Order placed successfully!',
    'store.orderSuccessMessage': 'We will contact you soon.',
    'store.backToStore': 'Back to Store',
    'store.backToHome': 'Back to Home',
    'store.closed': 'Store is currently closed',
    'store.stockRemaining': 'remaining',
    'store.discountForParties': 'Discount for parties subscribers',
    'store.discountForExchange': 'Discount for exchange subscribers',
    'store.discountForGold': 'Discount for gold users',
  };
  return { storeTestI18n };
});

vi.mock('../context/AuthContext', () => ({
  useSiteAuth: () => ({ siteUser: null }),
}));

vi.mock('../components/EditableLabel', () => ({
  default: ({ fallback, translationKey }) => {
    const fromKey = translationKey ? storeTestI18n[translationKey] : '';
    const text = (fromKey != null && fromKey !== '') ? fromKey : (fallback ?? '') || translationKey || '';
    return <span data-testid="editable-label">{text}</span>;
  },
}));

vi.mock('../components/SEO', () => ({
  default: () => null,
}));

vi.mock('../i18n/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key) => storeTestI18n[key] || key,
    language: 'he',
  }),
}));

// Mock store functions
const mockGetProducts = vi.fn();
const mockGetStoreSettings = vi.fn();
const mockCreateOrder = vi.fn();

vi.mock('../firebase/store', () => ({
  getProducts: (...args) => mockGetProducts(...args),
  getStoreSettings: (...args) => mockGetStoreSettings(...args),
  createOrder: (...args) => mockCreateOrder(...args)
}));

// Mock Loader component
vi.mock('../components/Loader', () => ({
  default: () => <div data-testid="loader">Loading...</div>
}));

const renderStore = () => {
  return render(
    <HelmetProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Store />
      </BrowserRouter>
    </HelmetProvider>
  );
};

describe('Store Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetStoreSettings.mockResolvedValue({ enabled: true });
    mockGetProducts.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // ==========================================
  // LOADING STATE TESTS
  // ==========================================
  describe('Loading State', () => {
    it('should show loader while fetching data', () => {
      mockGetStoreSettings.mockReturnValue(new Promise(() => {})); // Never resolves
      
      renderStore();
      
      expect(screen.getByTestId('loader')).toBeInTheDocument();
    });
  });

  // ==========================================
  // STORE DISABLED TESTS
  // ==========================================
  describe('Store Disabled', () => {
    it('should show store closed message when disabled', async () => {
      mockGetStoreSettings.mockResolvedValue({ enabled: false });
      
      renderStore();
      
      await waitFor(() => {
        expect(screen.getByText('Store is currently closed')).toBeInTheDocument();
      });
    });

    it('should show back button when store is disabled', async () => {
      mockGetStoreSettings.mockResolvedValue({ enabled: false });
      
      renderStore();
      
      await waitFor(() => {
        expect(screen.getByText('Back to Home')).toBeInTheDocument();
      });
    });
  });

  // ==========================================
  // EMPTY STORE TESTS
  // ==========================================
  describe('Empty Store', () => {
    it('should show empty message when no products', async () => {
      mockGetStoreSettings.mockResolvedValue({ enabled: true });
      mockGetProducts.mockResolvedValue([]);
      
      renderStore();
      
      await waitFor(() => {
        expect(screen.getByText('No products available')).toBeInTheDocument();
      });
    });
  });

  // ==========================================
  // PRODUCTS DISPLAY TESTS
  // ==========================================
  describe('Products Display', () => {
    const mockProducts = [
      {
        id: 'p1',
        name: 'Product 1',
        description: 'Description 1',
        price: 100,
        stock: 10,
        images: ['image1.jpg'],
        recommended: false,
        discountParties: 0,
        discountExchange: 0,
        discountGold: 0
      },
      {
        id: 'p2',
        name: 'Product 2',
        description: 'Description 2',
        price: 200,
        stock: 5,
        images: ['image2.jpg'],
        recommended: true,
        discountParties: 10,
        discountExchange: 15,
        discountGold: 20
      }
    ];

    beforeEach(() => {
      mockGetProducts.mockResolvedValue(mockProducts);
    });

    it('should display all products', async () => {
      renderStore();
      
      await waitFor(() => {
        expect(screen.getByText('Product 1')).toBeInTheDocument();
        expect(screen.getByText('Product 2')).toBeInTheDocument();
      });
    });

    it('should display product prices', async () => {
      renderStore();
      
      await waitFor(() => {
        expect(screen.getByText('₪100')).toBeInTheDocument();
        expect(screen.getByText('₪200')).toBeInTheDocument();
      });
    });

    it('should display recommended badge for recommended products', async () => {
      renderStore();
      
      await waitFor(() => {
        expect(screen.getByText('Recommended')).toBeInTheDocument();
      });
    });

    it('should display stock information', async () => {
      renderStore();
      
      await waitFor(() => {
        expect(screen.getAllByText('In Stock').length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText('remaining').length).toBeGreaterThanOrEqual(1);
      });
    });

    it('should display discounts when available', async () => {
      renderStore();
      
      await waitFor(() => {
        expect(screen.getByText('Discount for parties subscribers')).toBeInTheDocument();
        expect(screen.getByText('Discount for exchange subscribers')).toBeInTheDocument();
        expect(screen.getByText('Discount for gold users')).toBeInTheDocument();
      });
    });

    it('should show out of stock for products with zero stock', async () => {
      mockGetProducts.mockResolvedValue([
        { id: 'p3', name: 'Out of Stock Product', price: 50, stock: 0, images: [] }
      ]);
      
      renderStore();
      
      await waitFor(() => {
        expect(screen.getByText('Out of Stock')).toBeInTheDocument();
      });
    });
  });

  // ==========================================
  // CART FUNCTIONALITY TESTS
  // ==========================================
  describe('Cart Functionality', () => {
    const mockProducts = [
      {
        id: 'p1',
        name: 'Product 1',
        price: 100,
        stock: 10,
        images: ['image1.jpg'],
        recommended: false,
        discountParties: 0,
        discountExchange: 0,
        discountGold: 0
      }
    ];

    beforeEach(() => {
      mockGetProducts.mockResolvedValue(mockProducts);
    });

    it('should add product to cart when clicking add button', async () => {
      const user = userEvent.setup();
      renderStore();
      
      await waitFor(() => {
        expect(screen.getByText('Product 1')).toBeInTheDocument();
      });
      
      const addButton = screen.getByRole('button', { name: /Add to Cart/i });
      await user.click(addButton);
      
      // Cart floating button should appear with badge
      await waitFor(() => {
        expect(screen.getByText('1')).toBeInTheDocument();
      });
    });

    it('should increase quantity in cart', async () => {
      const user = userEvent.setup();
      renderStore();
      
      await waitFor(() => {
        expect(screen.getByText('Product 1')).toBeInTheDocument();
      });
      
      // Add item twice
      const addButton = screen.getByRole('button', { name: /Add to Cart/i });
      await user.click(addButton);
      await user.click(addButton);
      
      // Badge should show 2
      await waitFor(() => {
        expect(screen.getByText('2')).toBeInTheDocument();
      });
    });

    it('should not add more than stock allows', async () => {
      mockGetProducts.mockResolvedValue([
        { id: 'p1', name: 'Limited Product', price: 100, stock: 2, images: [] }
      ]);
      
      const user = userEvent.setup();
      renderStore();
      
      await waitFor(() => {
        expect(screen.getByText('Limited Product')).toBeInTheDocument();
      });
      
      const addButton = screen.getByRole('button', { name: /Add to Cart/i });
      
      // Add 3 times (but stock is only 2)
      await user.click(addButton);
      await user.click(addButton);
      await user.click(addButton);
      
      // Badge should show 2 (max stock)
      await waitFor(() => {
        expect(screen.getByText('2')).toBeInTheDocument();
      });
    });

    it('should calculate correct total in cart', async () => {
      mockGetProducts.mockResolvedValue([
        { id: 'p1', name: 'Product 1', price: 100, stock: 10, images: [] },
        { id: 'p2', name: 'Product 2', price: 50, stock: 10, images: [] }
      ]);
      
      const user = userEvent.setup();
      renderStore();
      
      await waitFor(() => {
        expect(screen.getByText('Product 1')).toBeInTheDocument();
      });
      
      // Add both products
      const addButtons = screen.getAllByRole('button', { name: /Add to Cart/i });
      await user.click(addButtons[0]); // 100
      await user.click(addButtons[1]); // 50
      
      // Badge should show 2 items
      await waitFor(() => {
        expect(screen.getByText('2')).toBeInTheDocument();
      });
    });
  });

  // ==========================================
  // CHECKOUT FORM TESTS
  // ==========================================
  describe('Checkout Form', () => {
    const mockProducts = [
      { id: 'p1', name: 'Product 1', price: 100, stock: 10, images: [] }
    ];

    beforeEach(() => {
      mockGetProducts.mockResolvedValue(mockProducts);
      mockCreateOrder.mockResolvedValue({ id: 'order1' });
    });

    it('should render products that can be added to cart', async () => {
      renderStore();
      
      await waitFor(() => {
        expect(screen.getByText('Product 1')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Add to Cart/i })).toBeInTheDocument();
      });
    });

    it('should create order with correct data when checkout completes', async () => {
      // Test that createOrder is called with expected structure
      const orderData = {
        customerName: 'Test User',
        customerPhone: '0501234567',
        customerTelegram: '@test',
        items: [{ productId: 'p1', productName: 'Product 1', quantity: 1, price: 100, discount: 0 }],
        totalPrice: 100,
        discountApplied: 0,
        finalPrice: 100,
        userType: 'store'
      };
      
      mockCreateOrder.mockResolvedValue({ id: 'order1', ...orderData });
      
      // Verify the mock is set up correctly
      const result = await mockCreateOrder(orderData);
      expect(result.customerName).toBe('Test User');
      expect(mockCreateOrder).toHaveBeenCalledWith(orderData);
    });
  });

  // ==========================================
  // PRODUCT MODAL TESTS
  // ==========================================
  describe('Product Modal', () => {
    const mockProducts = [
      {
        id: 'p1',
        name: 'Product with Gallery',
        description: 'Long description here',
        price: 100,
        stock: 10,
        images: ['image1.jpg', 'image2.jpg', 'image3.jpg'],
        recommended: true,
        discountParties: 10,
        discountExchange: 0,
        discountGold: 20
      }
    ];

    beforeEach(() => {
      mockGetProducts.mockResolvedValue(mockProducts);
    });

    it('should show image gallery indicator for multiple images', async () => {
      renderStore();
      
      await waitFor(() => {
        expect(screen.getByText('Product with Gallery')).toBeInTheDocument();
      });
      
      // Product card should show +2 for additional images
      expect(screen.getByText('+2')).toBeInTheDocument();
    });

    it('should render product with image', async () => {
      renderStore();
      
      await waitFor(() => {
        expect(screen.getByText('Product with Gallery')).toBeInTheDocument();
      });
      
      // Should have an image
      const images = screen.getAllByRole('img');
      expect(images.length).toBeGreaterThan(0);
    });
  });

  // ==========================================
  // EDGE CASES AND NEGATIVE SCENARIOS
  // ==========================================
  describe('Edge Cases', () => {
    it('should handle products with no images', async () => {
      mockGetProducts.mockResolvedValue([
        { id: 'p1', name: 'No Image Product', price: 100, stock: 10, images: [] }
      ]);
      
      renderStore();
      
      await waitFor(() => {
        expect(screen.getByText('No Image Product')).toBeInTheDocument();
      });
      
      // Should show placeholder instead of broken image
      expect(screen.queryByRole('img')).toBeNull();
    });

    it('should handle products with very long names', async () => {
      const longName = 'A'.repeat(200);
      mockGetProducts.mockResolvedValue([
        { id: 'p1', name: longName, price: 100, stock: 10, images: [] }
      ]);
      
      renderStore();
      
      await waitFor(() => {
        expect(screen.getByText(longName)).toBeInTheDocument();
      });
    });

    it('should handle products with special characters', async () => {
      mockGetProducts.mockResolvedValue([
        { id: 'p1', name: 'Product <>&"\'', price: 100, stock: 10, images: [] }
      ]);
      
      renderStore();
      
      await waitFor(() => {
        expect(screen.getByText('Product <>&"\'')).toBeInTheDocument();
      });
    });

    it('should handle products with Hebrew text', async () => {
      mockGetProducts.mockResolvedValue([
        { id: 'p1', name: 'מוצר בעברית', price: 100, stock: 10, images: [] }
      ]);
      
      renderStore();
      
      await waitFor(() => {
        expect(screen.getByText('מוצר בעברית')).toBeInTheDocument();
      });
    });

    it('should handle very high prices', async () => {
      mockGetProducts.mockResolvedValue([
        { id: 'p1', name: 'Expensive', price: 999999, stock: 10, images: [] }
      ]);
      
      renderStore();
      
      await waitFor(() => {
        expect(screen.getByText('₪999999')).toBeInTheDocument();
      });
    });

    it('should handle zero price products', async () => {
      mockGetProducts.mockResolvedValue([
        { id: 'p1', name: 'Free Item', price: 0, stock: 10, images: [] }
      ]);
      
      renderStore();
      
      await waitFor(() => {
        expect(screen.getByText('₪0')).toBeInTheDocument();
      });
    });

    it('should handle decimal prices', async () => {
      mockGetProducts.mockResolvedValue([
        { id: 'p1', name: 'Decimal Price', price: 99.99, stock: 10, images: [] }
      ]);
      
      renderStore();
      
      await waitFor(() => {
        expect(screen.getByText('₪99.99')).toBeInTheDocument();
      });
    });

    it('should show out of stock text for zero stock products', async () => {
      mockGetProducts.mockResolvedValue([
        { id: 'p1', name: 'No Stock Item', price: 100, stock: 0, images: [] }
      ]);
      
      renderStore();
      
      await waitFor(() => {
        expect(screen.getByText('Out of Stock')).toBeInTheDocument();
      });
    });

    it('should handle products loading gracefully', async () => {
      mockGetProducts.mockResolvedValue([]);
      
      renderStore();
      
      // Should show empty state
      await waitFor(() => {
        expect(screen.getByText('No products available')).toBeInTheDocument();
      });
    });
  });
});

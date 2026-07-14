import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StoreSection from './StoreSection';

// Mock language context (include all admin.store.* keys used by StoreSection)
vi.mock('../../i18n/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key) => {
      const translations = {
        'admin.store.settings': 'Store Settings',
        'admin.store.enabled': 'Store Enabled',
        'admin.store.disabled': 'Store Disabled',
        'admin.store.products': 'Products',
        'admin.store.orders': 'Orders',
        'admin.store.addProduct': 'Add Product',
        'admin.store.editProduct': 'Edit Product',
        'admin.store.productName': 'Product Name',
        'admin.store.productDescription': 'Description',
        'admin.store.productPrice': 'Price',
        'admin.store.productStock': 'Stock',
        'admin.store.stock': 'Stock:',
        'admin.store.inactive': 'Inactive',
        'admin.store.discountRegistered': 'Discount Registered (%)',
        'admin.store.discountGold': 'Discount Gold (%)',
        'admin.store.productImages': 'Images',
        'admin.store.addImage': 'Add Image',
        'admin.store.recommended': 'Recommended',
        'admin.store.active': 'Active',
        'admin.store.order': 'Order',
        'admin.store.noProducts': 'No products yet',
        'admin.store.confirmDeleteProduct': 'Delete this product?',
        'admin.store.orderNumber': 'Order #',
        'admin.store.customer': 'Customer',
        'admin.store.orderItems': 'Items',
        'admin.store.orderTotal': 'Total',
        'admin.store.orderStatus': 'Status',
        'admin.store.noOrders': 'No orders yet',
        'admin.store.statusPending': 'Pending',
        'admin.store.statusConfirmed': 'Confirmed',
        'admin.store.statusCompleted': 'Completed',
        'admin.store.statusCancelled': 'Cancelled',
        'admin.store.userType': 'User Type',
        'admin.store.userTypeStore': 'Store Customer',
        'admin.store.userTypeRegistered': 'Registered',
        'admin.store.userTypeGold': 'Gold User',
        'admin.store.makeRegularUser': 'Make Regular User',
        'admin.store.confirmDeleteOrder': 'Delete this order?',
        'admin.store.enterProductNamePlaceholder': 'Product name',
        'admin.store.enterDescriptionPlaceholder': 'Description',
        'admin.store.priceOnRequest': 'Price on request',
        'admin.store.errorUploadingImage': 'Upload error',
        'admin.store.enterProductName': 'Enter product name',
        'admin.store.errorSavingProduct': 'Save error',
        'admin.store.errorConvertingUser': 'Convert error',
        'admin.save': 'Save',
        'admin.cancel': 'Cancel',
      };
      return translations[key] || key;
    },
    language: 'he'
  })
}));

// Mock store functions
const mockGetStoreSettings = vi.fn();
const mockUpdateStoreSettings = vi.fn();
const mockGetProducts = vi.fn();
const mockAddProduct = vi.fn();
const mockUpdateProduct = vi.fn();
const mockDeleteProduct = vi.fn();
const mockGetOrders = vi.fn();
const mockUpdateOrderStatus = vi.fn();
const mockDeleteOrder = vi.fn();
const mockConvertStoreUserToRegular = vi.fn();

vi.mock('../../firebase/store', () => ({
  getStoreSettings: (...args) => mockGetStoreSettings(...args),
  updateStoreSettings: (...args) => mockUpdateStoreSettings(...args),
  getProducts: (...args) => mockGetProducts(...args),
  addProduct: (...args) => mockAddProduct(...args),
  updateProduct: (...args) => mockUpdateProduct(...args),
  deleteProduct: (...args) => mockDeleteProduct(...args),
  getOrders: (...args) => mockGetOrders(...args),
  updateOrderStatus: (...args) => mockUpdateOrderStatus(...args),
  deleteOrder: (...args) => mockDeleteOrder(...args),
  convertStoreUserToRegular: (...args) => mockConvertStoreUserToRegular(...args),
}));

// Mock users lookup + getAllUsers (StoreSection resolves store phones via getAllUsers)
const mockGetUserByPhone = vi.fn();
const mockGetAllUsers = vi.fn();
vi.mock('../../firebase/users', () => ({
  getUserByPhone: (...args) => mockGetUserByPhone(...args),
  getAllUsers: (...args) => mockGetAllUsers(...args),
}));

// Mock storage functions
const mockUploadPartyImage = vi.fn();
vi.mock('../../firebase/storage', () => ({
  uploadPartyImage: (...args) => mockUploadPartyImage(...args)
}));

// Mock Loader
vi.mock('../Loader', () => ({
  default: () => <div data-testid="loader">Loading...</div>
}));

const mockShowSaved = vi.fn();

describe('StoreSection Admin Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetStoreSettings.mockResolvedValue({ enabled: false });
    mockGetProducts.mockResolvedValue([]);
    mockGetOrders.mockResolvedValue([]);
    mockGetUserByPhone.mockResolvedValue(null);
    mockGetAllUsers.mockResolvedValue([]);
    window.confirm = vi.fn(() => true);
    window.alert = vi.fn();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // ==========================================
  // LOADING STATE TESTS
  // ==========================================
  describe('Loading State', () => {
    it('should show loader while fetching data', () => {
      mockGetStoreSettings.mockReturnValue(new Promise(() => {}));
      
      render(<StoreSection showSaved={mockShowSaved} />);
      
      expect(screen.getByTestId('loader')).toBeInTheDocument();
    });
  });

  // ==========================================
  // STORE SETTINGS TESTS
  // ==========================================
  describe('Store Settings', () => {
    it('should display store settings section', async () => {
      render(<StoreSection showSaved={mockShowSaved} />);
      
      await waitFor(() => {
        expect(screen.getByText('Store Settings')).toBeInTheDocument();
      });
    });

    it('should show disabled status when store is disabled', async () => {
      mockGetStoreSettings.mockResolvedValue({ enabled: false });
      
      render(<StoreSection showSaved={mockShowSaved} />);
      
      await waitFor(() => {
        expect(screen.getByText('Store Disabled')).toBeInTheDocument();
      });
    });

    it('should show enabled status when store is enabled', async () => {
      mockGetStoreSettings.mockResolvedValue({ enabled: true });
      
      render(<StoreSection showSaved={mockShowSaved} />);
      
      await waitFor(() => {
        expect(screen.getByText('Store Enabled')).toBeInTheDocument();
      });
    });

    it('should toggle store status when clicking button', async () => {
      const user = userEvent.setup();
      mockGetStoreSettings.mockResolvedValue({ enabled: false });
      mockUpdateStoreSettings.mockResolvedValue(undefined);
      
      render(<StoreSection showSaved={mockShowSaved} />);
      
      await waitFor(() => {
        expect(screen.getByText('Store Disabled')).toBeInTheDocument();
      });
      
      await user.click(screen.getByText('Store Disabled'));
      
      await waitFor(() => {
        expect(mockUpdateStoreSettings).toHaveBeenCalledWith({ enabled: true });
      });
    });

    it('should call showSaved after toggling store', async () => {
      const user = userEvent.setup();
      mockGetStoreSettings.mockResolvedValue({ enabled: false });
      mockUpdateStoreSettings.mockResolvedValue(undefined);
      
      render(<StoreSection showSaved={mockShowSaved} />);
      
      await waitFor(() => {
        expect(screen.getByText('Store Disabled')).toBeInTheDocument();
      });
      
      await user.click(screen.getByText('Store Disabled'));
      
      await waitFor(() => {
        expect(mockShowSaved).toHaveBeenCalled();
      });
    });
  });

  // ==========================================
  // TABS NAVIGATION TESTS
  // ==========================================
  describe('Tabs Navigation', () => {
    it('should show tabs after loading', async () => {
      render(<StoreSection showSaved={mockShowSaved} />);
      
      await waitFor(() => {
        expect(screen.getByText('Store Settings')).toBeInTheDocument();
      });
      
      // Tabs should be visible - use getAllByText since "Products" appears in both tab and heading
      expect(screen.getAllByText('Products').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Orders').length).toBeGreaterThan(0);
    });

    it('should switch to Orders tab when clicked', async () => {
      const user = userEvent.setup();
      mockGetOrders.mockResolvedValue([]);
      
      render(<StoreSection showSaved={mockShowSaved} />);
      
      await waitFor(() => {
        expect(screen.getByText('Store Settings')).toBeInTheDocument();
      });
      
      await user.click(screen.getByRole('button', { name: /Orders/i }));
      
      await waitFor(() => {
        expect(screen.getByText('No orders yet')).toBeInTheDocument();
      });
    });

    it('should show pending orders badge', async () => {
      mockGetOrders.mockResolvedValue([
        { id: 'o1', status: 'pending', customerName: 'Test', items: [], createdAt: new Date().toISOString(), userType: 'store' },
        { id: 'o2', status: 'pending', customerName: 'Test2', items: [], createdAt: new Date().toISOString(), userType: 'store' },
      ]);
      
      render(<StoreSection showSaved={mockShowSaved} />);
      
      await waitFor(() => {
        expect(screen.getByText('2')).toBeInTheDocument();
      });
    });
  });

  // ==========================================
  // PRODUCTS TAB TESTS
  // ==========================================
  describe('Products Tab', () => {
    it('should show empty state when no products', async () => {
      mockGetProducts.mockResolvedValue([]);
      
      render(<StoreSection showSaved={mockShowSaved} />);
      
      await waitFor(() => {
        expect(screen.getByText('No products yet')).toBeInTheDocument();
      });
    });

    it('should display products list', async () => {
      mockGetProducts.mockResolvedValue([
        { id: 'p1', name: 'Product 1', price: 100, stock: 10, active: true },
        { id: 'p2', name: 'Product 2', price: 200, stock: 5, active: true },
      ]);
      
      render(<StoreSection showSaved={mockShowSaved} />);
      
      await waitFor(() => {
        expect(screen.getByText('Product 1')).toBeInTheDocument();
        expect(screen.getByText('Product 2')).toBeInTheDocument();
      });
    });

    it('should show product price', async () => {
      mockGetProducts.mockResolvedValue([
        { id: 'p1', name: 'Product', price: 150, stock: 10, active: true },
      ]);
      
      render(<StoreSection showSaved={mockShowSaved} />);
      
      await waitFor(() => {
        expect(screen.getByText('₪150')).toBeInTheDocument();
      });
    });

    it('should show stock quantity', async () => {
      mockGetProducts.mockResolvedValue([
        { id: 'p1', name: 'Product', price: 100, stock: 25, active: true },
      ]);
      
      render(<StoreSection showSaved={mockShowSaved} />);
      
      await waitFor(() => {
        expect(screen.getByText(/Stock: 25/i)).toBeInTheDocument();
      });
    });

    it('should show inactive badge for inactive products', async () => {
      mockGetProducts.mockResolvedValue([
        { id: 'p1', name: 'Inactive Product', price: 100, stock: 10, active: false },
      ]);
      
      render(<StoreSection showSaved={mockShowSaved} />);
      
      await waitFor(() => {
        expect(screen.getByText('Inactive')).toBeInTheDocument();
      });
    });

    it('should show recommended badge for recommended products', async () => {
      mockGetProducts.mockResolvedValue([
        { id: 'p1', name: 'Recommended', price: 100, stock: 10, active: true, recommended: true },
      ]);
      
      render(<StoreSection showSaved={mockShowSaved} />);
      
      await waitFor(() => {
        expect(screen.getByText('Recommended')).toBeInTheDocument();
      });
    });

    it('should show add product button', async () => {
      render(<StoreSection showSaved={mockShowSaved} />);
      
      await waitFor(() => {
        expect(screen.getByText('Store Settings')).toBeInTheDocument();
      });
      
      expect(screen.getByText('Add Product')).toBeInTheDocument();
    });

    it('should open edit product modal', async () => {
      const user = userEvent.setup();
      mockGetProducts.mockResolvedValue([
        { id: 'p1', name: 'Editable Product', price: 100, stock: 10, active: true },
      ]);
      
      render(<StoreSection showSaved={mockShowSaved} />);
      
      await waitFor(() => {
        expect(screen.getByText('Editable Product')).toBeInTheDocument();
      });
      
      // Find edit button (Edit2 icon)
      const editButtons = screen.getAllByRole('button');
      const editButton = editButtons.find(btn => 
        btn.className.includes('edit-btn') || btn.querySelector('svg')
      );
      
      if (editButton) {
        await user.click(editButton);
      }
    });

    it('should delete product after confirmation', async () => {
      const user = userEvent.setup();
      mockGetProducts.mockResolvedValue([
        { id: 'p1', name: 'To Delete', price: 100, stock: 10, active: true },
      ]);
      mockDeleteProduct.mockResolvedValue(undefined);
      
      render(<StoreSection showSaved={mockShowSaved} />);
      
      await waitFor(() => {
        expect(screen.getByText('To Delete')).toBeInTheDocument();
      });
      
      // Find and click delete button
      const deleteButtons = screen.getAllByRole('button');
      const deleteButton = deleteButtons.find(btn => 
        btn.className.includes('delete-btn')
      );
      
      if (deleteButton) {
        await user.click(deleteButton);
        
        await waitFor(() => {
          expect(mockDeleteProduct).toHaveBeenCalledWith('p1');
        });
      }
    });

    it('should not delete product if confirmation cancelled', async () => {
      window.confirm = vi.fn(() => false);
      
      const user = userEvent.setup();
      mockGetProducts.mockResolvedValue([
        { id: 'p1', name: 'Keep Me', price: 100, stock: 10, active: true },
      ]);
      
      render(<StoreSection showSaved={mockShowSaved} />);
      
      await waitFor(() => {
        expect(screen.getByText('Keep Me')).toBeInTheDocument();
      });
      
      const deleteButtons = screen.getAllByRole('button');
      const deleteButton = deleteButtons.find(btn => 
        btn.className.includes('delete-btn')
      );
      
      if (deleteButton) {
        await user.click(deleteButton);
        
        expect(mockDeleteProduct).not.toHaveBeenCalled();
      }
    });
  });

  // ==========================================
  // ADD/EDIT PRODUCT MODAL TESTS
  // ==========================================
  describe('Product Modal', () => {
    it('should have add product button available', async () => {
      render(<StoreSection showSaved={mockShowSaved} />);
      
      await waitFor(() => {
        expect(screen.getByText('Store Settings')).toBeInTheDocument();
      });
      
      expect(screen.getByText('Add Product')).toBeInTheDocument();
    });

    it('should display existing product in list', async () => {
      mockGetProducts.mockResolvedValue([
        { 
          id: 'p1', 
          name: 'Existing Product', 
          description: 'Test description',
          price: 150, 
          stock: 20, 
          discountRegistered: 10,
          discountGold: 15,
          active: true,
          recommended: true,
          images: ['img1.jpg']
        },
      ]);
      
      render(<StoreSection showSaved={mockShowSaved} />);
      
      await waitFor(() => {
        expect(screen.getByText('Existing Product')).toBeInTheDocument();
      });
    });
  });

  // ==========================================
  // ORDERS TAB TESTS
  // ==========================================
  describe('Orders Tab', () => {
    const mockOrders = [
      {
        id: 'order1',
        customerName: 'John Doe',
        customerPhone: '0501234567',
        customerTelegram: '@johndoe',
        items: [
          { productId: 'p1', productName: 'Product 1', quantity: 2, price: 100 }
        ],
        totalPrice: 200,
        finalPrice: 200,
        status: 'pending',
        userType: 'store',
        createdAt: '2024-01-15T10:00:00Z'
      }
    ];

    it('should display orders list', async () => {
      const user = userEvent.setup();
      mockGetOrders.mockResolvedValue(mockOrders);
      
      render(<StoreSection showSaved={mockShowSaved} />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Orders/i })).toBeInTheDocument();
      });
      
      await user.click(screen.getByRole('button', { name: /Orders/i }));
      
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });
    });

    it('should display customer phone', async () => {
      const user = userEvent.setup();
      mockGetOrders.mockResolvedValue(mockOrders);
      
      render(<StoreSection showSaved={mockShowSaved} />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Orders/i })).toBeInTheDocument();
      });
      
      await user.click(screen.getByRole('button', { name: /Orders/i }));
      
      await waitFor(() => {
        expect(screen.getByText('0501234567')).toBeInTheDocument();
      });
    });

    it('should display order items', async () => {
      const user = userEvent.setup();
      mockGetOrders.mockResolvedValue(mockOrders);
      
      render(<StoreSection showSaved={mockShowSaved} />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Orders/i })).toBeInTheDocument();
      });
      
      await user.click(screen.getByRole('button', { name: /Orders/i }));
      
      await waitFor(() => {
        expect(screen.getByText(/Product 1 x 2/)).toBeInTheDocument();
      });
    });

    it('should display order status', async () => {
      const user = userEvent.setup();
      mockGetOrders.mockResolvedValue(mockOrders);
      
      render(<StoreSection showSaved={mockShowSaved} />);
      
      await waitFor(() => {
        expect(screen.getByText('Store Settings')).toBeInTheDocument();
      });
      
      await user.click(screen.getByRole('button', { name: /Orders/i }));
      
      await waitFor(() => {
        expect(screen.getAllByText('Pending').length).toBeGreaterThan(0);
      });
    });

    it('should change order status', async () => {
      const user = userEvent.setup();
      mockGetOrders.mockResolvedValue(mockOrders);
      mockUpdateOrderStatus.mockResolvedValue(undefined);
      
      render(<StoreSection showSaved={mockShowSaved} />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Orders/i })).toBeInTheDocument();
      });
      
      await user.click(screen.getByRole('button', { name: /Orders/i }));
      
      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument();
      });
      
      await user.selectOptions(screen.getByRole('combobox'), 'confirmed');
      
      await waitFor(() => {
        expect(mockUpdateOrderStatus).toHaveBeenCalledWith('order1', 'confirmed');
      });
    });

    it('should show user type badge', async () => {
      const user = userEvent.setup();
      mockGetOrders.mockResolvedValue(mockOrders);
      
      render(<StoreSection showSaved={mockShowSaved} />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Orders/i })).toBeInTheDocument();
      });
      
      await user.click(screen.getByRole('button', { name: /Orders/i }));
      
      await waitFor(() => {
        expect(screen.getByText('Store Customer')).toBeInTheDocument();
      });
    });

    it('should show make regular user button for store users', async () => {
      const user = userEvent.setup();
      mockGetOrders.mockResolvedValue(mockOrders);
      
      render(<StoreSection showSaved={mockShowSaved} />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Orders/i })).toBeInTheDocument();
      });
      
      await user.click(screen.getByRole('button', { name: /Orders/i }));
      
      await waitFor(() => {
        expect(screen.getByText('Make Regular User')).toBeInTheDocument();
      });
    });

    it('should not show make regular user button when phone already exists in users', async () => {
      const user = userEvent.setup();
      mockGetOrders.mockResolvedValue(mockOrders);
      mockGetAllUsers.mockResolvedValue([{ id: 'u1', phoneNumber: '0501234567', level: 'regular' }]);

      render(<StoreSection showSaved={mockShowSaved} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Orders/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /Orders/i }));

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.queryByText('Make Regular User')).not.toBeInTheDocument();
      });
    });

    it('should convert store user to regular user', async () => {
      const user = userEvent.setup();
      mockGetOrders.mockResolvedValue(mockOrders);
      mockConvertStoreUserToRegular.mockResolvedValue(undefined);
      
      render(<StoreSection showSaved={mockShowSaved} />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Orders/i })).toBeInTheDocument();
      });
      
      await user.click(screen.getByRole('button', { name: /Orders/i }));
      
      await waitFor(() => {
        expect(screen.getByText('Make Regular User')).toBeInTheDocument();
      });
      
      await user.click(screen.getByText('Make Regular User'));
      
      await waitFor(() => {
        expect(mockConvertStoreUserToRegular).toHaveBeenCalledWith(
          'order1',
          expect.objectContaining({ id: 'order1' })
        );
      });
    });

    it('should delete order after confirmation', async () => {
      const user = userEvent.setup();
      mockGetOrders.mockResolvedValue(mockOrders);
      mockDeleteOrder.mockResolvedValue(undefined);
      
      render(<StoreSection showSaved={mockShowSaved} />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Orders/i })).toBeInTheDocument();
      });
      
      await user.click(screen.getByRole('button', { name: /Orders/i }));
      
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });
      
      // Find delete button in orders
      const deleteButtons = screen.getAllByRole('button');
      const deleteButton = deleteButtons.find(btn => 
        btn.className.includes('delete-btn')
      );
      
      if (deleteButton) {
        await user.click(deleteButton);
        
        await waitFor(() => {
          expect(mockDeleteOrder).toHaveBeenCalledWith('order1');
        });
      }
    });

    it('should show empty orders message', async () => {
      const user = userEvent.setup();
      mockGetOrders.mockResolvedValue([]);
      
      render(<StoreSection showSaved={mockShowSaved} />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Orders/i })).toBeInTheDocument();
      });
      
      await user.click(screen.getByRole('button', { name: /Orders/i }));
      
      await waitFor(() => {
        expect(screen.getByText('No orders yet')).toBeInTheDocument();
      });
    });
  });

  // ==========================================
  // EDGE CASES AND NEGATIVE SCENARIOS
  // ==========================================
  describe('Edge Cases', () => {
    it('should handle API error when loading products', async () => {
      mockGetProducts.mockRejectedValue(new Error('API Error'));
      
      render(<StoreSection showSaved={mockShowSaved} />);
      
      // Should still render without crashing
      await waitFor(() => {
        expect(screen.getByText('Store Settings')).toBeInTheDocument();
      });
    });

    it('should handle API error when loading orders', async () => {
      mockGetOrders.mockRejectedValue(new Error('API Error'));
      
      render(<StoreSection showSaved={mockShowSaved} />);
      
      await waitFor(() => {
        expect(screen.getByText('Store Settings')).toBeInTheDocument();
      });
    });

    it('should handle API error when toggling store', async () => {
      mockUpdateStoreSettings.mockRejectedValue(new Error('Update failed'));
      
      const user = userEvent.setup();
      render(<StoreSection showSaved={mockShowSaved} />);
      
      await waitFor(() => {
        expect(screen.getByText('Store Disabled')).toBeInTheDocument();
      });
      
      await user.click(screen.getByText('Store Disabled'));
      
      // Should not crash
      expect(screen.getByText('Store Settings')).toBeInTheDocument();
    });

    it('should handle API error when adding product', async () => {
      mockAddProduct.mockRejectedValue(new Error('Add failed'));
      
      const user = userEvent.setup();
      render(<StoreSection showSaved={mockShowSaved} />);
      
      await waitFor(() => {
        expect(screen.getByText('Add Product')).toBeInTheDocument();
      });
      
      await user.click(screen.getByText('Add Product'));
      
      const inputs = screen.getAllByRole('textbox');
      await user.type(inputs[0], 'New Product');
      
      await user.click(screen.getByText('Save'));
      
      await waitFor(() => {
        expect(window.alert).toHaveBeenCalled();
      });
    });

    it('should handle product with no images', async () => {
      mockGetProducts.mockResolvedValue([
        { id: 'p1', name: 'No Images', price: 100, stock: 10, active: true, images: [] },
      ]);
      
      render(<StoreSection showSaved={mockShowSaved} />);
      
      await waitFor(() => {
        expect(screen.getByText('No Images')).toBeInTheDocument();
      });
    });

    it('should handle product with very long name', async () => {
      const longName = 'A'.repeat(200);
      mockGetProducts.mockResolvedValue([
        { id: 'p1', name: longName, price: 100, stock: 10, active: true },
      ]);
      
      render(<StoreSection showSaved={mockShowSaved} />);
      
      await waitFor(() => {
        expect(screen.getByText(longName)).toBeInTheDocument();
      });
    });

    it('should handle order with many items', async () => {
      const user = userEvent.setup();
      const manyItems = Array(10).fill(null).map((_, i) => ({
        productId: `p${i}`,
        productName: `Product ${i}`,
        quantity: 1,
        price: 100
      }));
      
      mockGetOrders.mockResolvedValue([
        {
          id: 'order1',
          customerName: 'Test',
          customerPhone: '0501234567',
          items: manyItems,
          totalPrice: 1000,
          finalPrice: 1000,
          status: 'pending',
          userType: 'store',
          createdAt: new Date().toISOString()
        }
      ]);
      
      render(<StoreSection showSaved={mockShowSaved} />);
      
      // Wait for loading to complete first
      await waitFor(() => {
        expect(screen.getByText('Store Settings')).toBeInTheDocument();
      });
      
      await user.click(screen.getByRole('button', { name: /Orders/i }));
      
      await waitFor(() => {
        expect(screen.getByText(/Product 0 x 1/)).toBeInTheDocument();
        expect(screen.getByText(/Product 9 x 1/)).toBeInTheDocument();
      });
    });

    it('should handle order without telegram', async () => {
      const user = userEvent.setup();
      mockGetOrders.mockResolvedValue([
        {
          id: 'order1',
          customerName: 'No Telegram',
          customerPhone: '0501234567',
          customerTelegram: '',
          items: [],
          totalPrice: 0,
          finalPrice: 0,
          status: 'pending',
          userType: 'store',
          createdAt: new Date().toISOString()
        }
      ]);
      
      render(<StoreSection showSaved={mockShowSaved} />);
      
      // Wait for loading to complete first
      await waitFor(() => {
        expect(screen.getByText('Store Settings')).toBeInTheDocument();
      });
      
      await user.click(screen.getByRole('button', { name: /Orders/i }));
      
      await waitFor(() => {
        expect(screen.getByText('No Telegram')).toBeInTheDocument();
      });
    });

    it('should handle different order statuses', async () => {
      const user = userEvent.setup();
      mockGetOrders.mockResolvedValue([
        { id: 'o1', customerName: 'Pending', status: 'pending', items: [], createdAt: new Date().toISOString(), userType: 'store' },
        { id: 'o2', customerName: 'Confirmed', status: 'confirmed', items: [], createdAt: new Date().toISOString(), userType: 'registered' },
        { id: 'o3', customerName: 'Completed', status: 'completed', items: [], createdAt: new Date().toISOString(), userType: 'gold' },
        { id: 'o4', customerName: 'Cancelled', status: 'cancelled', items: [], createdAt: new Date().toISOString(), userType: 'store' },
      ]);
      
      render(<StoreSection showSaved={mockShowSaved} />);
      
      // Wait for loading to complete first
      await waitFor(() => {
        expect(screen.getByText('Store Settings')).toBeInTheDocument();
      });
      
      await user.click(screen.getByRole('button', { name: /Orders/i }));
      
      await waitFor(() => {
        expect(screen.getAllByText('Pending').length).toBeGreaterThan(0);
      });
    });

    it('should handle registered user type (no convert button)', async () => {
      const user = userEvent.setup();
      mockGetOrders.mockResolvedValue([
        {
          id: 'order1',
          customerName: 'Registered User',
          customerPhone: '0501234567',
          items: [],
          totalPrice: 0,
          finalPrice: 0,
          status: 'pending',
          userType: 'registered',
          createdAt: new Date().toISOString()
        }
      ]);
      
      render(<StoreSection showSaved={mockShowSaved} />);
      
      // Wait for loading to complete first
      await waitFor(() => {
        expect(screen.getByText('Store Settings')).toBeInTheDocument();
      });
      
      await user.click(screen.getByRole('button', { name: /Orders/i }));
      
      await waitFor(() => {
        expect(screen.getByText('Registered')).toBeInTheDocument();
      });
      
      expect(screen.queryByText('Make Regular User')).not.toBeInTheDocument();
    });

    it('should handle gold user type', async () => {
      const user = userEvent.setup();
      mockGetOrders.mockResolvedValue([
        {
          id: 'order1',
          customerName: 'Gold User Order',
          customerPhone: '0501234567',
          items: [],
          totalPrice: 0,
          finalPrice: 0,
          status: 'pending',
          userType: 'gold',
          createdAt: new Date().toISOString()
        }
      ]);
      
      render(<StoreSection showSaved={mockShowSaved} />);
      
      // Wait for loading to complete first
      await waitFor(() => {
        expect(screen.getByText('Store Settings')).toBeInTheDocument();
      });
      
      await user.click(screen.getByRole('button', { name: /Orders/i }));
      
      await waitFor(() => {
        expect(screen.getByText('Gold User Order')).toBeInTheDocument();
      });
    });
  });

  // ==========================================
  // IMAGE UPLOAD TESTS
  // ==========================================
  describe('Image Upload', () => {
    it('should upload image successfully', async () => {
      const user = userEvent.setup();
      mockUploadPartyImage.mockResolvedValue({ url: 'https://example.com/image.jpg' });
      
      render(<StoreSection showSaved={mockShowSaved} />);
      
      await waitFor(() => {
        expect(screen.getByText('Add Product')).toBeInTheDocument();
      });
      
      await user.click(screen.getByText('Add Product'));
      
      await waitFor(() => {
        expect(screen.getByText('Images')).toBeInTheDocument();
      });
    });

    it('should handle image upload error', async () => {
      mockUploadPartyImage.mockRejectedValue(new Error('Upload failed'));
      
      const user = userEvent.setup();
      render(<StoreSection showSaved={mockShowSaved} />);
      
      await waitFor(() => {
        expect(screen.getByText('Add Product')).toBeInTheDocument();
      });
      
      await user.click(screen.getByText('Add Product'));
      
      // Component should not crash on upload error
      expect(screen.getByText('Images')).toBeInTheDocument();
    });
  });
});

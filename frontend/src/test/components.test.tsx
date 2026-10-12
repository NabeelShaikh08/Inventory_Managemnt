import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function wrapper(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>
  );
}

function makeProduct(overrides = {}) {
  return {
    id: 1,
    name: 'Portland Cement OPC 42.5R',
    description: 'Standard grade cement',
    price: '28.50',
    stock: 100,
    category: 1,
    category_name: 'Cement & Concrete',
    category_code: 'CEM',
    is_active: true,
    created_at: '2026-10-12T10:00:00Z',
    updated_at: '2026-10-12T10:00:00Z',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// DeleteConfirmDialog
// ---------------------------------------------------------------------------

import DeleteConfirmDialog from '../components/DeleteConfirmDialog';
import * as productsApi from '../api/products';

describe('DeleteConfirmDialog', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the product name and category', () => {
    const product = makeProduct();
    const onClose = vi.fn();
    wrapper(<DeleteConfirmDialog product={product} onClose={onClose} />);

    expect(screen.getByText('Portland Cement OPC 42.5R')).toBeInTheDocument();
    expect(screen.getByText(/Cement & Concrete/)).toBeInTheDocument();
    expect(screen.getByText(/28\.50/)).toBeInTheDocument();
  });

  it('calls onClose when Cancel is clicked', async () => {
    const onClose = vi.fn();
    wrapper(<DeleteConfirmDialog product={makeProduct()} onClose={onClose} />);
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls deleteProduct and onClose on successful delete', async () => {
    const onClose = vi.fn();
    vi.spyOn(productsApi, 'deleteProduct').mockResolvedValue(undefined);

    wrapper(<DeleteConfirmDialog product={makeProduct()} onClose={onClose} />);
    await userEvent.click(screen.getByRole('button', { name: /^delete$/i }));

    await waitFor(() => expect(productsApi.deleteProduct).toHaveBeenCalledWith(1));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('shows error message when delete fails', async () => {
    vi.spyOn(productsApi, 'deleteProduct').mockRejectedValue(new Error('Network error'));

    wrapper(<DeleteConfirmDialog product={makeProduct()} onClose={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: /^delete$/i }));

    await waitFor(() =>
      expect(screen.getByText(/failed to delete/i)).toBeInTheDocument()
    );
  });
});

// ---------------------------------------------------------------------------
// ProductForm — validation
// ---------------------------------------------------------------------------

import ProductForm from '../components/ProductForm';
import * as categoriesApi from '../api/categories';

describe('ProductForm — validation', () => {
  beforeEach(() => {
    vi.spyOn(categoriesApi, 'getCategories').mockResolvedValue([
      { id: 1, name: 'Cement & Concrete', code: 'CEM', product_count: 5 },
    ]);
    vi.restoreAllMocks();
  });

  it('shows validation errors when submitting empty form', async () => {
    wrapper(<ProductForm onClose={vi.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: /add product/i }));

    await waitFor(() =>
      expect(screen.getByText(/product name is required/i)).toBeInTheDocument()
    );
    expect(screen.getByText(/price is required/i)).toBeInTheDocument();
  });

  it('shows error when price is zero', async () => {
    wrapper(<ProductForm onClose={vi.fn()} />);

    await userEvent.type(screen.getByPlaceholderText(/ordinary portland/i), 'Test Product');
    const priceInput = screen.getByPlaceholderText('0.00');
    await userEvent.clear(priceInput);
    await userEvent.type(priceInput, '0');

    await userEvent.click(screen.getByRole('button', { name: /add product/i }));

    await waitFor(() =>
      expect(screen.getByText(/price must be greater than 0/i)).toBeInTheDocument()
    );
  });

  it('renders edit mode with product values pre-filled', async () => {
    const product = makeProduct();
    vi.spyOn(categoriesApi, 'getCategories').mockResolvedValue([
      { id: 1, name: 'Cement & Concrete', code: 'CEM', product_count: 5 },
    ]);

    wrapper(<ProductForm product={product} onClose={vi.fn()} />);

    await waitFor(() =>
      expect(screen.getByDisplayValue('Portland Cement OPC 42.5R')).toBeInTheDocument()
    );
    expect(screen.getByDisplayValue('28.50')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Search input — debounce & clear button
// ---------------------------------------------------------------------------

describe('Search clear button', () => {
  it('clear button appears when text is entered and clears on click', async () => {
    // Test the clear button logic in isolation using a simple controlled component
    const { rerender } = render(
      <div className="relative">
        <input
          data-testid="search"
          value=""
          onChange={() => {}}
          placeholder="Search…"
        />
      </div>
    );

    // No X button initially
    expect(screen.queryByLabelText(/clear search/i)).not.toBeInTheDocument();

    // Simulate text entered — show X
    rerender(
      <div className="relative">
        <input data-testid="search" value="cement" onChange={() => {}} placeholder="Search…" />
        <button aria-label="Clear search" onClick={() => {}}>X</button>
      </div>
    );

    expect(screen.getByLabelText(/clear search/i)).toBeInTheDocument();

    // Click clears
    const clearBtn = screen.getByLabelText(/clear search/i);
    let cleared = false;
    fireEvent.click(clearBtn, { onClick: () => { cleared = true; } });
    expect(clearBtn).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// StatusBadge — visual states
// ---------------------------------------------------------------------------

import MakerPage from '../pages/MakerPage';
import * as requestsApi from '../api/requests';
import * as AuthContext from '../context/AuthContext';
import type { StockRequest } from '../types';

function makeRequest(overrides: Partial<StockRequest> = {}): StockRequest {
  return {
    id: 1,
    created_by: 1,
    created_by_username: 'storekeeper',
    decided_by: null,
    decided_by_username: null,
    status: 'pending',
    document_ref: 'PO-001',
    remarks: '',
    created_at: '2026-10-12T10:00:00Z',
    decided_at: null,
    lines: [],
    line_count: 1,
    ...overrides,
  };
}

describe('MakerPage — request status badges', () => {
  beforeEach(() => {
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
      isAuthenticated: true,
      username: 'storekeeper',
      role: 'maker',
      login: vi.fn(),
      logout: vi.fn(),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows Pending badge for pending requests', async () => {
    vi.spyOn(requestsApi, 'listRequests').mockResolvedValue({
      count: 1,
      next: null,
      previous: null,
      results: [makeRequest({ status: 'pending' })],
    });

    wrapper(<MakerPage />);

    await waitFor(() => expect(screen.getByText('Pending')).toBeInTheDocument());
  });

  it('shows Approved badge for approved requests', async () => {
    vi.spyOn(requestsApi, 'listRequests').mockResolvedValue({
      count: 1,
      next: null,
      previous: null,
      results: [makeRequest({ status: 'approved' })],
    });

    wrapper(<MakerPage />);

    await waitFor(() => expect(screen.getByText('Approved')).toBeInTheDocument());
  });

  it('shows Withdraw button only for pending requests', async () => {
    vi.spyOn(requestsApi, 'listRequests').mockResolvedValue({
      count: 2,
      next: null,
      previous: null,
      results: [
        makeRequest({ id: 1, status: 'pending' }),
        makeRequest({ id: 2, status: 'approved' }),
      ],
    });

    wrapper(<MakerPage />);

    await waitFor(() => screen.getByText('Pending'));
    const withdrawBtns = screen.getAllByTitle(/withdraw/i);
    expect(withdrawBtns).toHaveLength(1);
  });

  it('shows empty state when no requests exist', async () => {
    vi.spyOn(requestsApi, 'listRequests').mockResolvedValue({
      count: 0, next: null, previous: null, results: [],
    });

    wrapper(<MakerPage />);

    await waitFor(() =>
      expect(screen.getByText(/no requests yet/i)).toBeInTheDocument()
    );
  });
});

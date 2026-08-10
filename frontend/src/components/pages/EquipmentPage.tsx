/**
 * FORMAL ARCHITECTURAL DESCRIPTION:
 * Equipment Catalog page component. Presents a faceted storefront (category, price range and
 * availability filters, keyword search, sort ordering, offset pagination) backed by
 * `GET /api/v1/products`. Renders a detail dialog with specifications and a booking dialog that
 * computes rental duration, line total and refundable deposit before POSTing a reservation.
 * ADMIN and STAFF additionally receive create / edit / delete affordances.
 *
 * IN SIMPLE WORDS:
 * The equipment shop page. Customers browse and filter gear, open an item to see its photo,
 * specs and prices, then pick dates to book it. Managers can also add, edit or remove equipment.
 */

import React, { useCallback, useEffect, useState } from 'react';
import './EquipmentPage.css';
import { EmptyState, Pagination, SearchInput, Toasts } from '../ui';
import type { Role } from '../../types/auth';
import {
  productsApi,
  categoriesApi,
  reservationsApi,
  type Category,
  type Product,
  type ProductQuery,
} from '../../services/api';

interface EquipmentPageProps {
  currentRole: Role;
}

const PAGE_SIZE = 9;

const SORT_OPTIONS: { value: NonNullable<ProductQuery['sort']>; label: string }[] = [
  { value: 'newest', label: 'Newest first' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'name_asc', label: 'Name: A to Z' },
];

const money = (v: string | number) => Number(v).toLocaleString('en-US', { minimumFractionDigits: 2 });
const todayISO = () => new Date().toISOString().slice(0, 10);
const plusDaysISO = (days: number) =>
  new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);

/**
 * Equipment photo with a graceful fallback. Images live in backend/public/equipment/<sku>.jpg
 * and are served at /equipment/<sku>.jpg (Vite proxies the path in dev, nginx in prod);
 * until a file is supplied the tile shows a labelled placeholder rather than a broken image.
 */
const EquipmentImage: React.FC<{ product: Product; className?: string }> = ({
  product,
  className = 'equipment-card-img',
}) => {
  const [failed, setFailed] = useState(false);

  if (!product.imageUrl || failed) {
    return (
      <div className={`${className} equipment-img-fallback`} aria-label={product.name}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <path d="M21 15l-5-5L5 21" />
        </svg>
        <span className="equipment-img-fallback-sku">{product.sku}</span>
      </div>
    );
  }

  return (
    <img
      src={product.imageUrl}
      alt={product.name}
      className={className}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
};

export const EquipmentPage: React.FC<EquipmentPageProps> = ({ currentRole }) => {
  const canManage = currentRole === 'ADMIN' || currentRole === 'STAFF';

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [total, setTotal] = useState(0);
  // Unfiltered catalog size, so the "All categories" facet keeps showing the full
  // count instead of collapsing to the current filtered result.
  const [catalogTotal, setCatalogTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [availableOnly, setAvailableOnly] = useState(false);
  const [sort, setSort] = useState<NonNullable<ProductQuery['sort']>>('newest');

  // Dialog state
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);
  const [bookingProduct, setBookingProduct] = useState<Product | null>(null);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const flash = (text: string) => {
    setMsg(text);
    setTimeout(() => setMsg(null), 4000);
  };

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await productsApi.list({
        search: search || undefined,
        categoryId: categoryId || undefined,
        minPrice: minPrice ? Number(minPrice) : undefined,
        maxPrice: maxPrice ? Number(maxPrice) : undefined,
        availableOnly: availableOnly || undefined,
        sort,
        page,
        limit: PAGE_SIZE,
      });
      setProducts(data.products);
      setTotal(data.total);
      setTotalPages(data.totalPages);

      // With no filters applied the response total *is* the whole catalog, so record
      // it for the "All categories" facet without issuing a second request.
      const filtered =
        !!search || !!categoryId || !!minPrice || !!maxPrice || availableOnly;
      if (!filtered) setCatalogTotal(data.total);
    } catch (err: any) {
      setError(err.message || 'Could not load equipment.');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [search, categoryId, minPrice, maxPrice, availableOnly, sort, page]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    categoriesApi.getAll().then(setCategories).catch(() => setCategories([]));
  }, []);

  // Debounce the search box so typing doesn't fire a request per keystroke.
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  /** Any filter change must reset to page 1, or you can land on an empty page. */
  const applyFilter = (fn: () => void) => {
    fn();
    setPage(1);
  };

  const clearFilters = () => {
    setSearchInput('');
    setSearch('');
    setCategoryId('');
    setMinPrice('');
    setMaxPrice('');
    setAvailableOnly(false);
    setSort('newest');
    setPage(1);
  };

  const handleDelete = async (product: Product) => {
    if (!window.confirm(`Delete "${product.name}"? This cannot be undone.`)) return;
    try {
      await productsApi.delete(product.id);
      flash(`Deleted "${product.name}".`);
      fetchProducts();
    } catch (err: any) {
      setError(err.message || 'Delete failed.');
    }
  };

  const hasActiveFilters =
    !!search || !!categoryId || !!minPrice || !!maxPrice || availableOnly || sort !== 'newest';

  return (
    <div className="equipment-page animate-fade-in">
      <Toasts message={msg} error={error} />

      {/* Toolbar */}
      <div className="equipment-toolbar">
        <SearchInput
          className="equipment-search"
          value={searchInput}
          onChange={setSearchInput}
          placeholder="Search equipment by name, SKU or description…"
          clearable
        />

        <select
          className="equipment-select"
          value={sort}
          onChange={(e) => applyFilter(() => setSort(e.target.value as NonNullable<ProductQuery['sort']>))}
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        {canManage && (
          <button className="btn-primary-glass" onClick={() => setIsCreateOpen(true)}>
            + Add Equipment
          </button>
        )}
      </div>

      <div className="equipment-layout">
        {/* Filter sidebar */}
        <aside className="equipment-filters glass-panel">
          <div className="filter-block">
            <div className="filter-heading">
              <span>Category</span>
              {hasActiveFilters && (
                <button className="btn-link" onClick={clearFilters}>
                  Clear all
                </button>
              )}
            </div>
            <ul className="filter-list">
              <li>
                <button
                  className={`filter-option ${categoryId === '' ? 'selected' : ''}`}
                  onClick={() => applyFilter(() => setCategoryId(''))}
                >
                  <span>All categories</span>
                  <span className="filter-count">{catalogTotal}</span>
                </button>
              </li>
              {categories.map((c) => (
                <li key={c.id}>
                  <button
                    className={`filter-option ${categoryId === c.id ? 'selected' : ''}`}
                    onClick={() => applyFilter(() => setCategoryId(c.id))}
                  >
                    <span>{c.name}</span>
                    <span className="filter-count">{c.productCount}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="filter-block">
            <div className="filter-heading">
              <span>Daily rate (USD)</span>
            </div>
            <div className="filter-price-row">
              <input
                type="number"
                min="0"
                className="filter-price-input"
                placeholder="Min"
                value={minPrice}
                onChange={(e) => applyFilter(() => setMinPrice(e.target.value))}
              />
              <span className="filter-price-dash">–</span>
              <input
                type="number"
                min="0"
                className="filter-price-input"
                placeholder="Max"
                value={maxPrice}
                onChange={(e) => applyFilter(() => setMaxPrice(e.target.value))}
              />
            </div>
          </div>

          <div className="filter-block">
            <label className="filter-checkbox">
              <input
                type="checkbox"
                checked={availableOnly}
                onChange={(e) => applyFilter(() => setAvailableOnly(e.target.checked))}
              />
              <span>In stock only</span>
            </label>
          </div>
        </aside>

        {/* Results */}
        <section className="equipment-results">
          <div className="results-meta">
            {loading ? 'Loading equipment…' : `${total} item${total === 1 ? '' : 's'} found`}
          </div>

          {!loading && products.length === 0 ? (
            <EmptyState panel>
              No equipment matches these filters.
              {hasActiveFilters && (
                <>
                  {' '}
                  <button className="btn-link" onClick={clearFilters}>
                    Clear filters
                  </button>
                </>
              )}
            </EmptyState>
          ) : (
            <div className="equipment-grid">
              {products.map((p) => {
                const inStock = p.totalStock > 0;
                return (
                  <article className="equipment-card glass-panel" key={p.id}>
                    <div className="equipment-card-media" onClick={() => setDetailProduct(p)}>
                      <EquipmentImage product={p} />
                      <span className={`stock-chip ${inStock ? 'in' : 'out'}`}>
                        {inStock ? `${p.totalStock} in stock` : 'Out of stock'}
                      </span>
                    </div>

                    <div className="equipment-card-body">
                      {p.category && <span className="equipment-card-cat">{p.category.name}</span>}
                      <h3 className="equipment-card-title" title={p.name}>
                        {p.name}
                      </h3>
                      <div className="equipment-card-price">
                        <span className="price-main">${money(p.pricePerDay)}</span>
                        <span className="price-unit">/ day</span>
                      </div>
                      <div className="equipment-card-deposit">
                        Deposit ${money(p.deposit)}
                      </div>
                    </div>

                    <div className="equipment-card-actions">
                      <button className="btn-small-glass" onClick={() => setDetailProduct(p)}>
                        Details
                      </button>
                      {currentRole === 'CUSTOMER' ? (
                        <button
                          className="btn-primary-glass"
                          disabled={!inStock}
                          onClick={() => setBookingProduct(p)}
                        >
                          {inStock ? 'Book' : 'Unavailable'}
                        </button>
                      ) : canManage ? (
                        <>
                          <button className="btn-small-glass" onClick={() => setEditProduct(p)}>
                            Edit
                          </button>
                          {currentRole === 'ADMIN' && (
                            <button className="btn-table-reject" onClick={() => handleDelete(p)}>
                              Delete
                            </button>
                          )}
                        </>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        </section>
      </div>

      {detailProduct && (
        <ProductDetailModal
          product={detailProduct}
          canBook={currentRole === 'CUSTOMER'}
          onBook={() => {
            setBookingProduct(detailProduct);
            setDetailProduct(null);
          }}
          onClose={() => setDetailProduct(null)}
        />
      )}

      {bookingProduct && (
        <BookingModal
          product={bookingProduct}
          onClose={() => setBookingProduct(null)}
          onBooked={(text) => {
            setBookingProduct(null);
            flash(text);
          }}
          onError={setError}
        />
      )}

      {(isCreateOpen || editProduct) && (
        <EquipmentFormModal
          product={editProduct}
          categories={categories}
          onClose={() => {
            setIsCreateOpen(false);
            setEditProduct(null);
          }}
          onSaved={(text) => {
            setIsCreateOpen(false);
            setEditProduct(null);
            flash(text);
            fetchProducts();
          }}
          onError={setError}
        />
      )}
    </div>
  );
};

/* ── Detail dialog ──────────────────────────────────────────────────────── */

const ProductDetailModal: React.FC<{
  product: Product;
  canBook: boolean;
  onBook: () => void;
  onClose: () => void;
}> = ({ product, canBook, onBook, onClose }) => {
  const specs = product.specifications ?? {};
  const specEntries = Object.entries(specs);

  return (
    <div className="auth-overlay" onClick={onClose}>
      <div className="detail-modal liquid-glass-modal" onClick={(e) => e.stopPropagation()}>
        <button className="auth-close-btn" onClick={onClose} aria-label="Close">
          ✕
        </button>

        <div className="detail-media">
          <EquipmentImage product={product} className="detail-img" />
        </div>

        <div className="detail-body">
          {product.category && <span className="equipment-card-cat">{product.category.name}</span>}
          <h3 className="detail-title">{product.name}</h3>
          <p className="detail-sku">SKU {product.sku}</p>

          {product.description && <p className="detail-desc">{product.description}</p>}

          <div className="detail-price-row">
            <div>
              <span className="detail-price-label">Daily rate</span>
              <span className="detail-price-value">${money(product.pricePerDay)}</span>
            </div>
            <div>
              <span className="detail-price-label">Refundable deposit</span>
              <span className="detail-price-value">${money(product.deposit)}</span>
            </div>
            <div>
              <span className="detail-price-label">Availability</span>
              <span className={`detail-price-value ${product.totalStock > 0 ? 'ok' : 'bad'}`}>
                {product.totalStock > 0 ? `${product.totalStock} units` : 'Out of stock'}
              </span>
            </div>
          </div>

          {specEntries.length > 0 && (
            <div className="detail-specs">
              <h4 className="detail-specs-title">Specifications</h4>
              <dl className="spec-grid">
                {specEntries.map(([k, v]) => (
                  <div className="spec-row" key={k}>
                    <dt>{k}</dt>
                    <dd>{String(v)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          {canBook && (
            <button
              className="btn-auth-submit detail-book-btn"
              disabled={product.totalStock <= 0}
              onClick={onBook}
            >
              {product.totalStock > 0 ? 'Book this equipment' : 'Out of stock'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

/* ── Booking dialog ─────────────────────────────────────────────────────── */

const BookingModal: React.FC<{
  product: Product;
  onClose: () => void;
  onBooked: (msg: string) => void;
  onError: (msg: string) => void;
}> = ({ product, onClose, onBooked, onError }) => {
  const [startDate, setStartDate] = useState(todayISO());
  const [endDate, setEndDate] = useState(plusDaysISO(3));
  const [quantity, setQuantity] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Inclusive of the pickup day, so same-day return counts as one rental day.
  const days = Math.max(
    1,
    Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86_400_000) + 1,
  );
  const datesValid = new Date(endDate) >= new Date(startDate);
  const rentalTotal = Number(product.pricePerDay) * days * quantity;
  const depositTotal = Number(product.deposit) * quantity;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!datesValid) return;
    setSubmitting(true);
    try {
      await reservationsApi.create({
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        items: [{ productId: product.id, quantity }],
      });
      onBooked(`Reservation requested for ${product.name} — awaiting staff approval.`);
    } catch (err: any) {
      onError(err.message || 'Booking failed.');
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-overlay" onClick={onClose}>
      <div className="booking-modal liquid-glass-modal" onClick={(e) => e.stopPropagation()}>
        <button className="auth-close-btn" onClick={onClose} aria-label="Close">
          ✕
        </button>

        <h3 className="auth-title booking-title">Book Equipment</h3>
        <p className="booking-product">{product.name}</p>

        <form className="auth-form" onSubmit={submit}>
          <div className="booking-dates">
            <div className="auth-field">
              <label className="auth-label">Pickup date</label>
              <input
                type="date"
                className="auth-input booking-input"
                value={startDate}
                min={todayISO()}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>
            <div className="auth-field">
              <label className="auth-label">Return date</label>
              <input
                type="date"
                className="auth-input booking-input"
                value={endDate}
                min={startDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </div>
          </div>

          {!datesValid && <div className="auth-error">Return date must be on or after the pickup date.</div>}

          <div className="auth-field">
            <label className="auth-label">Quantity (max {product.totalStock})</label>
            <input
              type="number"
              className="auth-input booking-input"
              min={1}
              max={product.totalStock}
              value={quantity}
              onChange={(e) =>
                setQuantity(Math.min(product.totalStock, Math.max(1, Number(e.target.value) || 1)))
              }
              required
            />
          </div>

          <div className="booking-summary">
            <div className="booking-line">
              <span>
                ${money(product.pricePerDay)} × {days} day{days === 1 ? '' : 's'} × {quantity}
              </span>
              <span>${money(rentalTotal)}</span>
            </div>
            <div className="booking-line muted">
              <span>Refundable deposit</span>
              <span>${money(depositTotal)}</span>
            </div>
            <div className="booking-line total">
              <span>Due at pickup</span>
              <span>${money(rentalTotal + depositTotal)}</span>
            </div>
          </div>

          <button type="submit" className="btn-auth-submit" disabled={submitting || !datesValid}>
            {submitting ? 'Submitting…' : 'Confirm Reservation'}
          </button>
        </form>
      </div>
    </div>
  );
};

/* ── Create / edit dialog (ADMIN & STAFF) ───────────────────────────────── */

const EquipmentFormModal: React.FC<{
  product: Product | null;
  categories: Category[];
  onClose: () => void;
  onSaved: (msg: string) => void;
  onError: (msg: string) => void;
}> = ({ product, categories, onClose, onSaved, onError }) => {
  const isEdit = !!product;
  const [name, setName] = useState(product?.name ?? '');
  const [sku, setSku] = useState(product?.sku ?? '');
  const [description, setDescription] = useState(product?.description ?? '');
  const [pricePerDay, setPricePerDay] = useState(String(product?.pricePerDay ?? '50'));
  const [deposit, setDeposit] = useState(String(product?.deposit ?? '100'));
  const [totalStock, setTotalStock] = useState(String(product?.totalStock ?? '5'));
  const [categoryId, setCategoryId] = useState(product?.categoryId ?? '');
  const [imageUrl, setImageUrl] = useState(product?.imageUrl ?? '');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        name,
        description: description || undefined,
        pricePerDay: Number(pricePerDay),
        deposit: Number(deposit),
        categoryId: categoryId || undefined,
        imageUrl: imageUrl || undefined,
      };

      if (isEdit) {
        // Stock is owned by the warehouse inventory log flow, so it is not editable here.
        await productsApi.update(product!.id, payload);
        onSaved(`Updated "${name}".`);
      } else {
        await productsApi.create({ ...payload, sku, totalStock: Number(totalStock) });
        onSaved(`Added "${name}" to the catalog.`);
      }
    } catch (err: any) {
      onError(err.message || 'Save failed.');
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-overlay" onClick={onClose}>
      <div className="form-modal liquid-glass-modal" onClick={(e) => e.stopPropagation()}>
        <button className="auth-close-btn" onClick={onClose} aria-label="Close">
          ✕
        </button>

        <h3 className="auth-title booking-title">{isEdit ? 'Edit Equipment' : 'Add Equipment'}</h3>

        <form className="auth-form" onSubmit={submit}>
          <div className="auth-field">
            <label className="auth-label">Name</label>
            <input className="auth-input booking-input" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>

          {!isEdit && (
            <div className="auth-field">
              <label className="auth-label">SKU</label>
              <input
                className="auth-input booking-input"
                value={sku}
                onChange={(e) => setSku(e.target.value.toUpperCase())}
                placeholder="TL-DRILL-020"
                required
              />
            </div>
          )}

          <div className="auth-field">
            <label className="auth-label">Category</label>
            <select
              className="auth-input booking-input"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              <option value="">Uncategorised</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="auth-field">
            <label className="auth-label">Description</label>
            <textarea
              className="auth-input booking-input booking-textarea"
              value={description ?? ''}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="booking-dates">
            <div className="auth-field">
              <label className="auth-label">Daily rate ($)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="auth-input booking-input"
                value={pricePerDay}
                onChange={(e) => setPricePerDay(e.target.value)}
                required
              />
            </div>
            <div className="auth-field">
              <label className="auth-label">Deposit ($)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="auth-input booking-input"
                value={deposit}
                onChange={(e) => setDeposit(e.target.value)}
                required
              />
            </div>
          </div>

          {!isEdit && (
            <div className="auth-field">
              <label className="auth-label">Initial stock</label>
              <input
                type="number"
                min="0"
                className="auth-input booking-input"
                value={totalStock}
                onChange={(e) => setTotalStock(e.target.value)}
                required
              />
            </div>
          )}

          <div className="auth-field">
            <label className="auth-label">Image path</label>
            <input
              className="auth-input booking-input"
              value={imageUrl ?? ''}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="/equipment/tl-drill-001.jpg"
            />
          </div>

          {isEdit && (
            <p className="form-note">
              Stock levels are adjusted through Inventory &amp; Stock, which records an audit log.
            </p>
          )}

          <button type="submit" className="btn-auth-submit" disabled={submitting}>
            {submitting ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Equipment'}
          </button>
        </form>
      </div>
    </div>
  );
};

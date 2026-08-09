/**
 * Extends postman_collection.json with the endpoints added after the original export
 * (categories, dashboard, uploads, users, notification feed, activity, payments ledger,
 * self-service profile). Idempotent: folders are replaced by name on re-run, so this can
 * be executed again after further API changes without duplicating entries.
 *
 * Usage:  node scripts/extend-postman.js
 */

const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'postman_collection.json');
const collection = JSON.parse(fs.readFileSync(FILE, 'utf8'));

/** Builds a Postman request item; `query` entries become disabled sample params. */
const req = (name, method, segments, { body, query, description } = {}) => {
  const url = {
    raw: `{{baseUrl}}/${segments.join('/')}${
      query ? `?${query.map((q) => `${q.key}=${q.value}`).join('&')}` : ''
    }`,
    host: ['{{baseUrl}}'],
    path: segments,
  };
  if (query) url.query = query.map((q) => ({ ...q, disabled: true }));

  return {
    name,
    request: {
      method,
      header: body
        ? [{ key: 'Content-Type', value: 'application/json' }]
        : [],
      ...(body ? { body: { mode: 'raw', raw: JSON.stringify(body, null, 2) } } : {}),
      url,
      ...(description ? { description } : {}),
    },
  };
};

const folders = [
  {
    name: '📁 Categories',
    item: [
      req('1. List Categories (with product counts)', 'GET', ['categories']),
      req('2. Get Category by ID', 'GET', ['categories', '{{categoryId}}']),
    ],
  },
  {
    name: '📁 Dashboard Analytics',
    item: [
      req('1. Business KPIs (ADMIN / STAFF)', 'GET', ['dashboard', 'stats'], {
        description:
          'Revenue, utilisation, most-rented equipment and 14-day reservation trends. Returns 403 for CUSTOMER and WAREHOUSE_OPERATOR.',
      }),
      req('2. My Rental Summary (any role)', 'GET', ['dashboard', 'my-summary'], {
        description: 'Scoped to the authenticated user; never exposes another account.',
      }),
    ],
  },
  {
    name: '📁 Document Uploads',
    item: [
      {
        name: '1. Upload Document (multipart)',
        request: {
          method: 'POST',
          header: [],
          body: {
            mode: 'formdata',
            formdata: [
              { key: 'file', type: 'file', src: [] },
              { key: 'type', value: 'IDENTITY_DOCUMENT', type: 'text' },
              { key: 'reservationId', value: '{{reservationId}}', type: 'text', disabled: true },
            ],
          },
          url: { raw: '{{baseUrl}}/uploads', host: ['{{baseUrl}}'], path: ['uploads'] },
          description:
            'JPEG/PNG/WebP/PDF only, 8MB max. Do NOT set Content-Type manually — Postman generates the multipart boundary.',
        },
      },
      req('2. List Documents', 'GET', ['uploads'], {
        query: [
          { key: 'reservationId', value: '{{reservationId}}' },
          { key: 'status', value: 'PENDING_REVIEW' },
        ],
      }),
      req('3. Download Document', 'GET', ['uploads', '{{uploadId}}', 'file']),
      req('4. Verify / Reject Document (ADMIN, STAFF)', 'PATCH', ['uploads', '{{uploadId}}', 'review'], {
        body: { status: 'VERIFIED', rejectionNote: '' },
      }),
    ],
  },
  {
    name: '📁 User Directory (ADMIN / STAFF)',
    item: [
      req('1. List Accounts', 'GET', ['users'], {
        query: [
          { key: 'role', value: 'CUSTOMER' },
          { key: 'search', value: '' },
          { key: 'page', value: '1' },
          { key: 'limit', value: '10' },
        ],
        description: 'Password hashes are never returned.',
      }),
      req('2. Account Profile with History', 'GET', ['users', '{{userId}}']),
      req('3. Role Distribution', 'GET', ['users', 'summary', 'roles']),
    ],
  },
  {
    name: '📁 Notification Feed',
    item: [
      req('1. My Notifications', 'GET', ['notifications'], {
        query: [
          { key: 'unreadOnly', value: 'true' },
          { key: 'limit', value: '20' },
        ],
      }),
      req('2. Mark One Read', 'PATCH', ['notifications', '{{notificationId}}', 'read']),
      req('3. Mark All Read', 'PATCH', ['notifications', 'read-all']),
    ],
  },
  {
    name: '📁 Activity Audit Log (ADMIN)',
    item: [
      req('1. Audit Trail', 'GET', ['activity'], {
        query: [
          { key: 'action', value: 'LOGIN' },
          { key: 'userId', value: '' },
          { key: 'page', value: '1' },
          { key: 'limit', value: '25' },
        ],
        description:
          'Actions: LOGIN, RESERVATION_CREATED, RESERVATION_UPDATED, PAYMENT_PROCESSED, PAYMENT_REFUNDED, INVENTORY_CHANGED, DOCUMENT_UPLOADED, DOCUMENT_REVIEWED.',
      }),
    ],
  },
];

/** Requests appended to folders that already exist. */
const additions = {
  '📁 Auth': [
    req('Update My Profile', 'PATCH', ['auth', 'me'], {
      body: { name: 'Updated Name', phone: '+94 77 123 4567' },
    }),
    req('Change My Password', 'POST', ['auth', 'change-password'], {
      body: { currentPassword: 'Password123!', newPassword: 'NewPassword456!' },
    }),
  ],
  '📁 Equipment': [
    req('Filter / Search / Paginate Catalog', 'GET', ['products'], {
      query: [
        { key: 'search', value: 'drill' },
        { key: 'categorySlug', value: 'power-tools' },
        { key: 'minPrice', value: '0' },
        { key: 'maxPrice', value: '500' },
        { key: 'availableOnly', value: 'true' },
        { key: 'sort', value: 'price_asc' },
        { key: 'page', value: '1' },
        { key: 'limit', value: '12' },
      ],
    }),
  ],
  '📁 Reservations': [
    req('Filter Reservations by Status', 'GET', ['reservations'], {
      query: [
        { key: 'status', value: 'PENDING' },
        { key: 'search', value: '' },
        { key: 'page', value: '1' },
        { key: 'limit', value: '10' },
      ],
    }),
    req('Reject with Reason', 'PATCH', ['reservations', '{{reservationId}}', 'status'], {
      body: { status: 'REJECTED', rejectionReason: 'Equipment under maintenance for those dates.' },
    }),
  ],
  '📁 Payments': [
    req('Payment Ledger', 'GET', ['payments'], {
      query: [
        { key: 'status', value: 'PAID' },
        { key: 'page', value: '1' },
        { key: 'limit', value: '10' },
      ],
    }),
    req('Simulate Declined Card', 'POST', ['payments', 'process'], {
      body: { reservationId: '{{reservationId}}', amount: 100, simulateFailure: true },
      description: 'Persists a FAILED payment row, then returns 400.',
    }),
  ],
};

// Replace-by-name keeps the script idempotent.
for (const folder of folders) {
  const idx = collection.item.findIndex((f) => f.name === folder.name);
  if (idx >= 0) collection.item[idx] = folder;
  else collection.item.push(folder);
}

for (const [folderName, items] of Object.entries(additions)) {
  const folder = collection.item.find((f) => f.name === folderName);
  if (!folder) continue;
  for (const item of items) {
    const idx = folder.item.findIndex((i) => i.name === item.name);
    if (idx >= 0) folder.item[idx] = item;
    else folder.item.push(item);
  }
}

// Collection variables referenced by the new requests.
const vars = ['categoryId', 'uploadId', 'userId', 'notificationId'];
collection.variable = collection.variable || [];
for (const key of vars) {
  if (!collection.variable.some((v) => v.key === key)) {
    collection.variable.push({ key, value: '', type: 'string' });
  }
}

fs.writeFileSync(FILE, JSON.stringify(collection, null, 2) + '\n', 'utf8');

const total = collection.item.reduce((n, f) => n + (f.item?.length ?? 0), 0);
console.log(`✅ Collection updated — ${collection.item.length} folders, ${total} requests.`);

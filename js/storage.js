// PaxoVet Local Storage Database Engine
const DB_VERSION = 2; // Incremented schema version
const STORAGE_KEY = 'paxovet_db';

const defaultProducts = [
  {
    id: 'prod-1',
    name: 'Royal Canin Golden Retriever Adult',
    price: 4500.00,
    discount: 10, // 10% discount
    image_url: 'https://images.unsplash.com/photo-1589722244358-f0ec9f82d2b5?auto=format&fit=crop&q=80&w=400',
    category: 'Food',
    description: 'Tailor-made nutrition for pure breed Golden Retrievers over 15 months old.',
    stock: 25,
    status: 'active'
  },
  {
    id: 'prod-2',
    name: 'Premium Leather Dog Collar - Teal',
    price: 799.00,
    discount: 0,
    image_url: 'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?auto=format&fit=crop&q=80&w=400',
    category: 'Accessories',
    description: 'Handcrafted durable genuine leather collar with rust-resistant brass buckles.',
    stock: 8,
    status: 'active'
  },
  {
    id: 'prod-3',
    name: 'Interactive Cat Laser Toy',
    price: 599.00,
    discount: 15, // 15% discount
    image_url: 'https://images.unsplash.com/photo-1548247416-ec66f4900b2e?auto=format&fit=crop&q=80&w=400',
    category: 'Accessories',
    description: '360 degree automatic rotating laser pointer for energetic cats.',
    stock: 0,
    status: 'out_of_stock'
  },
  {
    id: 'prod-4',
    name: 'Multi-Vitamin Daily Supplements',
    price: 1200.00,
    discount: 5,
    image_url: 'https://images.unsplash.com/photo-1584017911766-d451b3d0e843?auto=format&fit=crop&q=80&w=400',
    category: 'Healthcare',
    description: 'Essential vitamins and minerals for shiny coat and strong joint support.',
    stock: 15,
    status: 'active'
  },
  {
    id: 'prod-5',
    name: 'Organic Grooming Shampoo - Aloe',
    price: 699.00,
    discount: 20,
    image_url: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&q=80&w=400',
    category: 'Grooming',
    description: 'Gentle cleaning formula made with organic tea tree and aloe vera.',
    stock: 3, // low stock!
    status: 'active'
  }
];

// Helper to generate ISO date strings relative to today
const getIsoDateString = (offsetDays) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0];
};

const defaultSlots = [
  { id: 'slot-1', date: getIsoDateString(1), startTime: '09:30 AM', endTime: '10:30 AM', maxBookings: 2, bookedCount: 0, status: 'open' },
  { id: 'slot-2', date: getIsoDateString(1), startTime: '11:00 AM', endTime: '12:00 PM', maxBookings: 1, bookedCount: 1, status: 'full' },
  { id: 'slot-3', date: getIsoDateString(1), startTime: '03:00 PM', endTime: '04:00 PM', maxBookings: 3, bookedCount: 0, status: 'open' },
  { id: 'slot-4', date: getIsoDateString(2), startTime: '10:00 AM', endTime: '11:00 AM', maxBookings: 2, bookedCount: 0, status: 'open' },
  { id: 'slot-5', date: getIsoDateString(2), startTime: '02:00 PM', endTime: '03:00 PM', maxBookings: 1, bookedCount: 0, status: 'open' }
];

const defaultPets = [
  { 
    id: 'pet-1', 
    owner_id: 'user-aryan',
    name: 'Bruno', 
    breed: 'Golden Retriever', 
    species: 'Dog', 
    dob: '2024-01-15', 
    weight: 28.5, 
    gender: 'Male', 
    vaccination_status: 'Fully Vaccinated', 
    notes: 'Friendly, loves peanut butter.', 
    image_url: 'https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&q=80&w=400' 
  },
  { 
    id: 'pet-2', 
    owner_id: 'user-aryan',
    name: 'Milo', 
    breed: 'Persian', 
    species: 'Cat', 
    dob: '2023-08-20', 
    weight: 4.2, 
    gender: 'Female', 
    vaccination_status: 'Dewormed', 
    notes: 'Shy around strangers.', 
    image_url: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&q=80&w=400' 
  }
];

const defaultTreatments = [
  {
    id: 'treat-1',
    pet_id: 'pet-1',
    date: getIsoDateString(-2),
    diagnosis: 'Regular Vaccination & General Checkup',
    medicines: [
      { name: 'Multi-Vitamin Syrup', dosage: '5ml once daily', days: 30 },
      { name: 'Anti-rabies booster', dosage: '1 injection', days: 1 }
    ],
    notes: 'Pet is active and healthy. Weight is optimal.',
    prescription: 'Vaccination completed booster dose scheduled for next year.',
    followUpDate: getIsoDateString(10),
    doctor_name: 'Dr. Vikram Patel',
  }
];

const defaultAppointments = [
  {
    id: 'appt-1',
    pet_id: 'pet-1',
    datetime: getIsoDateString(1) + 'T11:00:00Z',
    status: 'approved',
    reason: 'Annual health checkup and vaccination booster',
  },
  {
    id: 'appt-2',
    pet_id: 'pet-1',
    datetime: getIsoDateString(-2) + 'T10:00:00Z',
    status: 'completed',
    reason: 'Mild fever and cough booster vaccines',
  },
  {
    id: 'appt-3',
    pet_id: 'pet-2',
    datetime: getIsoDateString(-1) + 'T15:00:00Z',
    status: 'cancelled',
    reason: 'Ear itching consultation',
  },
  {
    id: 'appt-4',
    pet_id: 'pet-2',
    datetime: getIsoDateString(1) + 'T09:30:00Z',
    status: 'submitted',
    reason: 'Nail trim and grooming checkup',
  }
];

// Seed rich historical orders to represent charts and totals (at least 10 orders)
const seedOrders = [
  {
    id: 'order-1',
    user_id: 'user-aryan',
    items: [{ product_id: 'prod-1', name: 'Royal Canin Golden Retriever Adult', price: 4050.00, qty: 1 }], // price * 0.9 discount
    subtotal: 3432.20,
    tax: 617.80,
    total: 4050.00,
    paymentStatus: 'paid',
    orderStatus: 'delivered',
    date: new Date(Date.now() - 7 * 86400000).toISOString() // 7 days ago
  },
  {
    id: 'order-2',
    user_id: 'user-aryan',
    items: [{ product_id: 'prod-4', name: 'Multi-Vitamin Daily Supplements', price: 1140.00, qty: 1 }],
    subtotal: 966.10,
    tax: 173.90,
    total: 1140.00,
    paymentStatus: 'paid',
    orderStatus: 'delivered',
    date: new Date(Date.now() - 6 * 86400000).toISOString()
  },
  {
    id: 'order-3',
    user_id: 'user-aryan',
    items: [
      { product_id: 'prod-2', name: 'Premium Leather Dog Collar - Teal', price: 799.00, qty: 1 },
      { product_id: 'prod-5', name: 'Organic Grooming Shampoo - Aloe', price: 559.20, qty: 1 }
    ],
    subtotal: 1151.02,
    tax: 207.18,
    total: 1358.20,
    paymentStatus: 'paid',
    orderStatus: 'shipped',
    date: new Date(Date.now() - 4 * 86400000).toISOString()
  },
  {
    id: 'order-4',
    user_id: 'user-aryan',
    items: [{ product_id: 'prod-1', name: 'Royal Canin Golden Retriever Adult', price: 4050.00, qty: 2 }],
    subtotal: 6864.41,
    tax: 1235.59,
    total: 8100.00,
    paymentStatus: 'paid',
    orderStatus: 'delivered',
    date: new Date(Date.now() - 3 * 86400000).toISOString()
  },
  {
    id: 'order-5',
    user_id: 'user-aryan',
    items: [{ product_id: 'prod-5', name: 'Organic Grooming Shampoo - Aloe', price: 559.20, qty: 1 }],
    subtotal: 473.90,
    tax: 85.30,
    total: 559.20,
    paymentStatus: 'paid',
    orderStatus: 'processing',
    date: new Date(Date.now() - 2 * 86400000).toISOString()
  },
  {
    id: 'order-6',
    user_id: 'user-aryan',
    items: [{ product_id: 'prod-2', name: 'Premium Leather Dog Collar - Teal', price: 799.00, qty: 1 }],
    subtotal: 677.12,
    tax: 121.88,
    total: 799.00,
    paymentStatus: 'paid',
    orderStatus: 'placed',
    date: new Date(Date.now() - 1 * 86400000).toISOString()
  },
  {
    id: 'order-7',
    user_id: 'user-aryan',
    items: [{ product_id: 'prod-4', name: 'Multi-Vitamin Daily Supplements', price: 1140.00, qty: 1 }],
    subtotal: 966.10,
    tax: 173.90,
    total: 1140.00,
    paymentStatus: 'paid',
    orderStatus: 'placed',
    date: new Date(Date.now() - 4 * 3600000).toISOString() // 4 hours ago
  },
  {
    id: 'order-8',
    user_id: 'user-aryan',
    items: [{ product_id: 'prod-3', name: 'Interactive Cat Laser Toy', price: 509.15, qty: 1 }],
    subtotal: 431.48,
    tax: 77.67,
    total: 509.15,
    paymentStatus: 'refunded',
    orderStatus: 'cancelled',
    date: new Date(Date.now() - 2 * 3600000).toISOString() // 2 hours ago
  },
  {
    id: 'order-9',
    user_id: 'user-aryan',
    items: [
      { product_id: 'prod-4', name: 'Multi-Vitamin Daily Supplements', price: 1140.00, qty: 1 },
      { product_id: 'prod-2', name: 'Premium Leather Dog Collar - Teal', price: 799.00, qty: 1 }
    ],
    subtotal: 1643.22,
    tax: 295.78,
    total: 1939.00,
    paymentStatus: 'paid',
    orderStatus: 'placed',
    date: new Date().toISOString()
  },
  {
    id: 'order-10',
    user_id: 'user-aryan',
    items: [{ product_id: 'prod-1', name: 'Royal Canin Golden Retriever Adult', price: 4050.00, qty: 1 }],
    subtotal: 3432.20,
    tax: 617.80,
    total: 4050.00,
    paymentStatus: 'failed',
    orderStatus: 'cancelled',
    date: new Date(Date.now() - 5 * 86400000).toISOString()
  }
];

// Seed payment transaction records
const seedPayments = [
  { paymentId: 'pay-1', orderId: 'order-1', amount: 4050.00, method: 'Card', status: 'Success', timestamp: seedOrders[0].date },
  { paymentId: 'pay-2', orderId: 'order-2', amount: 1140.00, method: 'UPI', status: 'Success', timestamp: seedOrders[1].date },
  { paymentId: 'pay-3', orderId: 'order-3', amount: 1358.20, method: 'Razorpay', status: 'Success', timestamp: seedOrders[2].date },
  { paymentId: 'pay-4', orderId: 'order-4', amount: 8100.00, method: 'Card', status: 'Success', timestamp: seedOrders[3].date },
  { paymentId: 'pay-5', orderId: 'order-5', amount: 559.20, method: 'UPI', status: 'Success', timestamp: seedOrders[4].date },
  { paymentId: 'pay-6', orderId: 'order-6', amount: 799.00, method: 'Cash', status: 'Success', timestamp: seedOrders[5].date },
  { paymentId: 'pay-7', orderId: 'order-7', amount: 1140.00, method: 'Razorpay', status: 'Success', timestamp: seedOrders[6].date },
  { paymentId: 'pay-8', orderId: 'order-8', amount: 509.15, method: 'Razorpay', status: 'Refunded', timestamp: seedOrders[7].date },
  { paymentId: 'pay-9', orderId: 'order-9', amount: 1939.00, method: 'Card', status: 'Success', timestamp: seedOrders[8].date },
  { paymentId: 'pay-10', orderId: 'order-10', amount: 4050.00, method: 'Razorpay', status: 'Failed', timestamp: seedOrders[9].date }
];

// Seed alerts notifications
const seedNotifications = [
  { id: 'notif-1', type: 'new_booking', title: 'New Appointment Booking', message: 'Aryan Sharma requested an appointment for Bruno on ' + defaultSlots[0].date + ' at 09:30 AM.', date: new Date().toISOString(), isRead: false },
  { id: 'notif-2', type: 'low_stock', title: 'Low Stock Warning', message: 'Organic Grooming Shampoo - Aloe has low inventory stock left (3 units).', date: new Date().toISOString(), isRead: false },
  { id: 'notif-3', type: 'payment_success', title: 'Payment Success Alert', message: 'Received payment of ₹1,939.00 for order order-9 via Credit Card.', date: new Date().toISOString(), isRead: true },
  { id: 'notif-4', type: 'payment_failure', title: 'Payment Failure Alert', message: 'Razorpay checkout transaction failed for order order-10.', date: new Date(Date.now() - 5 * 86400000).toISOString(), isRead: true }
];

// Initialize Storage Database
function initDB() {
  let dbStr = localStorage.getItem(STORAGE_KEY);
  let db = null;
  
  if (dbStr) {
    try {
      db = JSON.parse(dbStr);
    } catch (e) {
      console.warn("Corrupted database detected. Reinitializing...");
    }
  }

  // If no DB or wrong version, reset/migrate
  if (!db || db.version !== DB_VERSION) {
    db = {
      version: DB_VERSION,
      users: [
        { id: 'user-aryan', name: 'Aryan Sharma', email: 'aryan@customer.com', phone: '+919876543210', role: 'customer' },
        { id: 'user-admin', name: 'Dr. Vikram Patel', email: 'admin@paxovet.com', phone: '+919999888877', role: 'admin' }
      ],
      pets: defaultPets,
      appointments: defaultAppointments,
      treatments: defaultTreatments,
      slots: defaultSlots,
      products: defaultProducts,
      orders: seedOrders,
      payments: seedPayments,
      notifications: seedNotifications
    };
    saveDB(db);
  }
  return db;
}

// Save entire DB state
function saveDB(db) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

// Get specific table
function getTable(tableName) {
  const db = initDB();
  return db[tableName] || [];
}

// Save specific table
function saveTable(tableName, data) {
  const db = initDB();
  db[tableName] = data;
  saveDB(db);
}

// Expose public API
window.PaxoDB = {
  init: initDB,
  get: getTable,
  save: saveTable,
  update: (tableName, filterFn, updateFn) => {
    let list = getTable(tableName);
    list = list.map(item => filterFn(item) ? { ...item, ...updateFn(item) } : item);
    saveTable(tableName, list);
  },
  insert: (tableName, item) => {
    const list = getTable(tableName);
    list.push(item);
    saveTable(tableName, list);
    return item;
  },
  delete: (tableName, filterFn) => {
    let list = getTable(tableName);
    list = list.filter(item => !filterFn(item));
    saveTable(tableName, list);
  }
};

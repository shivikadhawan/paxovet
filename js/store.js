// PaxoVet Store Catalog & Cart Drawer Manager
window.PaxoStore = {
  activeCategory: 'all',

  init: () => {
    PaxoStore.renderStore();
    PaxoStore.renderCart();
    openRazorpay: () => {
  const cart     = PaxoDB.get('cart');
  const products = PaxoDB.get('products');
  const user     = PaxoAuth.currentUser();

  if (cart.length === 0) { PaxoUtils.toast('Your cart is empty.', 'error'); return; }

  let total = 0;
  cart.forEach(item => {
    const prod = products.find(p => p.id === item.product_id);
    if (prod) {
      const finalPrice = prod.discount > 0 ? prod.price * (1 - prod.discount / 100) : prod.price;
      total += finalPrice * item.qty;
    }
  });

  const options = {
    key:         'rzp_test_XXXXXXXXXX', // ← paste Razorpay test key
    amount:      Math.round(total * 100),
    currency:    'INR',
    name:        'PaxoVet',
    description: 'Pet Care Products & Services',
    prefill: {
      name:    user?.name  || '',
      email:   user?.email || '',
      contact: user?.phone || ''
    },
    theme: { color: '#2563EB' },
    handler: function() {
      PaxoStore.processPayment(true, 'Razorpay');
    },
    modal: {
      ondismiss: function() {
        PaxoUtils.toast('Payment cancelled.', 'info');
      }
    }
  };

  PaxoStore.hidePaymentModal();
  new Razorpay(options).open();
}
  },

  renderStore: () => {
    const products = PaxoDB.get('products').filter(p => p.status !== 'inactive');
    const catalogGrid = document.getElementById('store-catalog-grid');
    if (!catalogGrid) return;

    // Filter by category
    const filtered = PaxoStore.activeCategory === 'all'
      ? products
      : products.filter(p => p.category.toLowerCase() === PaxoStore.activeCategory.toLowerCase());

    catalogGrid.innerHTML = filtered.map(prod => {
      const discount = prod.discount || 0;
      const finalPrice = discount > 0 ? prod.price * (1 - discount / 100) : prod.price;
      const isOutOfStock = prod.stock === 0 || prod.status === 'out_of_stock';

      return `
        <div class="glass-card product-card">
          <div class="product-img-container">
            <img src="${prod.image_url}" alt="${prod.name}" class="product-img" loading="lazy">
            <span class="product-badge badge-info">${prod.category.toUpperCase()}</span>
            ${discount > 0 ? `<span class="badge badge-danger" style="position: absolute; top: 12px; right: 12px; font-weight: bold; font-size: 11px;">-${discount}% OFF</span>` : ''}
          </div>
          <div class="product-info">
            <h4>${prod.name}</h4>
            <p class="product-desc">${prod.description}</p>
            <div class="product-footer">
              <div>
                <span class="product-price">₹${finalPrice.toLocaleString('en-IN')}</span>
                ${discount > 0 ? `<div style="font-size: 11px; text-decoration: line-through; color: var(--text-muted); margin-top: 2px;">₹${prod.price.toLocaleString('en-IN')}</div>` : ''}
              </div>
              <div class="product-stock ${prod.stock <= 3 ? 'low-stock' : ''}">
                ${prod.stock > 0 ? `Stock: ${prod.stock}` : 'OUT OF STOCK'}
              </div>
            </div>
            <button class="btn btn-sm btn-primary add-cart-btn" 
              onclick="PaxoStore.addToCart('${prod.id}')"
              ${isOutOfStock ? 'disabled' : ''}>
              ${!isOutOfStock ? 'Add to Cart 🛒' : 'Out of Stock'}
            </button>
          </div>
        </div>
      `;
    }).join('');
  },

  selectCategory: (category, element) => {
    PaxoStore.activeCategory = category;
    document.querySelectorAll('.store-category-btn').forEach(btn => btn.classList.remove('active'));
    element.classList.add('active');
    PaxoStore.renderStore();
  },

  // ==========================================
  // 🛒 SHOPPING CART DRAWER
  // ==========================================
  toggleCart: (show) => {
    const drawer = document.getElementById('cart-drawer');
    const overlay = document.getElementById('cart-overlay');
    if (drawer && overlay) {
      if (show) {
        drawer.classList.add('open');
        overlay.classList.add('active');
        PaxoStore.renderCart();
      } else {
        drawer.classList.remove('open');
        overlay.classList.remove('active');
      }
    }
  },

  addToCart: (productId) => {
    const products = PaxoDB.get('products');
    const prod = products.find(p => p.id === productId);
    if (!prod) return;

    let cart = PaxoDB.get('cart');
    const item = cart.find(c => c.product_id === productId);

    if (item) {
      // Check stock limit
      if (item.qty >= prod.stock) {
        PaxoUtils.toast(`Only ${prod.stock} items available in stock.`, 'error');
        return;
      }
      item.qty += 1;
    } else {
      cart.push({
        product_id: productId,
        qty: 1
      });
    }

    PaxoDB.save('cart', cart);
    PaxoUtils.toast(`${prod.name} added to cart!`, 'success');
    PaxoStore.renderCart();
    
    // Auto slide open cart
    PaxoStore.toggleCart(true);
  },

  updateQty: (productId, change) => {
    let cart = PaxoDB.get('cart');
    const itemIndex = cart.findIndex(c => c.product_id === productId);
    if (itemIndex === -1) return;

    const products = PaxoDB.get('products');
    const prod = products.find(p => p.id === productId);
    const item = cart[itemIndex];

    if (change > 0) {
      if (item.qty >= prod.stock) {
        PaxoUtils.toast('Maximum available stock reached.', 'error');
        return;
      }
      item.qty += 1;
    } else {
      item.qty -= 1;
      if (item.qty <= 0) {
        cart.splice(itemIndex, 1);
      }
    }

    PaxoDB.save('cart', cart);
    PaxoStore.renderCart();
  },

  renderCart: () => {
    const cart = PaxoDB.get('cart');
    const products = PaxoDB.get('products');
    const itemsList = document.getElementById('cart-items-list');
    const countBadge = document.getElementById('cart-count-badge');
    const totalEl = document.getElementById('cart-total-price');

    if (!itemsList) return;

    let total = 0;
    let totalItems = 0;

    if (cart.length === 0) {
      itemsList.innerHTML = `
        <div style="text-align: center; color: var(--text-muted); padding: 48px 24px;">
          <span style="font-size: 48px;">🛒</span>
          <p style="margin-top: 12px;">Your shopping cart is empty.</p>
        </div>
      `;
      if (totalEl) totalEl.textContent = '₹0';
      if (countBadge) countBadge.textContent = '0';
      return;
    }

    itemsList.innerHTML = cart.map(item => {
      const prod = products.find(p => p.id === item.product_id);
      if (!prod) return '';

      const discount = prod.discount || 0;
      const finalPrice = discount > 0 ? prod.price * (1 - discount / 100) : prod.price;
      const itemTotal = finalPrice * item.qty;
      total += itemTotal;
      totalItems += item.qty;

      return `
        <div class="cart-item">
          <img src="${prod.image_url}" alt="${prod.name}">
          <div class="cart-item-info">
            <h5>${prod.name}</h5>
            <span class="cart-item-price">
              ₹${finalPrice.toLocaleString('en-IN')}
              ${discount > 0 ? `<span style="text-decoration: line-through; font-size: 11px; margin-left: 6px; color: var(--text-muted);">₹${prod.price.toLocaleString('en-IN')}</span>` : ''}
            </span>
            <div class="cart-item-qty">
              <button class="qty-btn" onclick="PaxoStore.updateQty('${prod.id}', -1)">-</button>
              <span>${item.qty}</span>
              <button class="qty-btn" onclick="PaxoStore.updateQty('${prod.id}', 1)">+</button>
            </div>
          </div>
          <span class="cart-item-total">₹${itemTotal.toLocaleString('en-IN')}</span>
        </div>
      `;
    }).join('');

    if (totalEl) totalEl.textContent = `₹${total.toLocaleString('en-IN')}`;
    if (countBadge) countBadge.textContent = totalItems;
  },

  // ==========================================
  // 💳 PAYMENT CHECKOUT METHOD
  // ==========================================
  checkout: () => {
    const cart = PaxoDB.get('cart');
    if (cart.length === 0) {
      PaxoUtils.toast('Your cart is empty.', 'error');
      return;
    }

    // Open simulated payment checkout screen
    const modal = document.getElementById('payment-modal');
    if (!modal) return;

    const products = PaxoDB.get('products');
    let total = 0;
    cart.forEach(item => {
      const prod = products.find(p => p.id === item.product_id);
      if (prod) {
        const discount = prod.discount || 0;
        const finalPrice = discount > 0 ? prod.price * (1 - discount / 100) : prod.price;
        total += finalPrice * item.qty;
      }
    });

    const amountEl = document.getElementById('payment-total-amount');
    if (amountEl) {
      amountEl.textContent = `₹${total.toLocaleString('en-IN')}`;
    }

    // Hide cart drawer, open payment modal
    PaxoStore.toggleCart(false);
    modal.style.display = 'flex';
  },

  hidePaymentModal: () => {
    const modal = document.getElementById('payment-modal');
    if (modal) modal.style.display = 'none';
  },

  processPayment: (success = true, method = 'Razorpay') => {
    const modal = document.getElementById('payment-modal');
    if (!modal) return;

    const cart = PaxoDB.get('cart');
    const products = PaxoDB.get('products');
    const user = PaxoAuth.currentUser();
    if (!user) return;

    let total = 0;
    const orderItems = [];
    let stockError = false;

    cart.forEach(item => {
      const prod = products.find(p => p.id === item.product_id);
      if (prod) {
        const discount = prod.discount || 0;
        const finalPrice = discount > 0 ? prod.price * (1 - discount / 100) : prod.price;
        total += finalPrice * item.qty;
        
        orderItems.push({
          product_id: item.product_id,
          name: prod.name,
          price: finalPrice,
          qty: item.qty
        });

        if (prod.stock < item.qty) {
          stockError = true;
        }
      }
    });

    if (stockError) {
      PaxoUtils.toast('Transaction failed: One or more products ran out of stock.', 'error');
      PaxoStore.hidePaymentModal();
      return;
    }

    const orderId = PaxoUtils.uuid('order');

    if (success) {
      // 1. Deduct stock
      cart.forEach(item => {
        const prod = products.find(p => p.id === item.product_id);
        if (prod) {
          prod.stock -= item.qty;
          if (prod.stock === 0) {
            prod.status = 'out_of_stock';
          }
          // Log low stock alert to Admin
          if (prod.stock <= 3 && window.PaxoAdmin) {
            window.PaxoAdmin.logNotification('low_stock', 'Low Stock Warning', `${prod.name} is running low on stock (${prod.stock} units remaining).`);
          }
        }
      });
      PaxoDB.save('products', products);

      // 2. Math for tax/subtotal (18% GST rate)
      const subtotal = total / 1.18;
      const tax = total - subtotal;

      // 3. Create Order
      const newOrder = {
        id: orderId,
        user_id: user.id,
        items: orderItems,
        subtotal: parseFloat(subtotal.toFixed(2)),
        tax: parseFloat(tax.toFixed(2)),
        total: total,
        paymentStatus: 'paid',
        orderStatus: 'placed',
        date: new Date().toISOString()
      };
      PaxoDB.insert('orders', newOrder);

      // 4. Create Payment Transaction record
      const payId = PaxoUtils.uuid('pay');
      const newPayment = {
        paymentId: payId,
        orderId: orderId,
        amount: total,
        method: method,
        status: 'Success',
        timestamp: new Date().toISOString()
      };
      PaxoDB.insert('payments', newPayment);

      // 5. Trigger notifications
      if (window.PaxoAdmin) {
        window.PaxoAdmin.logNotification('payment_success', 'Payment Success Alert', `Received payment of ₹${total.toLocaleString('en-IN')} for order ${orderId} via ${method}.`);
      }

      PaxoDB.save('cart', []);
      PaxoUtils.toast('Payment successful! Order placed.', 'success');
      
      PaxoStore.renderCart();
      PaxoStore.renderStore();
      
      if (window.PaxoAdmin) {
        window.PaxoAdmin.renderStats();
        window.PaxoAdmin.renderProducts();
        window.PaxoAdmin.renderOrders();
        window.PaxoAdmin.renderPayments();
        window.PaxoAdmin.renderActivityFeed();
      }
    } else {
      // Fail simulation
      const newOrder = {
        id: orderId,
        user_id: user.id,
        items: orderItems,
        subtotal: parseFloat((total / 1.18).toFixed(2)),
        tax: parseFloat((total - (total / 1.18)).toFixed(2)),
        total: total,
        paymentStatus: 'failed',
        orderStatus: 'cancelled',
        date: new Date().toISOString()
      };
      PaxoDB.insert('orders', newOrder);

      const payId = PaxoUtils.uuid('pay');
      const newPayment = {
        paymentId: payId,
        orderId: orderId,
        amount: total,
        method: method,
        status: 'Failed',
        timestamp: new Date().toISOString()
      };
      PaxoDB.insert('payments', newPayment);

      if (window.PaxoAdmin) {
        window.PaxoAdmin.logNotification('payment_failure', 'Payment Failure Alert', `Razorpay checkout transaction failed for order ${orderId}.`);
      }

      PaxoUtils.toast('Transaction payment failed.', 'error');
      
      if (window.PaxoAdmin) {
        window.PaxoAdmin.renderStats();
        window.PaxoAdmin.renderOrders();
        window.PaxoAdmin.renderPayments();
        window.PaxoAdmin.renderActivityFeed();
      }
    }

    PaxoStore.hidePaymentModal();
  }
};

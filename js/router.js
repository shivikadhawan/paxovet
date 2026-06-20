// PaxoVet Routing & Navigation Engine
const routes = {
  '/': { view: 'view-landing', auth: null },
  '#/customer': { view: 'view-customer-dashboard', auth: 'customer' },
  '#/customer/pets': { view: 'view-customer-dashboard', tab: 'pets', auth: 'customer' },
  '#/customer/bookings': { view: 'view-customer-dashboard', tab: 'bookings', auth: 'customer' },
  '#/customer/history': { view: 'view-customer-dashboard', tab: 'history', auth: 'customer' },
  '#/customer/store': { view: 'view-customer-dashboard', tab: 'store', auth: 'customer' },
  '#/admin': { view: 'view-admin-dashboard', auth: 'admin' }
};

function handleRoute() {
  const hash = window.location.hash || '/';
  
  // Find matching route or fallback to landing
  let routeKey = hash;
  if (!routes[routeKey]) {
    // If it starts with customer sub-routes, match them, otherwise fallback to root
    if (hash.startsWith('#/customer/')) {
      routeKey = hash;
    } else {
      routeKey = '/';
    }
  }

  const target = routes[routeKey] || routes['/'];
  const user = PaxoAuth.currentUser();

  // Authentication Guards
  if (target.auth) {
    if (!user) {
      PaxoUtils.toast('Please sign in to access this page.', 'info');
      window.location.hash = '#/';
      // Open login modal
      PaxoAuth.showLoginModal();
      return;
    }
    if (target.auth !== user.role) {
      PaxoUtils.toast('Access Denied. Incorrect Role Permissions.', 'error');
      window.location.hash = user.role === 'admin' ? '#/admin' : '#/customer';
      return;
    }
  }

  // Update DOM Visibility
  document.querySelectorAll('.view-section').forEach(el => {
    el.style.display = 'none';
  });

  const activeView = document.getElementById(target.view);
  if (activeView) {
    activeView.style.display = 'block';
  }

  // Handle Inner Tabs for Customer Dashboard
  if (target.view === 'view-customer-dashboard') {
    const tabName = target.tab || 'pets';
    
    // Deactivate all subtabs
    document.querySelectorAll('.customer-tab-content').forEach(el => {
      el.style.display = 'none';
    });
    document.querySelectorAll('.customer-tab-btn').forEach(btn => {
      btn.classList.remove('active');
    });

    // Activate selected subtab
    const activeTab = document.getElementById(`tab-${tabName}`);
    if (activeTab) {
      activeTab.style.display = 'block';
    }
    const activeBtn = document.querySelector(`[data-tab="${tabName}"]`);
    if (activeBtn) {
      activeBtn.classList.add('active');
    }

    // Trigger tab-specific refresh/renders
    if (window.PaxoCustomer) {
      if (tabName === 'pets') window.PaxoCustomer.renderPets();
      if (tabName === 'bookings') window.PaxoCustomer.renderBookings();
      if (tabName === 'history') window.PaxoCustomer.renderHistory();
      if (tabName === 'store') window.PaxoStore.renderStore();
    }
  }

  // Update Header/Navigation link active styling
  document.querySelectorAll('.nav-link').forEach(link => {
    if (link.getAttribute('href') === hash) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });

  // Re-render admin dashboard stats or tables if navigating to admin
  if (target.view === 'view-admin-dashboard' && window.PaxoAdmin) {
    window.PaxoAdmin.init();
  }

  // Scroll to top
  window.scrollTo(0, 0);
}

// Initialize Router listeners
window.addEventListener('hashchange', handleRoute);
window.addEventListener('load', handleRoute);

window.PaxoRouter = {
  navigate: (path) => {
    window.location.hash = path;
  },
  refresh: handleRoute
};

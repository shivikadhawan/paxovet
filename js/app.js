// PaxoVet Main Application Bootstrapper
document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize Local Database State
  PaxoDB.init();

  // 2. Refresh Auth Status UI elements
  PaxoAuth.updateUI();

  // 3. Bind Event Listeners for Authentication
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value;
      const name = document.getElementById('login-name').value;
      const phone = document.getElementById('login-phone').value;
      
      const role = email.toLowerCase().includes('admin') ? 'admin' : 'customer';
      PaxoAuth.login(email, name, phone, role);
    });
  }

  const logoutBtn = document.getElementById('nav-logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      PaxoAuth.logout();
    });
  }

  // 4. Bind customer-specific form handlers
  const petForm = document.getElementById('pet-form');
  if (petForm) {
    petForm.addEventListener('submit', (e) => {
      PaxoCustomer.savePet(e);
    });
  }

  const bookingForm = document.getElementById('booking-form');
  if (bookingForm) {
    bookingForm.addEventListener('submit', (e) => {
      PaxoCustomer.submitBooking(e);
    });
  }

  // 5. Bind admin-specific form handlers
  const slotForm = document.getElementById('admin-slot-form');
  if (slotForm) {
    slotForm.addEventListener('submit', (e) => {
      PaxoAdmin.createSlot(e);
    });
  }

  const treatmentForm = document.getElementById('admin-treatment-form');
  if (treatmentForm) {
    treatmentForm.addEventListener('submit', (e) => {
      PaxoAdmin.saveTreatment(e);
    });
  }

  const productForm = document.getElementById('admin-product-form');
  if (productForm) {
    productForm.addEventListener('submit', (e) => {
      PaxoAdmin.addProduct(e);
    });
  }

  // 6. Init customer and admin components
  PaxoCustomer.init();
  PaxoAdmin.init();
  PaxoStore.init();

  // 7. Route the initial URL
  if (window.PaxoRouter) {
    window.PaxoRouter.refresh();
  }
});

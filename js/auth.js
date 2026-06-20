// ─── EmailJS OTP Config ───────────────────────────────
const EMAILJS_PUBLIC_KEY  = 'NfSOV1O5-QnE0Zvq3';   // from EmailJS dashboard
const EMAILJS_SERVICE_ID  = 'service_yxinza2';
const EMAILJS_TEMPLATE_ID = 'template_it69spp';

emailjs.init(EMAILJS_PUBLIC_KEY);

let _otpCode    = null;
let _otpExpiry  = null;
let _otpEmail   = null;
// PaxoVet Authentication & Onboarding Manager
const SESSION_KEY = 'paxovet_session';
const LAST_EMAIL_KEY = 'paxovet_last_email';

function getCurrentUser() {
  const session = localStorage.getItem(SESSION_KEY);
  if (!session) return null;
  try {
    return JSON.parse(session);
  } catch (e) {
    return null;
  }
}

function loginUser(email, name = '', phone = '', requestedRole = 'customer') {
  if (!email || !email.includes('@')) {
    PaxoUtils.toast('Please enter a valid email address.', 'error');
    return false;
  }
  
  email = email.toLowerCase().trim();
  let users = PaxoDB.get('users');
  let user = users.find(u => u.email === email);

  // Auto-detect role for default admin account
  let role = requestedRole;
  if (email.includes('admin')) {
    role = 'admin';
  }

  if (!user) {
    // Sign Up new customer
    user = {
      id: PaxoUtils.uuid('user'),
      name: name.trim() || 'Guest Customer',
      email: email,
      phone: phone.trim() || '+919999888877',
      role: role
    };
    PaxoDB.insert('users', user);
    PaxoUtils.toast(`Account registered: ${user.name}!`, 'success');
  } else {
    // Existing user login
    PaxoUtils.toast(`Welcome back, ${user.name}!`, 'success');
  }

  // Save Session & Last Email
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  localStorage.setItem(LAST_EMAIL_KEY, email);

  hideLoginModal();
  updateAuthUI();

  // Redirect based on role
  if (user.role === 'admin') {
    window.location.hash = '#/admin';
  } else {
    window.location.hash = '#/customer';
  }

  return true;
}

function logoutUser() {
  localStorage.removeItem(SESSION_KEY);
  PaxoUtils.toast('Successfully signed out.', 'info');
  updateAuthUI();
  window.location.hash = '#/';
}

function updateAuthUI() {
  const user = getCurrentUser();
  const loginBtn = document.getElementById('nav-login-btn');
  const userBtn = document.getElementById('nav-user-btn');
  const userNameText = document.getElementById('nav-user-name');
  const adminLink = document.getElementById('nav-admin-link');
  const customerLink = document.getElementById('nav-customer-link');

  if (user) {
    if (loginBtn) loginBtn.style.display = 'none';
    if (userBtn) {
      userBtn.style.display = 'flex';
      if (userNameText) userNameText.textContent = user.name.split(' ')[0];
    }
    
    // Toggle nav links
    if (adminLink) adminLink.style.display = user.role === 'admin' ? 'block' : 'none';
    if (customerLink) customerLink.style.display = user.role === 'customer' ? 'block' : 'none';
    
    // Toggle Admin Notification bell
    const notifBell = document.getElementById('nav-notif-container');
    if (notifBell) notifBell.style.display = user.role === 'admin' ? 'block' : 'none';
  } else {
    if (loginBtn) loginBtn.style.display = 'block';
    if (userBtn) userBtn.style.display = 'none';
    if (adminLink) adminLink.style.display = 'none';
    if (customerLink) customerLink.style.display = 'none';
    
    const notifBell = document.getElementById('nav-notif-container');
    if (notifBell) notifBell.style.display = 'none';
  }
}

function showLoginModal() {
  const modal = document.getElementById('login-modal');
  if (modal) {
    modal.style.display = 'flex';
    // Pre-fill last logged email
    const lastEmail = localStorage.getItem(LAST_EMAIL_KEY);
    const emailInput = document.getElementById('login-email');
    if (lastEmail && emailInput) {
      emailInput.value = lastEmail;
    }
  }
}

function hideLoginModal() {
  const modal = document.getElementById('login-modal');
  if (modal) {
    modal.style.display = 'none';
    // Clear registration fields
    document.getElementById('login-name').value = '';
    document.getElementById('login-phone').value = '';
  }
}
function sendOTP() {
  const email = document.getElementById('login-email').value.trim();
  if (!email || !email.includes('@')) {
    PaxoUtils.toast('Please enter a valid email.', 'error');
    return;
  }

  const btn = document.getElementById('send-otp-btn');
  btn.disabled = true;
  btn.textContent = 'Sending...';

  _otpCode   = Math.floor(100000 + Math.random() * 900000).toString();
  _otpExpiry = Date.now() + 5 * 60 * 1000; // 5 min
  _otpEmail  = email;

  emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
    to_email: email,
    otp_code: _otpCode
  }).then(() => {
    document.getElementById('otp-step-email').style.display   = 'none';
    document.getElementById('otp-step-verify').style.display  = 'block';
    document.getElementById('otp-sent-to').textContent        = email;
    PaxoUtils.toast('OTP sent! Check your inbox.', 'success');
  }).catch((err) => {
    console.error('EmailJS error:', err);
    PaxoUtils.toast('Failed to send OTP. Try again.', 'error');
    btn.disabled    = false;
    btn.textContent = 'Send OTP to Email';
  });
}

function verifyOTP(enteredCode) {
  if (!_otpCode || !_otpExpiry) {
    PaxoUtils.toast('No OTP found. Please request again.', 'error');
    return false;
  }
  if (Date.now() > _otpExpiry) {
    PaxoUtils.toast('OTP expired. Please resend.', 'error');
    _otpCode = null;
    return false;
  }
  if (enteredCode !== _otpCode) {
    PaxoUtils.toast('Wrong OTP. Try again.', 'error');
    return false;
  }
  _otpCode = null; // Invalidate after use
  return true;
}

function resendOTP() {
  document.getElementById('otp-step-email').style.display  = 'block';
  document.getElementById('otp-step-verify').style.display = 'none';
  const btn = document.getElementById('send-otp-btn');
  btn.disabled    = false;
  btn.textContent = 'Send OTP to Email';
}
// Expose public API
window.PaxoAuth = {
  currentUser: getCurrentUser,
  login: loginUser,
  logout: logoutUser,
  updateUI: updateAuthUI,
  showLoginModal: showLoginModal,
  hideLoginModal: hideLoginModal,
  sendOTP: sendOTP,       // ← add these 3
  verifyOTP: verifyOTP,
  resendOTP: resendOTP
};

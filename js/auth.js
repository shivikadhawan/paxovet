// PaxoVet Authentication & Onboarding Manager
const SESSION_KEY      = 'paxovet_session';
const LAST_EMAIL_KEY   = 'paxovet_last_email';
const FAST2SMS_API_KEY = 'YOUR_FAST2SMS_KEY';   // ← paste Fast2SMS key
const ADMIN_EMAIL      = 'YOUR_ADMIN@EMAIL.COM'; // ← paste your admin email

// EmailJS config (kept for email OTP fallback)
const EMAILJS_PUBLIC_KEY  = 'YOUR_EMAILJS_PUBLIC_KEY';   // ← paste
const EMAILJS_SERVICE_ID  = 'YOUR_EMAILJS_SERVICE_ID';   // ← paste
const EMAILJS_TEMPLATE_ID = 'YOUR_EMAILJS_TEMPLATE_ID';  // ← paste

window.addEventListener('load', () => {
  if (typeof emailjs !== 'undefined') emailjs.init(EMAILJS_PUBLIC_KEY);
});

let _otpCode    = null;
let _otpExpiry  = null;
let _otpTarget  = null; // stores phone or email
let _otpMethod  = null; // 'sms' or 'email'

// ─── OTP: Send ────────────────────────────────────────────────────────────────
async function sendOTP() {
  const phone = document.getElementById('login-phone').value.trim().replace(/\s+/g, '');
  const email = document.getElementById('login-email').value.trim();

  // Validate — at least one must be provided
  const hasPhone = /^[6-9]\d{9}$/.test(phone);
  const hasEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  if (!hasPhone && !hasEmail) {
    PaxoUtils.toast('Enter a valid phone number or email address.', 'error');
    return;
  }

  const btn = document.getElementById('send-otp-btn');
  btn.disabled    = true;
  btn.textContent = 'Sending...';

  _otpCode   = Math.floor(100000 + Math.random() * 900000).toString();
  _otpExpiry = Date.now() + 5 * 60 * 1000; // 5 minutes

  // Prefer phone if provided, fallback to email
  if (hasPhone) {
    _otpMethod = 'sms';
    _otpTarget = phone;
    await sendViaSMS(phone, btn);
  } else {
    _otpMethod = 'email';
    _otpTarget = email;
    await sendViaEmail(email, btn);
  }
}

async function sendViaSMS(phone, btn) {
  try {
    const res  = await fetch(`https://www.fast2sms.com/dev/bulkV2?authorization=${FAST2SMS_API_KEY}&variables_values=${_otpCode}&route=otp&numbers=${phone}`);
    const data = await res.json();

    if (data.return === true) {
      showOTPStep(`+91 ${phone}`);
      PaxoUtils.toast('OTP sent to your phone!', 'success');
    } else {
      PaxoUtils.toast('SMS failed. Try with email instead.', 'error');
      resetSendBtn(btn);
    }
  } catch {
    PaxoUtils.toast('Network error. Try again.', 'error');
    resetSendBtn(btn);
  }
}

async function sendViaEmail(email, btn) {
  try {
    await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
      to_email: email,
      passcode: _otpCode
    });
    showOTPStep(email);
    PaxoUtils.toast('OTP sent to your email!', 'success');
  } catch {
    PaxoUtils.toast('Email failed. Try with phone instead.', 'error');
    resetSendBtn(btn);
  }
}

function showOTPStep(target) {
  document.getElementById('otp-step-email').style.display  = 'none';
  document.getElementById('otp-step-verify').style.display = 'block';
  document.getElementById('otp-sent-to').textContent       = target;
}

function resetSendBtn(btn) {
  btn.disabled    = false;
  btn.textContent = 'Send OTP';
}

// ─── OTP: Verify ──────────────────────────────────────────────────────────────
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
  _otpCode = null; // invalidate after use
  return true;
}

// ─── OTP: Resend ──────────────────────────────────────────────────────────────
function resendOTP() {
  document.getElementById('otp-step-email').style.display  = 'block';
  document.getElementById('otp-step-verify').style.display = 'none';
  const btn = document.getElementById('send-otp-btn');
  resetSendBtn(btn);
}

// ─── Login ────────────────────────────────────────────────────────────────────
function loginUser(email, name = '', phone = '', requestedRole = 'customer') {
  // Use stored OTP target as identifier if no email provided
  const identifier = email || _otpTarget || '';

  if (identifier && identifier.includes('@') && !identifier.includes('@')) {
    PaxoUtils.toast('Please enter a valid email address.', 'error');
    return false;
  }

  const loginEmail = identifier.includes('@') ? identifier.toLowerCase().trim() : (email || '').toLowerCase().trim();
  let users = PaxoDB.get('users');
  let user  = users.find(u => u.email === loginEmail || u.phone === phone);

  const role = loginEmail === ADMIN_EMAIL.toLowerCase() ? 'admin' : 'customer';

  if (!user) {
    user = {
      id:    PaxoUtils.uuid('user'),
      name:  name.trim() || 'Guest Customer',
      email: loginEmail,
      phone: phone.trim() || '',
      role:  role
    };
    PaxoDB.insert('users', user);
    PaxoUtils.toast(`Account registered: ${user.name}!`, 'success');
  } else {
    PaxoUtils.toast(`Welcome back, ${user.name}!`, 'success');
  }

  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  if (loginEmail) localStorage.setItem(LAST_EMAIL_KEY, loginEmail);

  hideLoginModal();
  updateAuthUI();

  window.location.hash = user.role === 'admin' ? '#/admin' : '#/customer';
  return true;
}

// ─── Auth Helpers ─────────────────────────────────────────────────────────────
function getCurrentUser() {
  const session = localStorage.getItem(SESSION_KEY);
  if (!session) return null;
  try { return JSON.parse(session); } catch { return null; }
}

function logoutUser() {
  localStorage.removeItem(SESSION_KEY);
  PaxoUtils.toast('Successfully signed out.', 'info');
  updateAuthUI();
  window.location.hash = '#/';
}

function updateAuthUI() {
  const user         = getCurrentUser();
  const loginBtn     = document.getElementById('nav-login-btn');
  const userBtn      = document.getElementById('nav-user-btn');
  const userNameText = document.getElementById('nav-user-name');
  const adminLink    = document.getElementById('nav-admin-link');
  const customerLink = document.getElementById('nav-customer-link');

  if (user) {
    if (loginBtn) loginBtn.style.display = 'none';
    if (userBtn) {
      userBtn.style.display = 'flex';
      if (userNameText) userNameText.textContent = user.name.split(' ')[0];
    }
    if (adminLink)    adminLink.style.display    = user.role === 'admin'    ? 'block' : 'none';
    if (customerLink) customerLink.style.display = user.role === 'customer' ? 'block' : 'none';
    const notifBell = document.getElementById('nav-notif-container');
    if (notifBell) notifBell.style.display = user.role === 'admin' ? 'block' : 'none';
  } else {
    if (loginBtn) loginBtn.style.display = 'block';
    if (userBtn)  userBtn.style.display  = 'none';
    if (adminLink)    adminLink.style.display    = 'none';
    if (customerLink) customerLink.style.display = 'none';
    const notifBell = document.getElementById('nav-notif-container');
    if (notifBell) notifBell.style.display = 'none';
  }
}

function showLoginModal() {
  const modal = document.getElementById('login-modal');
  if (modal) {
    modal.style.display = 'flex';
    const lastEmail = localStorage.getItem(LAST_EMAIL_KEY);
    const emailInput = document.getElementById('login-email');
    if (lastEmail && emailInput) emailInput.value = lastEmail;
  }
}

function hideLoginModal() {
  const modal = document.getElementById('login-modal');
  if (modal) {
    modal.style.display = 'none';
    document.getElementById('login-name').value  = '';
    document.getElementById('login-phone').value = '';
    document.getElementById('login-email').value = '';
    // Reset OTP steps
    document.getElementById('otp-step-email').style.display  = 'block';
    document.getElementById('otp-step-verify').style.display = 'none';
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────
window.PaxoAuth = {
  currentUser:    getCurrentUser,
  login:          loginUser,
  logout:         logoutUser,
  updateUI:       updateAuthUI,
  showLoginModal: showLoginModal,
  hideLoginModal: hideLoginModal,
  sendOTP:        sendOTP,
  verifyOTP:      verifyOTP,
  resendOTP:      resendOTP
};

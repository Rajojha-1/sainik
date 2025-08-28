// Global variables
let currentStep = 1;
const NODE_API_BASE = window.NODE_API_BASE || 'http://localhost:4000';
const PY_API_BASE = window.PY_API_BASE || 'http://localhost:5001';
let bookingData = {
    category: '',
    department: '',
    date: '',
    timeSlot: '',
    patientInfo: {}
};

// DOM Content Loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    updateLiveStatus();
    setInterval(updateLiveStatus, 30000); // Update every 30 seconds
});

// Initialize Application
function initializeApp() {
    // Set up navigation
    setupNavigation();
    
    // Initialize mobile menu
    setupMobileMenu();
    
    // Show home section by default
    showSection('home');
    
    // Initialize form validation
    setupFormValidation();

    // Restore session and cart
    restoreSession();
    loadCartFromStorage();
    renderCartPage();
    bindAuthForms();
    setupGrievanceForm();
    renderSchemes();
    
    console.log('Sainik Shifa Setu initialized successfully');
}

// Generic API helper with graceful fallback
async function safeFetchJson(url, options) {
    try {
        const res = await fetch(url, {
            headers: { 'Content-Type': 'application/json', ...(options && options.headers ? options.headers : {}) },
            ...options,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    } catch (err) {
        console.warn('API unavailable, falling back:', url, err);
        return null;
    }
}

// Navigation Setup
function setupNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const sectionId = this.getAttribute('href').substring(1);
            showSection(sectionId);
            updateActiveNav(this);
        });
    });
}

// Show Section
function showSection(sectionId) {
    // Hide all sections
    const sections = document.querySelectorAll('.section');
    sections.forEach(section => {
        section.classList.remove('active');
    });
    
    // Show target section
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
    }
    
    // Update active nav
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${sectionId}`) {
            link.classList.add('active');
        }
    });
    
    // Reset booking form when navigating to token booking
    if (sectionId === 'token-booking') {
        resetBookingForm();
    }
    
    // Scroll to top
    window.scrollTo(0, 0);
}

// Update Active Navigation
function updateActiveNav(activeLink) {
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => link.classList.remove('active'));
    activeLink.classList.add('active');
}

// ========== Auth ==========
function openAuthModal() {
    const modal = document.getElementById('auth-modal');
    if (modal) modal.style.display = 'block';
}

function closeAuthModal() {
    const modal = document.getElementById('auth-modal');
    if (modal) modal.style.display = 'none';
}

function showAuthTab(which) {
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const tabLogin = document.getElementById('tab-login');
    const tabSignup = document.getElementById('tab-signup');
    if (!loginForm || !signupForm) return;
    if (which === 'login') {
        loginForm.style.display = 'grid';
        signupForm.style.display = 'none';
        tabLogin.classList.add('active');
        tabSignup.classList.remove('active');
    } else {
        loginForm.style.display = 'none';
        signupForm.style.display = 'grid';
        tabSignup.classList.add('active');
        tabLogin.classList.remove('active');
    }
}

function bindAuthForms() {
    const login = document.getElementById('login-form');
    const signup = document.getElementById('signup-form');
    if (login) {
        login.addEventListener('submit', async function(e) {
            e.preventDefault();
            const email = document.getElementById('login-email').value.trim();
            const password = document.getElementById('login-password').value;
            if (!email || !password) return;
            // Try backend first
            const apiUser = await safeFetchJson(`${NODE_API_BASE}/api/auth/login`, {
                method: 'POST',
                body: JSON.stringify({ email, password })
            });
            if (apiUser) {
                localStorage.setItem('sessionUser', JSON.stringify(apiUser));
            } else {
                // Fallback to local
                const storedUsers = JSON.parse(localStorage.getItem('users') || '[]');
                const user = storedUsers.find(u => u.email === email && u.password === password);
                if (!user) { showNotification('Invalid credentials', 'error'); return; }
                localStorage.setItem('sessionUser', JSON.stringify({ name: user.name, email: user.email, role: user.role }));
            }
            updateAuthUI();
            closeAuthModal();
            renderSchemes();
            showNotification('Welcome back!', 'success');
        });
    }
    if (signup) {
        signup.addEventListener('submit', async function(e) {
            e.preventDefault();
            const name = document.getElementById('signup-name').value.trim();
            const email = document.getElementById('signup-email').value.trim();
            const password = document.getElementById('signup-password').value;
            const role = document.getElementById('signup-role').value;
            if (!name || !email || !password) return;
            // Try backend first
            const apiUser = await safeFetchJson(`${NODE_API_BASE}/api/auth/signup`, {
                method: 'POST',
                body: JSON.stringify({ name, email, password, role })
            });
            if (apiUser) {
                localStorage.setItem('sessionUser', JSON.stringify(apiUser));
            } else {
                // Fallback to local
                const users = JSON.parse(localStorage.getItem('users') || '[]');
                if (users.some(u => u.email === email)) { showNotification('Email already registered', 'warning'); return; }
                users.push({ name, email, password, role });
                localStorage.setItem('users', JSON.stringify(users));
                localStorage.setItem('sessionUser', JSON.stringify({ name, email, role }));
            }
            updateAuthUI();
            closeAuthModal();
            renderSchemes();
            showNotification('Account created!', 'success');
        });
    }
}

function restoreSession() {
    updateAuthUI();
}

function updateAuthUI() {
    const sessionUser = JSON.parse(localStorage.getItem('sessionUser') || 'null');
    const loginBtn = document.getElementById('login-btn');
    const userProfile = document.getElementById('user-profile');
    const nameDisplay = document.getElementById('user-name-display');
    if (sessionUser) {
        if (loginBtn) loginBtn.style.display = 'none';
        if (userProfile) userProfile.style.display = 'flex';
        if (nameDisplay) nameDisplay.textContent = sessionUser.name;
        const hint = document.getElementById('schemes-login-hint');
        if (hint) hint.style.display = 'none';
    } else {
        if (loginBtn) loginBtn.style.display = 'inline-flex';
        if (userProfile) userProfile.style.display = 'none';
        const hint = document.getElementById('schemes-login-hint');
        if (hint) hint.style.display = 'block';
    }
}

function logout() {
    localStorage.removeItem('sessionUser');
    updateAuthUI();
    renderSchemes();
}

// Mobile Menu Setup
function setupMobileMenu() {
    const mobileToggle = document.querySelector('.mobile-menu-toggle');
    const mainNav = document.querySelector('.main-nav');
    
    if (mobileToggle) {
        mobileToggle.addEventListener('click', function() {
            mainNav.classList.toggle('active');
        });
    }
}

// Update Live Status
function updateLiveStatus() {
    // Simulate real-time updates
    const currentToken = document.getElementById('current-token');
    const avgWait = document.getElementById('avg-wait');
    
    if (currentToken) {
        const tokenNum = parseInt(currentToken.textContent.replace('T-', '')) + Math.floor(Math.random() * 3);
        currentToken.textContent = `T-${tokenNum}`;
    }
    
    if (avgWait) {
        const waitTime = Math.floor(Math.random() * 20) + 8;
        avgWait.textContent = `${waitTime} minutes`;
    }
}

// Language Toggle
function toggleLanguage() {
    const button = document.querySelector('.language-toggle button');
    if (button.textContent === 'हिंदी') {
        button.textContent = 'English';
        // Here you would implement language switching logic
        console.log('Switching to Hindi');
    } else {
        button.textContent = 'हिंदी';
        console.log('Switching to English');
    }
}

// Token Booking Functions
function selectCategory(category) {
    bookingData.category = category;
    
    // Update UI
    const categoryCards = document.querySelectorAll('.category-card');
    categoryCards.forEach(card => card.classList.remove('selected'));
    
    const selectedCard = event.currentTarget;
    selectedCard.classList.add('selected');
    
    // Enable next button
    const nextBtn = document.getElementById('next-btn');
    nextBtn.disabled = false;
}

function selectDepartment(department) {
    bookingData.department = department;
    
    // Update UI
    const departmentCards = document.querySelectorAll('.department-card');
    departmentCards.forEach(card => card.classList.remove('selected'));
    
    const selectedCard = event.currentTarget;
    selectedCard.classList.add('selected');
    
    // Enable next button
    const nextBtn = document.getElementById('next-btn');
    nextBtn.disabled = false;
}

function selectDate(button) {
    const dateButtons = document.querySelectorAll('.date-btn');
    dateButtons.forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');
    
    bookingData.date = button.textContent;
}

function selectTimeSlot(slot) {
    if (slot.classList.contains('unavailable')) return;
    
    const timeSlots = document.querySelectorAll('.time-slot');
    timeSlots.forEach(s => s.classList.remove('selected'));
    slot.classList.add('selected');
    
    bookingData.timeSlot = slot.textContent;
    
    // Enable next button
    const nextBtn = document.getElementById('next-btn');
    nextBtn.disabled = false;
}

function nextStep() {
    if (validateCurrentStep()) {
        if (currentStep < 5) {
            currentStep++;
            updateBookingStep();
        }
    }
}

function previousStep() {
    if (currentStep > 1) {
        currentStep--;
        updateBookingStep();
    }
}

function updateBookingStep() {
    // Update step indicators
    const steps = document.querySelectorAll('.step');
    const formSteps = document.querySelectorAll('.form-step');
    
    steps.forEach((step, index) => {
        step.classList.remove('active', 'completed');
        if (index + 1 < currentStep) {
            step.classList.add('completed');
        } else if (index + 1 === currentStep) {
            step.classList.add('active');
        }
    });
    
    // Show current form step
    formSteps.forEach((step, index) => {
        step.classList.remove('active');
        if (index + 1 === currentStep) {
            step.classList.add('active');
        }
    });
    
    // Update navigation buttons
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    
    prevBtn.style.display = currentStep === 1 ? 'none' : 'inline-flex';
    
    if (currentStep === 5) {
        nextBtn.style.display = 'none';
        generateBookingConfirmation();
    } else {
        nextBtn.style.display = 'inline-flex';
        nextBtn.textContent = currentStep === 4 ? 'Confirm Booking' : 'Next';
        nextBtn.disabled = !validateCurrentStep();
    }
}

function validateCurrentStep() {
    switch (currentStep) {
        case 1:
            return bookingData.category !== '';
        case 2:
            return bookingData.department !== '';
        case 3:
            return bookingData.timeSlot !== '';
        case 4:
            const name = document.getElementById('patient-name');
            const serviceNumber = document.getElementById('service-number');
            const phone = document.getElementById('phone');
            const age = document.getElementById('age');
            
            return name.value && serviceNumber.value && phone.value && age.value;
        case 5:
            return true;
        default:
            return false;
    }
}

function generateBookingConfirmation() {
    // Get form data
    const name = document.getElementById('patient-name').value;
    const serviceNumber = document.getElementById('service-number').value;
    const phone = document.getElementById('phone').value;
    const age = document.getElementById('age').value;
    
    // Store patient info
    bookingData.patientInfo = { name, serviceNumber, phone, age };
    
    // Update confirmation display
    document.getElementById('confirm-name').textContent = name;
    document.getElementById('confirm-category').textContent = bookingData.category;
    document.getElementById('confirm-department').textContent = bookingData.department;
    document.getElementById('confirm-datetime').textContent = `${bookingData.date}, ${bookingData.timeSlot}`;
    
    // Generate token number
    const tokenNumber = `T-${Math.floor(Math.random() * 1000) + 100}`;
    document.getElementById('token-number').textContent = tokenNumber;
    
    console.log('Booking confirmed:', bookingData);
}

function resetBookingForm() {
    currentStep = 1;
    bookingData = {
        category: '',
        department: '',
        date: '',
        timeSlot: '',
        patientInfo: {}
    };
    
    // Clear form inputs
    const inputs = document.querySelectorAll('#token-booking input, #token-booking select, #token-booking textarea');
    inputs.forEach(input => input.value = '');
    
    // Reset selections
    const selections = document.querySelectorAll('.selected');
    selections.forEach(item => item.classList.remove('selected'));
    
    // Reset active states
    const activeItems = document.querySelectorAll('.active');
    activeItems.forEach(item => {
        if (!item.classList.contains('section') && !item.classList.contains('nav-link')) {
            item.classList.remove('active');
        }
    });
    
    // Set first date as active
    const firstDateBtn = document.querySelector('.date-btn');
    if (firstDateBtn) firstDateBtn.classList.add('active');
    
    updateBookingStep();
}

// Card Renewal Functions
function showCardCheck() {
    hideAllCardSections();
    document.getElementById('card-check').style.display = 'block';
}

function showRenewalForm() {
    hideAllCardSections();
    document.getElementById('renewal-form').style.display = 'block';
}

function showDownloadCard() {
    hideAllCardSections();
    document.getElementById('download-card').style.display = 'block';
}

function hideAllCardSections() {
    const sections = document.querySelectorAll('.card-section');
    sections.forEach(section => {
        section.style.display = 'none';
    });
}

function checkCardStatus() {
    const serviceNumber = document.getElementById('check-service-number').value;
    const dob = document.getElementById('check-dob').value;
    
    if (!serviceNumber || !dob) {
        alert('Please fill in all required fields');
        return;
    }
    
    // Simulate API call
    setTimeout(() => {
        document.getElementById('status-result').style.display = 'block';
    }, 1000);
}

// Emergency Functions
function callEmergency() {
    if (confirm('This will call emergency services (1911). Continue?')) {
        // In a real app, this would trigger an actual call
        alert('Calling Emergency Services: 1911\nStay on the line...');
        console.log('Emergency call initiated');
    }
}

function bookEmergencySlot() {
    // Show emergency booking form or redirect
    showSection('token-booking');
    // Pre-select emergency category
    bookingData.category = 'emergency';
    console.log('Emergency booking initiated');
}

function requestAmbulance() {
    const confirmation = confirm('Request ambulance service?\nAn ambulance will be dispatched to your location.');
    if (confirmation) {
        alert('Ambulance requested successfully!\nETA: 8-12 minutes\nContact: 1911');
        console.log('Ambulance requested');
    }
}

// CSD Canteen Functions
function showCategory(categoryId) {
    // Hide all categories
    const categories = document.querySelectorAll('.product-category');
    categories.forEach(category => {
        category.style.display = 'none';
    });
    
    // Show selected category
    const targetCategory = document.getElementById(categoryId);
    if (targetCategory) {
        targetCategory.style.display = 'block';
    }
    
    // Update active button
    const categoryBtns = document.querySelectorAll('.category-btn');
    categoryBtns.forEach(btn => btn.classList.remove('active'));
    
    const activeBtn = document.querySelector(`[onclick="showCategory('${categoryId}')"]`);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }
}

// Shopping Cart (Basic Implementation)
let cart = [];

function addToCart(productName, price) {
    const existingItem = cart.find(item => item.name === productName);
    
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            name: productName,
            price: price,
            quantity: 1
        });
    }
    saveCartToStorage();
    updateCartDisplay();
    updateCartCount();
    renderCartPage();
    showNotification('Added to cart', 'success');
}

function updateCartDisplay() {
    const cartItems = document.getElementById('cart-items');
    const cartSummary = document.getElementById('cart-summary');
    
    if (cart.length === 0) {
        cartItems.innerHTML = '<p class="empty-cart">Your cart is empty</p>';
        cartSummary.style.display = 'none';
        return;
    }
    
    // Display cart items
    cartItems.innerHTML = cart.map(item => `
        <div class="cart-item">
            <span>${item.name} x ${item.quantity}</span>
            <span>₹${(item.price * item.quantity).toLocaleString()}</span>
        </div>
    `).join('');
    
    // Calculate totals
    const subtotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
    const discount = Math.floor(subtotal * 0.15); // 15% CSD discount
    const total = subtotal - discount;
    
    // Update summary
    document.getElementById('cart-subtotal').textContent = `₹${subtotal.toLocaleString()}`;
    document.getElementById('cart-discount').textContent = `-₹${discount.toLocaleString()}`;
    document.getElementById('cart-total').textContent = `₹${total.toLocaleString()}`;
    
    cartSummary.style.display = 'block';
}

function updateCartCount() {
    const badge = document.getElementById('cart-count');
    if (!badge) return;
    const count = cart.reduce((n, i) => n + i.quantity, 0);
    badge.textContent = count;
}

function saveCartToStorage() {
    localStorage.setItem('cart', JSON.stringify(cart));
}

function loadCartFromStorage() {
    try {
        const stored = JSON.parse(localStorage.getItem('cart') || '[]');
        if (Array.isArray(stored)) cart = stored;
    } catch {}
    updateCartDisplay();
    updateCartCount();
}

function changeItemQuantity(name, delta) {
    const item = cart.find(i => i.name === name);
    if (!item) return;
    item.quantity += delta;
    if (item.quantity <= 0) {
        const idx = cart.findIndex(i => i.name === name);
        if (idx >= 0) cart.splice(idx, 1);
    }
    saveCartToStorage();
    updateCartDisplay();
    updateCartCount();
    renderCartPage();
}

function removeItem(name) {
    cart = cart.filter(i => i.name !== name);
    saveCartToStorage();
    updateCartDisplay();
    updateCartCount();
    renderCartPage();
}

function renderCartPage() {
    const container = document.getElementById('cart-page-items');
    if (!container) return;
    if (cart.length === 0) {
        container.innerHTML = '<p class="empty-cart">Your cart is empty</p>';
        document.getElementById('cart-page-subtotal').textContent = '₹0';
        document.getElementById('cart-page-discount').textContent = '-₹0';
        document.getElementById('cart-page-total').textContent = '₹0';
        return;
    }
    container.innerHTML = cart.map(item => `
        <div class="cart-item-row">
            <div>${item.name}</div>
            <div class="qty-controls">
                <button class="qty-btn" onclick="changeItemQuantity('${item.name.replace(/'/g,"\\'")}', -1)">-</button>
                <span>${item.quantity}</span>
                <button class="qty-btn" onclick="changeItemQuantity('${item.name.replace(/'/g,"\\'")}', 1)">+</button>
            </div>
            <div>₹${(item.price * item.quantity).toLocaleString()}</div>
            <button class="remove-btn" onclick="removeItem('${item.name.replace(/'/g,"\\'")}')">Remove</button>
        </div>
    `).join('');
    const subtotal = cart.reduce((t,i)=>t+i.price*i.quantity,0);
    const discount = Math.floor(subtotal*0.15);
    const total = subtotal - discount;
    document.getElementById('cart-page-subtotal').textContent = `₹${subtotal.toLocaleString()}`;
    document.getElementById('cart-page-discount').textContent = `-₹${discount.toLocaleString()}`;
    document.getElementById('cart-page-total').textContent = `₹${total.toLocaleString()}`;
    const checkoutBtn = document.getElementById('checkout-btn');
    if (checkoutBtn && !checkoutBtn._bound) {
        checkoutBtn.addEventListener('click', ()=>{
            showNotification('Checkout will be handled by backend', 'info');
        });
        checkoutBtn._bound = true;
    }
}

// ========== Grievances ==========
function setupGrievanceForm() {
    const form = document.getElementById('grievance-form');
    if (!form) return;
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        const subject = document.getElementById('grievance-subject').value.trim();
        const category = document.getElementById('grievance-category').value;
        const priority = document.getElementById('grievance-priority').value;
        const description = document.getElementById('grievance-description').value.trim();
        if (!subject || !category || !priority || !description) return;
        const sessionUser = JSON.parse(localStorage.getItem('sessionUser') || 'null');
        // Try backend first
        const created = await safeFetchJson(`${NODE_API_BASE}/api/grievances`, {
            method: 'POST',
            body: JSON.stringify({ subject, category, priority, description, owner: sessionUser ? sessionUser.email : 'guest' })
        });
        if (!created) {
            // Fallback to local
            const ticket = {
                id: 'T' + Date.now().toString(36).toUpperCase(),
                subject, category, priority, description,
                status: 'Open',
                createdAt: new Date().toISOString(),
                owner: sessionUser ? sessionUser.email : 'guest'
            };
            const tickets = JSON.parse(localStorage.getItem('tickets') || '[]');
            tickets.unshift(ticket);
            localStorage.setItem('tickets', JSON.stringify(tickets));
        }
        renderTickets();
        form.reset();
        showNotification('Complaint submitted', 'success');
    });
    renderTickets();
}

function renderTickets() {
    const container = document.getElementById('tickets-container');
    if (!container) return;
    const sessionUser = JSON.parse(localStorage.getItem('sessionUser') || 'null');
    let tickets = [];
    // Try backend first
    // If not logged in, show all tickets (local behavior shows none for guest)
    // For privacy, when logged in query by email
    const endpoint = sessionUser ? `${NODE_API_BASE}/api/grievances?email=${encodeURIComponent(sessionUser.email)}` : `${NODE_API_BASE}/api/grievances`;
    // Note: safeFetchJson returns null on failure
    // eslint-disable-next-line no-undef
    const fetchTickets = typeof fetch !== 'undefined' ? null : null;
    // Use safeFetchJson regardless
    // (Declaring a dummy to satisfy linters in environments where fetch is not defined)
    // Fetch
    //
    // Attempt API
    //
    //
    
    // We cannot await at top-level; wrap in async IIFE style replaced by then-chain here
    // Instead, synchronous path: fallback immediately
    // Then schedule an async update
    tickets = JSON.parse(localStorage.getItem('tickets') || '[]');
    if (sessionUser) tickets = tickets.filter(t => t.owner === sessionUser.email);
    (async () => {
        const apiTickets = await safeFetchJson(endpoint);
        if (apiTickets && Array.isArray(apiTickets)) {
            tickets = apiTickets;
            container.innerHTML = tickets.length === 0 ? '<p class="empty-state">No tickets yet</p>' : tickets.map(t => `
                <div class="ticket-card">
                    <div>
                        <strong>${t.subject}</strong>
                        <div class="ticket-meta">#${t.id} • ${t.category} • <span class="status-chip">${t.status}</span></div>
                        <div class="ticket-meta">${new Date(t.createdAt).toLocaleString()}</div>
                    </div>
                    <div><span class="priority-badge priority-${t.priority}">${t.priority}</span></div>
                </div>
            `).join('');
            return;
        }
    })();
    if (tickets.length === 0) { container.innerHTML = '<p class="empty-state">No tickets yet</p>'; return; }
    container.innerHTML = tickets.map(t => `
        <div class="ticket-card">
            <div>
                <strong>${t.subject}</strong>
                <div class="ticket-meta">#${t.id} • ${t.category} • <span class="status-chip">${t.status}</span></div>
                <div class="ticket-meta">${new Date(t.createdAt).toLocaleString()}</div>
            </div>
            <div><span class="priority-badge priority-${t.priority}">${t.priority}</span></div>
        </div>
    `).join('');
}

// ========== Schemes ==========
const ALL_SCHEMES = [
    { name: 'Education Scholarship A', tags: ['education','family'], description: 'Scholarship for soldiers’ children' },
    { name: 'Medical Assistance B', tags: ['medical','veteran'], description: 'Medical support for veterans' },
    { name: 'Housing Subsidy C', tags: ['housing','soldier'], description: 'Affordable housing scheme' },
    { name: 'Pension Support D', tags: ['pension','veteran'], description: 'Enhanced pension support' },
];

function renderSchemes() {
    const list = document.getElementById('schemes-list');
    const suggestions = document.getElementById('schemes-suggestions');
    (async () => {
        // Fetch master list from Node API; fallback to local
        const remoteList = await safeFetchJson(`${NODE_API_BASE}/api/schemes`);
        const listData = Array.isArray(remoteList) && remoteList.length ? remoteList.map(s => ({...s, description: s.description || ''})) : ALL_SCHEMES;
        if (list) {
            list.innerHTML = listData.map(s => `
                <div class="scheme-card">
                    <div><strong>${s.name}</strong></div>
                    <div>${s.description || ''}</div>
                    <div class="scheme-tags">${(s.tags||[]).map(t=>`<span class="scheme-tag">${t}</span>`).join('')}</div>
                </div>
            `).join('');
        }
        if (suggestions) {
            const sessionUser = JSON.parse(localStorage.getItem('sessionUser') || 'null');
            if (!sessionUser) { suggestions.innerHTML = ''; return; }
            const role = sessionUser.role;
            // Try Python API first
            const recs = await safeFetchJson(`${PY_API_BASE}/api/recommendations?role=${encodeURIComponent(role)}`);
            const relevant = Array.isArray(recs) && recs.length ? recs : listData.filter(s => (s.tags||[]).includes(role));
            suggestions.innerHTML = relevant.length ? relevant.map(s => `
                <div class="scheme-card">
                    <div><strong>${s.name}</strong></div>
                    <div>${s.description || ''}</div>
                </div>
            `).join('') : '<p>No personalized suggestions yet.</p>';
        }
    })();
}

// Form Validation Setup
function setupFormValidation() {
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            validateForm(this);
        });
    });
    
    // Real-time validation for inputs
    const inputs = document.querySelectorAll('input[required], select[required], textarea[required]');
    inputs.forEach(input => {
        input.addEventListener('blur', function() {
            validateField(this);
        });
    });
}

function validateForm(form) {
    let isValid = true;
    const requiredFields = form.querySelectorAll('[required]');
    
    requiredFields.forEach(field => {
        if (!validateField(field)) {
            isValid = false;
        }
    });
    
    return isValid;
}

function validateField(field) {
    const value = field.value.trim();
    let isValid = true;
    let message = '';
    
    // Remove existing error styling
    field.classList.remove('error');
    const existingError = field.parentNode.querySelector('.error-message');
    if (existingError) {
        existingError.remove();
    }
    
    // Required field validation
    if (field.hasAttribute('required') && !value) {
        isValid = false;
        message = 'This field is required';
    }
    
    // Email validation
    if (field.type === 'email' && value) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
            isValid = false;
            message = 'Please enter a valid email address';
        }
    }
    
    // Phone validation
    if (field.type === 'tel' && value) {
        const phoneRegex = /^[6-9]\d{9}$/;
        if (!phoneRegex.test(value)) {
            isValid = false;
            message = 'Please enter a valid 10-digit mobile number';
        }
    }
    
    // Service number validation
    if (field.id === 'service-number' && value) {
        const serviceRegex = /^[A-Z]{1,3}-?\d{4,6}$/;
        if (!serviceRegex.test(value)) {
            isValid = false;
            message = 'Please enter a valid service number (e.g., IC-12345)';
        }
    }
    
    // Show error if validation fails
    if (!isValid) {
        field.classList.add('error');
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.style.color = 'var(--danger-color)';
        errorDiv.style.fontSize = '0.875rem';
        errorDiv.style.marginTop = '0.25rem';
        errorDiv.textContent = message;
        field.parentNode.appendChild(errorDiv);
    }
    
    return isValid;
}

// Utility Functions
function formatDate(date) {
    return new Date(date).toLocaleDateString('en-IN', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function formatTime(time) {
    return new Date(`2024-01-01 ${time}`).toLocaleTimeString('en-IN', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 2rem;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;
    
    // Set background color based on type
    switch (type) {
        case 'success':
            notification.style.background = 'var(--success-color)';
            break;
        case 'error':
            notification.style.background = 'var(--danger-color)';
            break;
        case 'warning':
            notification.style.background = 'var(--warning-color)';
            break;
        default:
            notification.style.background = 'var(--info-color)';
    }
    
    notification.textContent = message;
    document.body.appendChild(notification);
    
    // Remove notification after 5 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 5000);
}

// Add CSS animations for notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    .error {
        border-color: var(--danger-color) !important;
    }
`;
document.head.appendChild(style);

// Performance monitoring
function logPerformance() {
    if (typeof performance !== 'undefined') {
        const perfData = performance.getEntriesByType('navigation')[0];
        console.log('Page Load Performance:', {
            domContentLoaded: perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart,
            loadComplete: perfData.loadEventEnd - perfData.loadEventStart,
            totalTime: perfData.loadEventEnd - perfData.navigationStart
        });
    }
}

// Log performance after page load
window.addEventListener('load', logPerformance);

console.log('Sainik Shifa Setu - Script loaded successfully');
console.log('Digital Health Bridge for Soldiers - Ready to serve');
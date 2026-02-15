
// --- Constants ---
const DEFAULT_CODE = "MOM-MILK-2024";
const STORAGE_KEY = "milk_tracker_data";
const CONFIG_KEY = "milk_tracker_config";
const PRICE_KEY = "milk_tracker_price";
const THEME_KEY = "milk_tracker_theme";

// --- State ---
let state = {
    data: {}, // { "YYYY-MM-DD": quantity }
    price: 60,
    currentDate: (() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    })(),
    isDark: false,
    cloudConfig: null,
    isAuthenticated: false
};

// --- Firebase Modules (Loaded Dynamically) ---
let firebaseApp = null;
let firebaseFirestore = null;
let firebaseAuth = null;
let db = null;
let auth = null;

// --- UI Elements ---
const loginScreen = document.getElementById('login-screen');
const dashboard = document.getElementById('dashboard');
const secretCodeInput = document.getElementById('secret-code-input');
const loginBtn = document.getElementById('login-btn');
const loginError = document.getElementById('login-error');

const dateInput = document.getElementById('entry-date');
const qtyDisplay = document.getElementById('qty-display');
const decreaseBtn = document.getElementById('decrease-qty');
const increaseBtn = document.getElementById('increase-qty');
const saveBtn = document.getElementById('save-entry-btn');

const totalLitersEl = document.getElementById('total-liters');
const totalCostEl = document.getElementById('total-cost');
const historyListEl = document.getElementById('history-list');
const currentMonthDisplay = document.getElementById('current-month-display');

const settingsBtn = document.getElementById('settings-btn');
const settingsModal = document.getElementById('settings-modal');
const closeSettingsBtn = document.getElementById('close-settings');
const priceInput = document.getElementById('price-setting');
const themeToggle = document.getElementById('theme-toggle');
const firebaseConfigInput = document.getElementById('firebase-config-input');
const saveCloudConfigBtn = document.getElementById('save-cloud-config');
const cloudStatusEl = document.getElementById('cloud-status');
const logoutBtn = document.getElementById('logout-btn');
const whatsappFab = document.getElementById('whatsapp-fab');

// Backup/Restore Elements
const backupBtn = document.getElementById('backup-btn');
const restoreBtn = document.getElementById('restore-btn');
const restoreInput = document.getElementById('restore-input');

// --- Initialization ---
function init() {
    // Load local settings
    const savedPrice = localStorage.getItem(PRICE_KEY);
    if (savedPrice) state.price = parseFloat(savedPrice);

    const savedTheme = localStorage.getItem(THEME_KEY);
    if (savedTheme === 'dark') {
        state.isDark = true;
        document.body.setAttribute('data-theme', 'dark');
        themeToggle.checked = true;
    }

    const savedConfig = localStorage.getItem(CONFIG_KEY);
    if (savedConfig) {
        try {
            state.cloudConfig = JSON.parse(savedConfig);
            firebaseConfigInput.value = savedConfig;
            // Attempt to init Firebase, but don't block UI if offline
            initFirebase(state.cloudConfig).catch(e => console.log("Offline mode (Firebase skipped)"));
        } catch (e) {
            console.error("Invalid cloud config", e);
        }
    }

    // Set today's date
    dateInput.value = state.currentDate;
    priceInput.value = state.price;

    // Render current month
    renderDate(new Date());
}

async function loadFirebaseModules() {
    if (firebaseApp && firebaseFirestore && firebaseAuth) return;

    try {
        firebaseApp = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js");
        firebaseFirestore = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
        firebaseAuth = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js");
        return true;
    } catch (e) {
        console.warn("Failed to load Firebase SDKs (Offline?)", e);
        return false;
    }
}

async function initFirebase(config) {
    cloudStatusEl.innerText = "Status: Connecting to Cloud...";
    cloudStatusEl.style.color = "var(--accent-color)";

    const loaded = await loadFirebaseModules();
    if (!loaded) {
        cloudStatusEl.innerText = "Status: Offline (Modules not loaded)";
        cloudStatusEl.style.color = "var(--secondary-text)";
        return false;
    }

    try {
        const app = firebaseApp.initializeApp(config);
        db = firebaseFirestore.getFirestore(app);
        auth = firebaseAuth.getAuth(app);
        console.log("Firebase initialized");
        return true;
    } catch (e) {
        console.error("Firebase init error:", e);
        cloudStatusEl.innerText = "Status: Error connecting (Check Config)";
        cloudStatusEl.style.color = "var(--danger-color)";
        return false;
    }
}

// --- Auth Logic ---
loginBtn.addEventListener('click', async () => {
    const code = secretCodeInput.value;
    if (code === DEFAULT_CODE) {
        // Local unlock
        state.isAuthenticated = true;
        showDashboard();
        loadData();
    } else if (db && auth) {
        // Try Firebase Auth
        try {
            await firebaseAuth.signInWithEmailAndPassword(auth, "mom@milktracker.app", code);
            state.isAuthenticated = true;
            showDashboard();
            loadData(); // Will trigger cloud sync
        } catch (e) {
            console.error(e);
            loginError.style.display = 'block';
            loginError.innerText = "Incorrect code (Cloud Auth Failed)";
        }
    } else {
        loginError.style.display = 'block';
        loginError.innerText = "Incorrect code!";
    }
});

logoutBtn.addEventListener('click', () => {
    state.isAuthenticated = false;
    loginScreen.style.display = 'flex';
    dashboard.classList.add('hidden');
    secretCodeInput.value = '';
    if (auth) auth.signOut();
});

function showDashboard() {
    loginScreen.style.display = 'none';
    dashboard.classList.remove('hidden');
    renderSummary();
    renderHistory();
}

// --- Data Logic ---
async function loadData() {
    // 1. Load from LocalStorage first
    const localData = localStorage.getItem(STORAGE_KEY);
    if (localData) {
        state.data = JSON.parse(localData);
    }

    // 2. If Cloud enabled, sync
    if (db && auth && auth.currentUser) {
        cloudStatusEl.innerText = "Status: Syncing...";
        try {
            const docRef = firebaseFirestore.doc(db, "users", "mom");
            const docSnap = await firebaseFirestore.getDoc(docRef);
            if (docSnap.exists()) {
                const cloudData = docSnap.data().milkData || {};
                state.data = { ...state.data, ...cloudData };
                saveDataLocal(); // Update local with cloud data
            }
            cloudStatusEl.innerText = "Status: Cloud Synced ✅";
            cloudStatusEl.style.color = "var(--success-color)";
            renderSummary();
            renderHistory();
        } catch (e) {
            console.error("Sync error", e);
            cloudStatusEl.innerText = "Status: Sync Error ⚠️";
        }
    }
}

async function saveData(date, qty) {
    state.data[date] = qty;
    saveDataLocal();

    if (db && auth && auth.currentUser) {
        try {
            const docRef = firebaseFirestore.doc(db, "users", "mom");
            await firebaseFirestore.setDoc(docRef, { milkData: state.data }, { merge: true });
            cloudStatusEl.innerText = "Status: Saved to Cloud ✅";
        } catch (e) {
            console.error("Save error", e);
            cloudStatusEl.innerText = "Status: Save Error ⚠️";
        }
    }
}

function saveDataLocal() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.data));
    renderSummary();
    renderHistory();
}

function deleteEntry(date) {
    if (confirm(`Delete entry for ${date}?`)) {
        delete state.data[date];
        saveDataLocal();

        if (db && auth && auth.currentUser) {
             const docRef = firebaseFirestore.doc(db, "users", "mom");
             firebaseFirestore.setDoc(docRef, { milkData: state.data }, { merge: true });
        }
    }
}

// --- UI Logic ---
let currentQty = 1.0;

function updateQtyDisplay() {
    qtyDisplay.innerText = currentQty.toFixed(1);
}

decreaseBtn.addEventListener('click', () => {
    if (currentQty > 0.5) currentQty -= 0.5;
    updateQtyDisplay();
}
);

increaseBtn.addEventListener('click', () => {
    currentQty += 0.5;
    updateQtyDisplay();
});

saveBtn.addEventListener('click', () => {
    const date = dateInput.value;
    if (!date) return alert("Please select a date");
    saveData(date, currentQty);
    alert("Saved!");
});

function renderDate(date) {
    const options = { month: 'long', year: 'numeric' };
    currentMonthDisplay.innerText = date.toLocaleDateString('en-US', options);
}

function getMonthData() {
    const selectedDate = new Date(dateInput.value);
    const [year, month] = dateInput.value.split('-');
    const prefix = `${year}-${month}`;

    const entries = Object.entries(state.data).filter(([k, v]) => k.startsWith(prefix));
    return entries.sort((a, b) => b[0].localeCompare(a[0])); // Descending date
}

function renderSummary() {
    const entries = getMonthData();
    const totalLit = entries.reduce((sum, [date, qty]) => sum + qty, 0);
    const totalCost = totalLit * state.price;

    totalLitersEl.innerText = `${totalLit}L`;
    totalCostEl.innerText = `₹${totalCost.toFixed(0)}`;
}

function renderHistory() {
    const entries = getMonthData();
    historyListEl.innerHTML = '';
    entries.forEach(([date, qty]) => {
        const item = document.createElement('div');
        item.className = 'history-item';

        // Use textContent/innerText for security (prevent XSS)
        const dateSpan = document.createElement('span');
        dateSpan.className = 'history-date';
        dateSpan.textContent = new Date(date + 'T00:00:00').toLocaleDateString();

        const amountSpan = document.createElement('span');
        amountSpan.className = 'history-amount';
        amountSpan.textContent = `${qty}L`;

        item.appendChild(dateSpan);
        item.appendChild(amountSpan);

        item.addEventListener('click', () => deleteEntry(date));
        historyListEl.appendChild(item);
    });
}

dateInput.addEventListener('change', () => {
    renderDate(new Date(dateInput.value + 'T00:00:00'));
    renderSummary();
    renderHistory();
});

// --- Settings Logic ---
settingsBtn.addEventListener('click', () => settingsModal.classList.add('active'));
closeSettingsBtn.addEventListener('click', () => settingsModal.classList.remove('active'));

priceInput.addEventListener('change', (e) => {
    state.price = parseFloat(e.target.value);
    localStorage.setItem(PRICE_KEY, state.price);
    renderSummary();
});

themeToggle.addEventListener('change', (e) => {
    state.isDark = e.target.checked;
    document.body.setAttribute('data-theme', state.isDark ? 'dark' : 'light');
    localStorage.setItem(THEME_KEY, state.isDark ? 'dark' : 'light');
});

saveCloudConfigBtn.addEventListener('click', () => {
    try {
        const config = JSON.parse(firebaseConfigInput.value);
        state.cloudConfig = config;
        localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
        alert("Config saved! App will reload.");
        window.location.reload();
    } catch (e) {
        alert("Invalid JSON!");
    }
});

// --- Backup & Restore Logic ---
backupBtn.addEventListener('click', () => {
    const dataStr = JSON.stringify(state.data, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `milk-tracker-backup-${state.currentDate}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
});

restoreBtn.addEventListener('click', () => {
    restoreInput.click();
});

restoreInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const importedData = JSON.parse(event.target.result);
            if (confirm("This will overwrite your current local data. Are you sure?")) {
                state.data = importedData;
                saveDataLocal(); // Saves to LS and updates UI
                alert("Data restored successfully!");
            }
        } catch (err) {
            alert("Error reading file. Is it a valid JSON?");
            console.error(err);
        }
    };
    reader.readAsText(file);
});


// --- WhatsApp Export ---
whatsappFab.addEventListener('click', () => {
    const entries = getMonthData();
    const totalLit = entries.reduce((sum, [date, qty]) => sum + qty, 0);
    const totalCost = totalLit * state.price;
    const [year, month] = dateInput.value.split('-');
    const monthName = new Date(dateInput.value).toLocaleString('default', { month: 'long' });

    const text = `*Milk Report for ${monthName} ${year}* 🥛%0A` +
                    `Total: ${totalLit} Liters%0A` +
                    `Cost: ₹${totalCost}%0A%0A` +
                    `Generated by Milk Tracker App`;

    window.open(`https://wa.me/?text=${text}`, '_blank');
});

// Run Init
init();

import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';

// --- Constants ---
const DEFAULT_CODE = "MOM-MILK-2024";
const STORAGE_KEY = "milk_tracker_data";
const PRICE_KEY = "milk_tracker_price";
const THEME_KEY = "milk_tracker_theme";
const DATA_FOLDER = "MilkTracker";
const DATA_FILE = "data.json";

// --- State ---
let state = {
    data: {}, // { "YYYY-MM-DD": quantity }
    price: 60,
    currentDate: (() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    })(),
    isDark: false,
    isAuthenticated: false
};

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
const historyListEl = document.getElementById('history-list'); // In Tab History
const currentMonthDisplay = document.getElementById('current-month-display');

const settingsBtn = document.getElementById('settings-btn');
const settingsModal = document.getElementById('settings-modal');
const closeSettingsBtn = document.getElementById('close-settings');
const priceInput = document.getElementById('price-setting');
const themeToggle = document.getElementById('theme-toggle');
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

    // Set today's date
    dateInput.value = state.currentDate;
    priceInput.value = state.price;

    // Render current month
    renderDate(new Date());
}

// --- Auth Logic ---
loginBtn.addEventListener('click', async () => {
    const code = secretCodeInput.value;
    if (code === DEFAULT_CODE) {
        // Local unlock
        state.isAuthenticated = true;
        showDashboard();
        await loadData();
        // Hide keyboard
        secretCodeInput.blur();
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
});

function showDashboard() {
    loginScreen.style.display = 'none';
    dashboard.classList.remove('hidden');
    renderSummary();
    renderFullHistory();
}

// --- Filesystem Logic ---
async function loadData() {
    try {
        // Ensure folder exists first
        try {
            await Filesystem.mkdir({
                path: DATA_FOLDER,
                directory: Directory.Documents,
                recursive: true
            });
        } catch (e) {
            // Ignore if exists
        }

        const result = await Filesystem.readFile({
            path: `${DATA_FOLDER}/${DATA_FILE}`,
            directory: Directory.Documents,
            encoding: Encoding.UTF8,
        });
        state.data = JSON.parse(result.data);
    } catch (e) {
        console.log("FS Load failed, trying LS", e);
        // Fallback
        const localData = localStorage.getItem(STORAGE_KEY);
        if (localData) {
            state.data = JSON.parse(localData);
            saveDataToDisk();
        }
    }
    renderSummary();
    renderFullHistory();
}

async function saveDataToDisk() {
    try {
        await Filesystem.writeFile({
            path: `${DATA_FOLDER}/${DATA_FILE}`,
            data: JSON.stringify(state.data),
            directory: Directory.Documents,
            encoding: Encoding.UTF8,
        });
    } catch (e) {
        console.error("FS Save failed", e);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state.data));
    }
}

async function saveData(date, qty) {
    state.data[date] = qty;
    await saveDataToDisk();
    renderSummary();
    renderFullHistory();
}

async function deleteEntry(date) {
    if (confirm(`Delete entry for ${date}?`)) {
        delete state.data[date];
        await saveDataToDisk();
        renderSummary();
        renderFullHistory();
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

saveBtn.addEventListener('click', async () => {
    const date = dateInput.value;
    if (!date) return alert("Please select a date");
    await saveData(date, currentQty);
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

function renderFullHistory() {
    // Show ALL history
    const entries = Object.entries(state.data).sort((a, b) => b[0].localeCompare(a[0]));
    historyListEl.innerHTML = '';

    entries.forEach(([date, qty]) => {
        const item = document.createElement('div');
        item.className = 'history-item';
        item.style.alignItems = 'center';

        const dateSpan = document.createElement('span');
        dateSpan.className = 'history-date';
        dateSpan.textContent = new Date(date + 'T00:00:00').toLocaleDateString();

        const rightDiv = document.createElement('div');
        rightDiv.style.display = 'flex';
        rightDiv.style.alignItems = 'center';
        rightDiv.style.gap = '10px';

        const amountSpan = document.createElement('span');
        amountSpan.className = 'history-amount';
        amountSpan.textContent = `${qty}L`;

        const deleteBtn = document.createElement('button');
        deleteBtn.innerHTML = '🗑️';
        deleteBtn.className = 'icon-btn';
        deleteBtn.style.padding = '4px';
        deleteBtn.style.fontSize = '16px';
        deleteBtn.onclick = (e) => {
             e.stopPropagation();
             deleteEntry(date);
        };

        rightDiv.appendChild(amountSpan);
        rightDiv.appendChild(deleteBtn);

        item.appendChild(dateSpan);
        item.appendChild(rightDiv);

        historyListEl.appendChild(item);
    });
}

dateInput.addEventListener('change', () => {
    renderDate(new Date(dateInput.value + 'T00:00:00'));
    renderSummary();
    // Don't re-render full history here
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
    reader.onload = async (event) => {
        try {
            const importedData = JSON.parse(event.target.result);
            if (confirm("This will overwrite your current local data. Are you sure?")) {
                state.data = importedData;
                await saveDataToDisk();
                alert("Data restored successfully!");
                renderSummary();
                renderFullHistory();
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

// --- Tabs Logic ---
const navItems = document.querySelectorAll('.nav-item');
const tabContents = document.querySelectorAll('.tab-content');

navItems.forEach(item => {
    item.addEventListener('click', () => {
        const targetId = item.getAttribute('data-target');

        // Update Nav
        navItems.forEach(nav => nav.classList.remove('active'));
        item.classList.add('active');

        // Update Content
        tabContents.forEach(tab => {
            if (tab.id === targetId) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });

        // Trigger renders
        if (targetId === 'tab-analytics') renderAnalytics();
    });
});

function renderAnalytics() {
    const entries = getMonthData(); // Returns sorted by date desc
    // Sort by date ASC for the graph
    const sortedEntries = [...entries].sort((a, b) => a[0].localeCompare(b[0]));

    const milkContainer = document.getElementById('graph-milk');
    const costContainer = document.getElementById('graph-cost');

    milkContainer.innerHTML = '';
    costContainer.innerHTML = '';

    if (sortedEntries.length === 0) {
        milkContainer.innerHTML = '<p style="font-size: 12px; margin: auto; color: var(--secondary-text);">No data for this month</p>';
        costContainer.innerHTML = '<p style="font-size: 12px; margin: auto; color: var(--secondary-text);">No data for this month</p>';
        return;
    }

    // Determine max values
    const maxMilk = Math.max(...sortedEntries.map(e => e[1])) || 1;
    const maxCost = maxMilk * state.price;
    const GRAPH_HEIGHT = 140; // Approx pixels for bars (container ~200px)

    sortedEntries.forEach(([date, qty]) => {
        const day = new Date(date).getDate();
        const cost = qty * state.price;

        // --- Milk Graph Item ---
        const milkWrapper = document.createElement('div');
        milkWrapper.style.display = 'flex';
        milkWrapper.style.flexDirection = 'column';
        milkWrapper.style.alignItems = 'center';
        milkWrapper.style.justifyContent = 'flex-end';
        milkWrapper.style.height = '100%';
        milkWrapper.style.minWidth = '24px'; // Spacing

        const milkBar = document.createElement('div');
        const milkH = (qty / maxMilk) * GRAPH_HEIGHT;
        milkBar.style.height = `${milkH}px`;
        milkBar.style.width = '12px';
        milkBar.style.background = 'var(--accent-color)';
        milkBar.style.borderRadius = '4px 4px 0 0';

        const milkLabel = document.createElement('div');
        milkLabel.innerText = day;
        milkLabel.style.fontSize = '9px';
        milkLabel.style.color = 'var(--secondary-text)';
        milkLabel.style.marginTop = '4px';

        milkWrapper.appendChild(milkBar);
        milkWrapper.appendChild(milkLabel);
        milkContainer.appendChild(milkWrapper);

        // --- Cost Graph Item ---
        const costWrapper = document.createElement('div');
        costWrapper.style.display = 'flex';
        costWrapper.style.flexDirection = 'column';
        costWrapper.style.alignItems = 'center';
        costWrapper.style.justifyContent = 'flex-end';
        costWrapper.style.height = '100%';
        costWrapper.style.minWidth = '24px';

        const costBar = document.createElement('div');
        const costH = (cost / maxCost) * GRAPH_HEIGHT;
        costBar.style.height = `${costH}px`;
        costBar.style.width = '12px';
        costBar.style.background = 'var(--success-color)';
        costBar.style.borderRadius = '4px 4px 0 0';

        const costLabel = document.createElement('div');
        costLabel.innerText = day;
        costLabel.style.fontSize = '9px';
        costLabel.style.color = 'var(--secondary-text)';
        costLabel.style.marginTop = '4px';

        costWrapper.appendChild(costBar);
        costWrapper.appendChild(costLabel);
        costContainer.appendChild(costWrapper);
    });
}

// Run Init
init();

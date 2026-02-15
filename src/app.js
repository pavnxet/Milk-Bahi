import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { LocalNotifications } from '@capacitor/local-notifications';

// --- Constants ---
const STORAGE_KEY = "milk_tracker_data";
const PRICE_COW_KEY = "milk_tracker_price_cow";
const PRICE_BUFFALO_KEY = "milk_tracker_price_buffalo";
const MONTHLY_TARGET_KEY = "milk_tracker_monthly_target";
const THEME_KEY = "milk_tracker_theme";
const REMINDER_ENABLED_KEY = "milk_tracker_reminder_enabled";
const REMINDER_TIME_KEY = "milk_tracker_reminder_time";
const DATA_FOLDER = "MilkTracker";
const DATA_FILE = "data.json";

// --- State ---
let state = {
    data: {}, // { "YYYY-MM-DD": { cow: float, buffalo: float } }
    cowPrice: 40,
    buffaloPrice: 55, // Default buffalo price
    monthlyTarget: 0,
    currentDate: (() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    })(),
    isDark: false,
    reminderEnabled: false,
    reminderTime: '08:00'
};

// --- UI Elements ---
const loginScreen = document.getElementById('login-screen');
const dashboard = document.getElementById('dashboard');
const secretCodeInput = document.getElementById('secret-code-input');
const loginBtn = document.getElementById('login-btn');
const loginError = document.getElementById('login-error');

const dateInput = document.getElementById('entry-date');
// Controls
const decCowBtn = document.getElementById('dec-cow');
const incCowBtn = document.getElementById('inc-cow');
const qtyCowDisplay = document.getElementById('qty-cow');

const decBuffBtn = document.getElementById('dec-buff');
const incBuffBtn = document.getElementById('inc-buff');
const qtyBuffDisplay = document.getElementById('qty-buff');

const entryNoteInput = document.getElementById('entry-note');
const saveBtn = document.getElementById('save-entry-btn');
const copyYesterdayBtn = document.getElementById('copy-yesterday-btn');

const totalCowEl = document.getElementById('total-cow');
const totalBuffaloEl = document.getElementById('total-buffalo');
const totalCostEl = document.getElementById('total-cost');
const goalSection = document.getElementById('goal-section');
const goalText = document.getElementById('goal-text');
const goalBar = document.getElementById('goal-bar');

const historyListEl = document.getElementById('history-list'); // In Tab History
const currentMonthDisplay = document.getElementById('current-month-display');

const settingsBtn = document.getElementById('settings-btn');
const settingsModal = document.getElementById('settings-modal');
const closeSettingsBtn = document.getElementById('close-settings');
const priceCowInput = document.getElementById('price-cow-setting');
const priceBuffaloInput = document.getElementById('price-buffalo-setting');
const monthlyTargetInput = document.getElementById('monthly-target-setting');
const themeToggle = document.getElementById('theme-toggle');
const reminderToggle = document.getElementById('reminder-toggle');
const reminderTimeInput = document.getElementById('reminder-time');
const whatsappFab = document.getElementById('whatsapp-fab');

// Backup/Restore Elements
const backupBtn = document.getElementById('backup-btn');
const restoreBtn = document.getElementById('restore-btn');
const restoreInput = document.getElementById('restore-input');

// --- Initialization ---
async function init() {
    // Load local settings
    const savedCowPrice = localStorage.getItem(PRICE_COW_KEY);
    if (savedCowPrice) state.cowPrice = parseFloat(savedCowPrice);

    const savedBuffaloPrice = localStorage.getItem(PRICE_BUFFALO_KEY);
    if (savedBuffaloPrice) state.buffaloPrice = parseFloat(savedBuffaloPrice);

    const savedTarget = localStorage.getItem(MONTHLY_TARGET_KEY);
    if (savedTarget) state.monthlyTarget = parseFloat(savedTarget);

    const savedTheme = localStorage.getItem(THEME_KEY);
    if (savedTheme === 'dark') {
        state.isDark = true;
        document.body.setAttribute('data-theme', 'dark');
        themeToggle.checked = true;
    }

    const savedReminder = localStorage.getItem(REMINDER_ENABLED_KEY);
    if (savedReminder === 'true') {
        state.reminderEnabled = true;
        reminderToggle.checked = true;
        reminderTimeInput.style.display = 'block';
    }

    const savedTime = localStorage.getItem(REMINDER_TIME_KEY);
    if (savedTime) {
        state.reminderTime = savedTime;
        reminderTimeInput.value = savedTime;
    }

    // Set today's date
    dateInput.value = state.currentDate;
    priceCowInput.value = state.cowPrice;
    priceBuffaloInput.value = state.buffaloPrice;
    if (state.monthlyTarget > 0) monthlyTargetInput.value = state.monthlyTarget;

    // Init Dashboard directly
    showDashboard();
    await loadData();
}

function showDashboard() {
    // Remove login logic
    if (loginScreen) loginScreen.style.display = 'none';
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

    // Migration Logic: Convert old number format to object format
    for (const [date, val] of Object.entries(state.data)) {
        if (typeof val === 'number') {
            state.data[date] = { cow: val, buffalo: 0 };
        }
    }

    // Load today's data if exists
    const today = dateInput.value;
    if (state.data[today]) {
        currentCow = state.data[today].cow || 0;
        currentBuff = state.data[today].buffalo || 0;
        if (state.data[today].note) entryNoteInput.value = state.data[today].note;
        updateDisplay();
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
let currentCow = 0.0;
let currentBuff = 0.0;

function updateDisplay() {
    qtyCowDisplay.innerText = currentCow.toFixed(1);
    qtyBuffDisplay.innerText = currentBuff.toFixed(1);
}

decCowBtn.addEventListener('click', () => { if (currentCow > 0) currentCow -= 0.5; updateDisplay(); });
incCowBtn.addEventListener('click', () => { currentCow += 0.5; updateDisplay(); });

decBuffBtn.addEventListener('click', () => { if (currentBuff > 0) currentBuff -= 0.5; updateDisplay(); });
incBuffBtn.addEventListener('click', () => { currentBuff += 0.5; updateDisplay(); });


saveBtn.addEventListener('click', async () => {
    const date = dateInput.value;
    if (!date) return alert("Please select a date");
    if (currentCow === 0 && currentBuff === 0) return alert("Please add some milk!");

    const note = entryNoteInput.value.trim();
    const entry = { cow: currentCow, buffalo: currentBuff };
    if (note) entry.note = note;

    await saveData(date, entry);
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

    let totalCow = 0;
    let totalBuff = 0;
    let totalCost = 0;

    entries.forEach(([date, val]) => {
        // val is { cow, buffalo } due to migration
        totalCow += val.cow || 0;
        totalBuff += val.buffalo || 0;
        totalCost += (val.cow || 0) * state.cowPrice;
        totalCost += (val.buffalo || 0) * state.buffaloPrice;
    });

    totalCowEl.innerText = `${totalCow}L`;
    totalBuffaloEl.innerText = `${totalBuff}L`;
    totalCostEl.innerText = `₹${totalCost.toFixed(0)}`;

    // Goal Logic
    if (state.monthlyTarget > 0) {
        goalSection.style.display = 'block';
        const totalMilk = totalCow + totalBuff;
        const percentage = Math.min((totalMilk / state.monthlyTarget) * 100, 100);

        goalText.innerText = `${totalMilk.toFixed(1)} / ${state.monthlyTarget} L`;
        goalBar.style.width = `${percentage}%`;

        // Change color if goal reached
        if (percentage >= 100) goalBar.style.background = 'var(--success-color)';
        else goalBar.style.background = 'var(--accent-color)';
    } else {
        goalSection.style.display = 'none';
    }
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

        const detailsDiv = document.createElement('div');
        detailsDiv.style.display = 'flex';
        detailsDiv.style.flexDirection = 'column';
        detailsDiv.style.alignItems = 'flex-end';

        const amountSpan = document.createElement('span');
        amountSpan.className = 'history-amount';
        const cowQty = qty.cow || 0;
        const buffQty = qty.buffalo || 0;

        let text = '';
        if (cowQty > 0) text += `🐄${cowQty}L `;
        if (buffQty > 0) text += `🐃${buffQty}L`;
        if (text === '') text = '0L';

        amountSpan.textContent = text;
        amountSpan.style.fontSize = '12px';
        detailsDiv.appendChild(amountSpan);

        if (qty.note) {
            const noteSpan = document.createElement('span');
            noteSpan.innerText = qty.note;
            noteSpan.style.fontSize = '10px';
            noteSpan.style.color = 'var(--secondary-text)';
            detailsDiv.appendChild(noteSpan);
        }

        const deleteBtn = document.createElement('button');
        deleteBtn.innerHTML = '🗑️';
        deleteBtn.className = 'icon-btn';
        deleteBtn.style.padding = '4px';
        deleteBtn.style.fontSize = '16px';
        deleteBtn.onclick = (e) => {
             e.stopPropagation();
             deleteEntry(date);
        };

        rightDiv.appendChild(detailsDiv);
        rightDiv.appendChild(deleteBtn);

        item.appendChild(dateSpan);
        item.appendChild(rightDiv);

        historyListEl.appendChild(item);
    });
}

dateInput.addEventListener('change', () => {
    const date = dateInput.value;
    renderDate(new Date(date + 'T00:00:00'));

    // Load data for this date
    if (state.data[date]) {
        const entry = state.data[date];
        currentCow = entry.cow || 0;
        currentBuff = entry.buffalo || 0;
        entryNoteInput.value = entry.note || '';
        copyYesterdayBtn.style.display = 'none';
    } else {
        currentCow = 0;
        currentBuff = 0;
        entryNoteInput.value = '';

        // Check yesterday
        const d = new Date(date);
        d.setDate(d.getDate() - 1);
        const yStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

        if (state.data[yStr]) {
            copyYesterdayBtn.style.display = 'block';
            copyYesterdayBtn.onclick = () => {
                const yEntry = state.data[yStr];
                currentCow = yEntry.cow || 0;
                currentBuff = yEntry.buffalo || 0;
                // Don't copy note
                entryNoteInput.value = '';
                updateDisplay();
                copyYesterdayBtn.style.display = 'none';
            };
        } else {
            copyYesterdayBtn.style.display = 'none';
        }
    }
    updateDisplay();
    renderSummary();
});

// --- Settings Logic ---
settingsBtn.addEventListener('click', () => settingsModal.classList.add('active'));
closeSettingsBtn.addEventListener('click', () => settingsModal.classList.remove('active'));

priceCowInput.addEventListener('change', (e) => {
    state.cowPrice = parseFloat(e.target.value);
    localStorage.setItem(PRICE_COW_KEY, state.cowPrice);
    renderSummary();
});

priceBuffaloInput.addEventListener('change', (e) => {
    state.buffaloPrice = parseFloat(e.target.value);
    localStorage.setItem(PRICE_BUFFALO_KEY, state.buffaloPrice);
    renderSummary();
});

monthlyTargetInput.addEventListener('change', (e) => {
    state.monthlyTarget = parseFloat(e.target.value) || 0;
    localStorage.setItem(MONTHLY_TARGET_KEY, state.monthlyTarget);
    renderSummary();
});

themeToggle.addEventListener('change', (e) => {
    state.isDark = e.target.checked;
    document.body.setAttribute('data-theme', state.isDark ? 'dark' : 'light');
    localStorage.setItem(THEME_KEY, state.isDark ? 'dark' : 'light');
});

// --- Notifications Logic ---
async function scheduleNotification() {
    if (!state.reminderEnabled) return;

    try {
        // Create High Priority Channel (Android)
        await LocalNotifications.createChannel({
            id: 'daily_reminder',
            name: 'Daily Reminder',
            description: 'Reminds you to enter milk data',
            importance: 5, // High
            visibility: 1, // Public
            vibration: true
        });

        const result = await LocalNotifications.requestPermissions();
        if (result.display !== 'granted') {
            alert("Notification permission required for reminders.");
            state.reminderEnabled = false;
            reminderToggle.checked = false;
            localStorage.setItem(REMINDER_ENABLED_KEY, 'false');
            return;
        }

        const [hours, minutes] = state.reminderTime.split(':').map(Number);

        await LocalNotifications.cancel({ notifications: [{ id: 1 }] });
        await LocalNotifications.schedule({
            notifications: [{
                title: "Milk Bahi",
                body: "Don't forget to add today's milk entry! 🥛",
                id: 1,
                channelId: 'daily_reminder',
                schedule: {
                    on: {
                        hour: hours,
                        minute: minutes
                    },
                    allowWhileIdle: true,
                    repeats: true
                }
            }]
        });
        // alert(`Reminder set for ${state.reminderTime}`);
    } catch (e) {
        console.error("Error scheduling notification", e);
    }
}

reminderToggle.addEventListener('change', async (e) => {
    state.reminderEnabled = e.target.checked;
    localStorage.setItem(REMINDER_ENABLED_KEY, state.reminderEnabled);

    if (state.reminderEnabled) {
        reminderTimeInput.style.display = 'block';
        await scheduleNotification();
    } else {
        reminderTimeInput.style.display = 'none';
        await LocalNotifications.cancel({ notifications: [{ id: 1 }] });
    }
});

reminderTimeInput.addEventListener('change', async (e) => {
    state.reminderTime = e.target.value;
    localStorage.setItem(REMINDER_TIME_KEY, state.reminderTime);
    if (state.reminderEnabled) {
        await scheduleNotification();
    }
});

// --- Backup & Restore Logic ---
backupBtn.addEventListener('click', async () => {
    try {
        const backupObject = {
            version: 1,
            timestamp: Date.now(),
            settings: {
                cowPrice: state.cowPrice,
                buffaloPrice: state.buffaloPrice,
                monthlyTarget: state.monthlyTarget,
                isDark: state.isDark,
                reminderEnabled: state.reminderEnabled,
                reminderTime: state.reminderTime
            },
            data: state.data
        };

        const dataStr = JSON.stringify(backupObject, null, 2);
        const fileName = `milk-tracker-backup-${state.currentDate}.json`;

        // Write to cache or documents
        const result = await Filesystem.writeFile({
            path: fileName,
            data: dataStr,
            directory: Directory.Cache, // Use Cache for temporary sharing
            encoding: Encoding.UTF8
        });

        // Share the file
        await Share.share({
            title: 'Backup Milk Data',
            text: 'Here is your milk tracker backup.',
            url: result.uri,
            dialogTitle: 'Save Backup'
        });

    } catch (e) {
        console.error("Backup failed", e);
        // Fallback to browser download if Share fails (e.g. desktop)
        const backupObject = {
            version: 1,
            timestamp: Date.now(),
            settings: {
                cowPrice: state.cowPrice,
                buffaloPrice: state.buffaloPrice,
                monthlyTarget: state.monthlyTarget,
                isDark: state.isDark,
                reminderEnabled: state.reminderEnabled,
                reminderTime: state.reminderTime
            },
            data: state.data
        };
        const dataStr = JSON.stringify(backupObject, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `milk-tracker-backup-${state.currentDate}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
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
            const imported = JSON.parse(event.target.result);
            if (!imported || typeof imported !== 'object') throw new Error("Invalid JSON");

            if (confirm("This will overwrite your current local data. Are you sure?")) {
                // Determine if legacy (just data object) or new format (with settings)
                let newData = {};
                if (imported.data && imported.settings) {
                    // New Format
                    // Security: Validate and Sanitize 'data'
                    if (typeof imported.data !== 'object') throw new Error("Invalid Data format");

                    const sanitizedData = {};
                    for (const [key, val] of Object.entries(imported.data)) {
                        // Key should be YYYY-MM-DD
                        if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) continue;

                        // Val should be { cow: num, buffalo: num }
                        if (typeof val !== 'object') continue;

                        const entry = {
                            cow: typeof val.cow === 'number' ? val.cow : 0,
                            buffalo: typeof val.buffalo === 'number' ? val.buffalo : 0
                        };
                        if (typeof val.note === 'string') entry.note = val.note; // Restore note

                        sanitizedData[key] = entry;
                    }
                    newData = sanitizedData;

                    // Restore Settings with Validation
                    if (typeof imported.settings.cowPrice === 'number') {
                        state.cowPrice = imported.settings.cowPrice;
                        localStorage.setItem(PRICE_COW_KEY, state.cowPrice);
                        priceCowInput.value = state.cowPrice;
                    }
                    if (typeof imported.settings.buffaloPrice === 'number') {
                        state.buffaloPrice = imported.settings.buffaloPrice;
                        localStorage.setItem(PRICE_BUFFALO_KEY, state.buffaloPrice);
                        priceBuffaloInput.value = state.buffaloPrice;
                    }
                    if (typeof imported.settings.monthlyTarget === 'number') {
                        state.monthlyTarget = imported.settings.monthlyTarget;
                        localStorage.setItem(MONTHLY_TARGET_KEY, state.monthlyTarget);
                        monthlyTargetInput.value = state.monthlyTarget;
                    }

                    // Restore Theme
                    if (typeof imported.settings.isDark === 'boolean') {
                        state.isDark = imported.settings.isDark;
                        document.body.setAttribute('data-theme', state.isDark ? 'dark' : 'light');
                        localStorage.setItem(THEME_KEY, state.isDark ? 'dark' : 'light');
                        themeToggle.checked = state.isDark;
                    }

                    // Restore Reminder
                    if (typeof imported.settings.reminderEnabled === 'boolean') {
                         state.reminderEnabled = imported.settings.reminderEnabled;
                         localStorage.setItem(REMINDER_ENABLED_KEY, state.reminderEnabled);
                         reminderToggle.checked = state.reminderEnabled;
                         reminderTimeInput.style.display = state.reminderEnabled ? 'block' : 'none';
                    }
                     if (typeof imported.settings.reminderTime === 'string') {
                         state.reminderTime = imported.settings.reminderTime;
                         localStorage.setItem(REMINDER_TIME_KEY, state.reminderTime);
                         reminderTimeInput.value = state.reminderTime;
                    }
                    // Re-schedule notification if needed
                    if (state.reminderEnabled) await scheduleNotification();
                    else await LocalNotifications.cancel({ notifications: [{ id: 1 }] });

                } else {
                    // Legacy Format (imported is just the data object)
                    // Sanitize legacy
                    const sanitizedData = {};
                    for (const [key, val] of Object.entries(imported)) {
                         if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) continue;
                         // Legacy might be number or object
                         if (typeof val === 'number') {
                             sanitizedData[key] = { cow: val, buffalo: 0 };
                         } else if (typeof val === 'object') {
                             sanitizedData[key] = {
                                 cow: typeof val.cow === 'number' ? val.cow : 0,
                                 buffalo: typeof val.buffalo === 'number' ? val.buffalo : 0
                             };
                         }
                    }
                    newData = sanitizedData;
                }

                state.data = newData;
                await saveDataToDisk();
                alert("Data and settings restored successfully!");
                renderSummary();
                renderFullHistory();
            }
        } catch (err) {
            alert("Error reading file. Is it a valid backup?");
            console.error(err);
        }
    };
    reader.readAsText(file);
});


// --- WhatsApp Export ---
whatsappFab.addEventListener('click', () => {
    const entries = getMonthData();

    let totalCow = 0;
    let totalBuff = 0;
    let totalCost = 0;

    entries.forEach(([date, val]) => {
        totalCow += val.cow || 0;
        totalBuff += val.buffalo || 0;
        totalCost += (val.cow || 0) * state.cowPrice;
        totalCost += (val.buffalo || 0) * state.buffaloPrice;
    });

    const [year, month] = dateInput.value.split('-');
    const monthName = new Date(dateInput.value).toLocaleString('default', { month: 'long' });

    const text = `*Milk Report for ${monthName} ${year}* 🥛%0A` +
                    `---------------------------%0A` +
                    `Cow Milk: ${totalCow.toFixed(1)} L%0A` +
                    `Buffalo Milk: ${totalBuff.toFixed(1)} L%0A` +
                    `Total Cost: ₹${totalCost.toFixed(0)}%0A` +
                    `---------------------------%0A` +
                    `Shared from Milk Bahi%0A` +
                    `Made with ❤️ by Pavneet`;

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
    const avgDailyEl = document.getElementById('ana-avg-daily');
    const projCostEl = document.getElementById('ana-proj-cost');

    milkContainer.innerHTML = '';
    costContainer.innerHTML = '';

    if (sortedEntries.length === 0) {
        milkContainer.innerHTML = '<p style="font-size: 12px; margin: auto; color: var(--secondary-text);">No data for this month</p>';
        costContainer.innerHTML = '<p style="font-size: 12px; margin: auto; color: var(--secondary-text);">No data for this month</p>';
        avgDailyEl.innerText = '0L';
        projCostEl.innerText = '₹0';
        return;
    }

    // --- Calculations ---
    let totalMilk = 0;
    let totalCost = 0;

    // Determine max values for scaling
    // We need max(total daily milk) and max(total daily cost)
    let maxDailyMilk = 0;
    let maxDailyCost = 0;

    sortedEntries.forEach(([date, val]) => {
        const c = val.cow || 0;
        const b = val.buffalo || 0;
        const dayTotal = c + b;
        const dayCost = (c * state.cowPrice) + (b * state.buffaloPrice);

        totalMilk += dayTotal;
        totalCost += dayCost;

        if (dayTotal > maxDailyMilk) maxDailyMilk = dayTotal;
        if (dayCost > maxDailyCost) maxDailyCost = dayCost;
    });

    if (maxDailyMilk === 0) maxDailyMilk = 1; // Prevent div by zero
    if (maxDailyCost === 0) maxDailyCost = 1;

    // Averages & Projections
    const daysRecorded = sortedEntries.length;
    const avgDaily = totalMilk / daysRecorded;

    // Project cost: Avg Daily Cost * Days in Month
    const dateObj = new Date(dateInput.value);
    const daysInMonth = new Date(dateObj.getFullYear(), dateObj.getMonth() + 1, 0).getDate();
    const avgDailyCost = totalCost / daysRecorded;
    const projectedCost = avgDailyCost * daysInMonth;

    avgDailyEl.innerText = `${avgDaily.toFixed(1)}L`;
    projCostEl.innerText = `₹${projectedCost.toFixed(0)}`;


    // --- Graph Rendering ---
    const GRAPH_HEIGHT = 140; // Approx pixels

    sortedEntries.forEach(([date, val]) => {
        const day = new Date(date).getDate();
        const c = val.cow || 0;
        const b = val.buffalo || 0;

        const dayCost = (c * state.cowPrice) + (b * state.buffaloPrice);

        // --- Milk Stacked Graph ---
        // Cow (Bottom) + Buffalo (Top)

        const milkWrapper = document.createElement('div');
        milkWrapper.style.display = 'flex';
        milkWrapper.style.flexDirection = 'column';
        milkWrapper.style.alignItems = 'center';
        milkWrapper.style.justifyContent = 'flex-end';
        milkWrapper.style.height = '100%';
        milkWrapper.style.minWidth = '20px'; // Spacing

        const barContainer = document.createElement('div');
        barContainer.style.display = 'flex';
        barContainer.style.flexDirection = 'column-reverse'; // Stack from bottom
        barContainer.style.width = '12px';
        barContainer.style.background = 'rgba(0,0,0,0.05)';
        barContainer.style.borderRadius = '4px 4px 0 0';
        barContainer.style.overflow = 'hidden';

        const cowH = (c / maxDailyMilk) * GRAPH_HEIGHT;
        const buffH = (b / maxDailyMilk) * GRAPH_HEIGHT;

        // Cow Bar
        const cowBar = document.createElement('div');
        cowBar.style.height = `${cowH}px`;
        cowBar.style.width = '100%';
        cowBar.style.background = 'var(--accent-color)'; // Cow Color

        // Buff Bar
        const buffBar = document.createElement('div');
        buffBar.style.height = `${buffH}px`;
        buffBar.style.width = '100%';
        buffBar.style.background = '#FF9500'; // Buff Color (Orange)

        barContainer.appendChild(cowBar);
        barContainer.appendChild(buffBar);

        const milkLabel = document.createElement('div');
        milkLabel.innerText = day;
        milkLabel.style.fontSize = '9px';
        milkLabel.style.color = 'var(--secondary-text)';
        milkLabel.style.marginTop = '4px';

        milkWrapper.appendChild(barContainer);
        milkWrapper.appendChild(milkLabel);
        milkContainer.appendChild(milkWrapper);


        // --- Cost Graph Item ---
        const costWrapper = document.createElement('div');
        costWrapper.style.display = 'flex';
        costWrapper.style.flexDirection = 'column';
        costWrapper.style.alignItems = 'center';
        costWrapper.style.justifyContent = 'flex-end';
        costWrapper.style.height = '100%';
        costWrapper.style.minWidth = '20px';

        const costBar = document.createElement('div');
        const costH = (dayCost / maxDailyCost) * GRAPH_HEIGHT;
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

// --- Sidebar Logic ---
const menuBtn = document.getElementById('menu-btn');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebar-overlay');
const checkUpdateBtn = document.getElementById('check-update-btn');
const shareAppBtn = document.getElementById('share-app-btn');

const closeSidebar = () => {
    sidebar.classList.remove('active');
    sidebarOverlay.classList.remove('active');
};

if (menuBtn) {
    menuBtn.addEventListener('click', () => {
        sidebar.classList.add('active');
        sidebarOverlay.classList.add('active');
    });
}

if (sidebarOverlay) {
    sidebarOverlay.addEventListener('click', closeSidebar);
}

if (checkUpdateBtn) {
    checkUpdateBtn.addEventListener('click', () => {
        window.open('https://github.com/pavnxet/Milk-Bahi/releases', '_blank');
    });
}

if (shareAppBtn) {
    shareAppBtn.addEventListener('click', async () => {
        try {
            await Share.share({
                title: 'Milk Bahi App',
                text: "Check out Milk Bahi! I use it to track my daily milk expenses. It's simple and effective. Download the latest version here:",
                url: 'https://github.com/pavnxet/Milk-Bahi/releases/latest/download/MilkBahi_v2.01.apk',
                dialogTitle: 'Share App'
            });
        } catch (error) {
            console.error("Error sharing:", error);
        }
    });
}

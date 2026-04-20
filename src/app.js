import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { LocalNotifications } from '@capacitor/local-notifications';
import Chart from 'chart.js/auto';
import { jsPDF } from 'jspdf';
import { generateCSVContent } from './csvHelper.js';

// --- Constants ---
const STORAGE_KEY = "milk_tracker_data";
const PRICE_COW_KEY = "milk_tracker_price_cow";
const PRICE_BUFFALO_KEY = "milk_tracker_price_buffalo";
const MONTHLY_TARGET_KEY = "milk_tracker_monthly_target";
const MONTHLY_BUDGET_KEY = "milk_tracker_monthly_budget";
const THEME_KEY = "milk_tracker_theme";
const REMINDER_ENABLED_KEY = "milk_tracker_reminder_enabled";
const REMINDER_TIME_KEY = "milk_tracker_reminder_time";
const DATA_FOLDER = "MilkTracker";
const DATA_FILE = "data.json";

// --- Helper Functions ---
function calculateEntry(val, defaultCowPrice, defaultBuffaloPrice) {
    const cow = val.cow || 0;
    const buffalo = val.buffalo || 0;
    const cowPrice = val.cowPrice !== undefined ? val.cowPrice : defaultCowPrice;
    const buffaloPrice = val.buffaloPrice !== undefined ? val.buffaloPrice : defaultBuffaloPrice;
    const cost = (cow * cowPrice) + (buffalo * buffaloPrice);
    return { cow, buffalo, cowPrice, buffaloPrice, cost };
}

function calculateTotals(entries, defaultCowPrice, defaultBuffaloPrice) {
    let totalCow = 0;
    let totalBuff = 0;
    let totalCost = 0;

    entries.forEach(([date, val]) => {
        const result = calculateEntry(val, defaultCowPrice, defaultBuffaloPrice);
        totalCow += result.cow;
        totalBuff += result.buffalo;
        totalCost += result.cost;
    });

    return { totalCow, totalBuff, totalCost };
}

// --- State ---
let state = {
    data: {}, // { "YYYY-MM-DD": { cow: float, buffalo: float, cowPrice: float, buffaloPrice: float } }
    cowPrice: 40,
    buffaloPrice: 55, // Default buffalo price
    monthlyTarget: 0,
    monthlyBudget: 0,
    currentDate: (() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    })(),
    isDark: false,
    reminderEnabled: false,
    reminderTime: '08:00',
    analyticsStart: (() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
    })(),
    analyticsEnd: (() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    })()
};

// --- UI Elements ---
const dashboard = document.getElementById('dashboard');

const dateInput = document.getElementById('entry-date');
const prevDayBtn = document.getElementById('prev-day-btn');
const nextDayBtn = document.getElementById('next-day-btn');

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
const monthlyBudgetInput = document.getElementById('monthly-budget-setting');
const themeToggle = document.getElementById('theme-toggle');
const reminderToggle = document.getElementById('reminder-toggle');
const reminderTimeInput = document.getElementById('reminder-time');
const whatsappFab = document.getElementById('whatsapp-fab');

// Analytics Elements
const analyticsStartDateInput = document.getElementById('analytics-start-date');
const analyticsEndDateInput = document.getElementById('analytics-end-date');
const analyticsFilterBtn = document.getElementById('analytics-filter-btn');
const anaAvgDailyEl = document.getElementById('ana-avg-daily');
const anaProjCostEl = document.getElementById('ana-proj-cost');
const monthComparisonEl = document.getElementById('month-comparison');
const peakDaysEl = document.getElementById('peak-days');
const exportPdfBtn = document.getElementById('export-pdf-btn');
const exportCsvBtn = document.getElementById('export-csv-btn');

// Backup/Restore Elements
const backupBtn = document.getElementById('backup-btn');
const restoreBtn = document.getElementById('restore-btn');
const restoreInput = document.getElementById('restore-input');

// --- State Variables for UI ---
let currentCow = 0.0;
let currentBuff = 0.0;

// --- Initialization ---
async function init() {
    // Load local settings
    const savedCowPrice = localStorage.getItem(PRICE_COW_KEY);
    if (savedCowPrice) state.cowPrice = parseFloat(savedCowPrice);

    const savedBuffaloPrice = localStorage.getItem(PRICE_BUFFALO_KEY);
    if (savedBuffaloPrice) state.buffaloPrice = parseFloat(savedBuffaloPrice);

    const savedTarget = localStorage.getItem(MONTHLY_TARGET_KEY);
    if (savedTarget) state.monthlyTarget = parseFloat(savedTarget);

    const savedBudget = localStorage.getItem(MONTHLY_BUDGET_KEY);
    if (savedBudget) state.monthlyBudget = parseFloat(savedBudget);

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
    if (state.monthlyBudget > 0) monthlyBudgetInput.value = state.monthlyBudget;

    // Init Analytics Dates
    analyticsStartDateInput.value = state.analyticsStart;
    analyticsEndDateInput.value = state.analyticsEnd;

    // Init Dashboard directly
    showDashboard();
    await loadData();
}

function showDashboard() {
    // Remove login logic
    dashboard.classList.remove('hidden');

    renderSummary();
    renderFullHistory();
}

// --- Filesystem Logic ---
function checkAndShowCopyYesterday(currentDateStr) {
    // If current day has data, hide button
    if (state.data[currentDateStr] && (state.data[currentDateStr].cow > 0 || state.data[currentDateStr].buffalo > 0)) {
        copyYesterdayBtn.style.display = 'none';
        return;
    }

    // Get Yesterday in UTC
    const d = new Date(currentDateStr);
    d.setUTCDate(d.getUTCDate() - 1);
    const yStr = d.toISOString().split('T')[0];

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

    checkAndShowCopyYesterday(today);

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
    // Save current prices with the entry to maintain history
    const entry = {
        ...qty,
        cowPrice: state.cowPrice,
        buffaloPrice: state.buffaloPrice
    };
    state.data[date] = entry;
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
    checkAndShowCopyYesterday(date); // Update button state
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

    const { totalCow, totalBuff, totalCost } = calculateTotals(entries, state.cowPrice, state.buffaloPrice);

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

    const fragment = document.createDocumentFragment();

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

        // Show price if stored and different from current? Maybe just show cost.
        // For simplicity, stick to volume.

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

        fragment.appendChild(item);
    });

    historyListEl.appendChild(fragment);
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
    } else {
        currentCow = 0;
        currentBuff = 0;
        entryNoteInput.value = '';
    }

    checkAndShowCopyYesterday(date);

    updateDisplay();
    renderSummary();
});

prevDayBtn.addEventListener('click', () => {
    const d = new Date(dateInput.value); // UTC Midnight
    d.setUTCDate(d.getUTCDate() - 1);
    dateInput.value = d.toISOString().split('T')[0];
    dateInput.dispatchEvent(new Event('change'));
});

nextDayBtn.addEventListener('click', () => {
    const d = new Date(dateInput.value); // UTC Midnight
    d.setUTCDate(d.getUTCDate() + 1);
    dateInput.value = d.toISOString().split('T')[0];
    dateInput.dispatchEvent(new Event('change'));
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

monthlyBudgetInput.addEventListener('change', (e) => {
    state.monthlyBudget = parseFloat(e.target.value) || 0;
    localStorage.setItem(MONTHLY_BUDGET_KEY, state.monthlyBudget);
    renderSummary(); // Re-render summary (and indirectly analytics if active)
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
                monthlyBudget: state.monthlyBudget,
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
                monthlyBudget: state.monthlyBudget,
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
                            buffalo: typeof val.buffalo === 'number' ? val.buffalo : 0,
                            cowPrice: typeof val.cowPrice === 'number' ? val.cowPrice : undefined,
                            buffaloPrice: typeof val.buffaloPrice === 'number' ? val.buffaloPrice : undefined
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
                     if (typeof imported.settings.monthlyBudget === 'number') {
                        state.monthlyBudget = imported.settings.monthlyBudget;
                        localStorage.setItem(MONTHLY_BUDGET_KEY, state.monthlyBudget);
                        monthlyBudgetInput.value = state.monthlyBudget;
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

    const { totalCow, totalBuff, totalCost } = calculateTotals(entries, state.cowPrice, state.buffaloPrice);

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

// --- Analytics View Logic ---
let analyticsCharts = {};

analyticsFilterBtn.addEventListener('click', () => {
    state.analyticsStart = analyticsStartDateInput.value;
    state.analyticsEnd = analyticsEndDateInput.value;
    renderAnalytics();
});

exportPdfBtn.addEventListener('click', exportToPDF);
exportCsvBtn.addEventListener('click', exportToCSV);


function filterDataByDateRange(data, startStr, endStr) {
    const start = new Date(startStr);
    const end = new Date(endStr);

    // Sort chronological
    return Object.entries(data).filter(([dateStr, val]) => {
        const d = new Date(dateStr);
        return d >= start && d <= end;
    }).sort((a, b) => a[0].localeCompare(b[0]));
}

function getFilteredDataForAnalytics() {
    const entries = filterDataByDateRange(state.data, state.analyticsStart, state.analyticsEnd);

    const start = new Date(state.analyticsStart);
    const end = new Date(state.analyticsEnd);

    // Friendly Label
    const label = `${start.toLocaleDateString()} to ${end.toLocaleDateString()}`;

    return { entries, label };
}

function renderAnalytics() {
    const { entries, label } = getFilteredDataForAnalytics();

    // 1. Destroy old charts
    if (analyticsCharts['distribution']) analyticsCharts['distribution'].destroy();
    if (analyticsCharts['trend']) analyticsCharts['trend'].destroy();
    if (analyticsCharts['price']) analyticsCharts['price'].destroy();

    // 2. Prepare Data
    let totalCow = 0;
    let totalBuff = 0;
    let totalCost = 0;

    let processedData = [];

    // Fill Missing Days Logic
    // We iterate from start to end date
    const start = new Date(state.analyticsStart);
    const end = new Date(state.analyticsEnd);

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const existing = state.data[dateKey];

        if (existing) {
            const result = calculateEntry(existing, state.cowPrice, state.buffaloPrice);

            totalCow += result.cow;
            totalBuff += result.buffalo;
            totalCost += result.cost;

            processedData.push({
                label: `${d.getDate()}/${d.getMonth()+1}`,
                date: dateKey,
                cow: result.cow,
                buffalo: result.buffalo,
                cost: result.cost,
                cowPrice: result.cowPrice,
                buffaloPrice: result.buffaloPrice
            });
        } else {
            // Zero Day
            processedData.push({
                label: `${d.getDate()}/${d.getMonth()+1}`,
                date: dateKey,
                cow: 0,
                buffalo: 0,
                cost: 0,
                cowPrice: state.cowPrice, // Just for ref
                buffaloPrice: state.buffaloPrice
            });
        }
    }


    // 3. Stats Update
    const daysCount = processedData.length;
    const avgDaily = daysCount > 0 ? (totalCow + totalBuff) / daysCount : 0;

    anaAvgDailyEl.innerText = `${avgDaily.toFixed(1)}L`;
    anaProjCostEl.innerText = `₹${totalCost.toFixed(0)}`;
    anaProjCostEl.style.color = 'var(--text-color)'; // Reset color

    // Peak Days
    const peak = calculatePeakDay(entries);

    if (peak) {
        peakDaysEl.innerText = `Max: ${peak.maxMilk}L (${new Date(peak.maxDate).getDate()}/${new Date(peak.maxDate).getMonth()+1})`;
    } else {
        peakDaysEl.innerText = "No Data";
    }

    // Month Comparison is tricky with custom range. Hide it.
    monthComparisonEl.style.display = 'none';

    // 4. Render Charts using Chart.js

    // Distribution Pie
    const ctxDist = document.getElementById('chart-distribution').getContext('2d');
    analyticsCharts['distribution'] = new Chart(ctxDist, {
        type: 'doughnut',
        data: {
            labels: ['Cow', 'Buffalo'],
            datasets: [{
                data: [totalCow, totalBuff],
                backgroundColor: ['#4ade80', '#FF9500'], // Accent & Orange
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'right' }
            }
        }
    });

    // Trend Stacked Bar
    const ctxTrend = document.getElementById('chart-trend').getContext('2d');
    const labels = processedData.map(d => d.label);
    const cowData = processedData.map(d => d.cow);
    const buffData = processedData.map(d => d.buffalo);

    analyticsCharts['trend'] = new Chart(ctxTrend, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Cow',
                    data: cowData,
                    backgroundColor: '#4ade80',
                    stack: 'Stack 0',
                },
                {
                    label: 'Buffalo',
                    data: buffData,
                    backgroundColor: '#FF9500',
                    stack: 'Stack 0',
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { stacked: true, grid: { display: false } },
                y: { stacked: true, beginAtZero: true }
            },
            plugins: {
                tooltip: {
                    mode: 'index',
                    intersect: false,
                }
            }
        }
    });

    // Price Trend Line
    const ctxPrice = document.getElementById('chart-price').getContext('2d');
    const pCow = processedData.map(d => d.cowPrice);
    const pBuff = processedData.map(d => d.buffaloPrice);

    analyticsCharts['price'] = new Chart(ctxPrice, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Cow Price',
                    data: pCow,
                    borderColor: '#4ade80',
                    tension: 0.1,
                    pointRadius: 1
                },
                {
                    label: 'Buff Price',
                    data: pBuff,
                    borderColor: '#FF9500',
                    tension: 0.1,
                    pointRadius: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: false } // Price usually doesn't start at 0
            }
        }
    });
}

// --- Service Worker Registration ---
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(reg => console.log('SW Registered!', reg.scope))
            .catch(err => console.log('SW Failed!', err));
    });
}

// --- Export Functions ---
async function exportToCSV() {
    const { entries, label } = getFilteredDataForAnalytics();
    if (entries.length === 0) return alert("No data to export");

    const csvContent = generateCSVContent(entries, state.cowPrice, state.buffaloPrice);

    try {
        const fileName = `Milk_Report_${label.replace(/ /g, '_')}_${Date.now()}.csv`;

        const result = await Filesystem.writeFile({
            path: fileName,
            data: csvContent,
            directory: Directory.Cache,
            encoding: Encoding.UTF8
        });

        await Share.share({
            title: 'Milk Report CSV',
            url: result.uri
        });

    } catch (e) {
        console.error("CSV Export Failed", e);
        // Browser fallback
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `milk_report_${label.replace(/ /g, '_')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

async function exportToPDF() {
    const { entries, label } = getFilteredDataForAnalytics();
    if (entries.length === 0) return alert("No data to export");

    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text(`Milk Report`, 14, 22);
    doc.setFontSize(12);
    doc.text(label, 14, 28);

    // Headers Helper
    const printHeader = (yPos) => {
        doc.setFontSize(10);
        doc.setTextColor(0);
        doc.text("Date", 14, yPos);
        doc.text("Cow", 50, yPos);
        doc.text("Buff", 70, yPos);
        doc.text("Cost", 90, yPos);
        doc.text("Note", 120, yPos);
        doc.line(14, yPos+2, 200, yPos+2);
    };

    // Initial Headers
    let y = 40;
    printHeader(y);
    y += 8;

    let totalCow = 0, totalBuff = 0, totalCost = 0;

    // Entries
    entries.forEach(([date, val]) => {
        if (y > 270) {
            doc.addPage();
            y = 20;
            printHeader(y);
            y += 8;
        }

         const result = calculateEntry(val, state.cowPrice, state.buffaloPrice);

         totalCow += result.cow;
         totalBuff += result.buffalo;
         totalCost += result.cost;

         doc.text(date, 14, y);
         doc.text(result.cow.toString(), 50, y);
         doc.text(result.buffalo.toString(), 70, y);
         doc.text(result.cost.toFixed(0), 90, y);
         if (val.note) {
             const cleanNote = val.note.length > 25 ? val.note.substring(0, 23) + '...' : val.note;
             doc.text(cleanNote, 120, y);
         }

         y += 7;
    });

    // Summary Section at the End
    if (y > 250) {
        doc.addPage();
        y = 20;
    } else {
        y += 10;
    }

    doc.line(14, y, 200, y);
    y += 10;
    doc.setFontSize(14);
    doc.text("Summary", 14, y);
    y += 8;
    doc.setFontSize(12);
    doc.text(`Total Cow Milk: ${totalCow.toFixed(1)} L`, 14, y);
    y += 6;
    doc.text(`Total Buffalo Milk: ${totalBuff.toFixed(1)} L`, 14, y);
    y += 6;
    doc.setFontSize(14);
    doc.setTextColor(255, 0, 0); // Red for cost
    doc.text(`Grand Total Cost: Rs. ${totalCost.toFixed(0)}`, 14, y);

    // --- Output & Share ---
    try {
        const base64Data = doc.output('datauristring').split(',')[1];
        const fileName = `Milk_Report_${Date.now()}.pdf`;

        const result = await Filesystem.writeFile({
            path: fileName,
            data: base64Data,
            directory: Directory.Cache
        });

        await Share.share({
            title: 'Milk Report PDF',
            url: result.uri
        });

    } catch (e) {
        console.error("PDF Export Failed", e);
        // Browser fallback
        doc.save(`milk_report.pdf`);
    }
}

// Run Init
init();

// --- Helper Functions ---
export function calculatePeakDay(entries) {
    if (!entries || entries.length === 0) return null;

    let maxMilk = -1;
    let maxDate = '';

    entries.forEach(([date, val]) => {
         const t = (val.cow||0) + (val.buffalo||0);
         if (t > maxMilk) {
             maxMilk = t;
             maxDate = date;
         }
    });

    return { maxMilk, maxDate };
}

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
        const title = 'Milk Bahi App';
        const text = '👋 Hi! I use Milk Bahi to track my daily milk expenses. It\'s simple and works offline. You can download the app file directly from here:';
        const url = 'https://github.com/pavnxet/Milk-Bahi/releases';

        try {
            // Try Capacitor Share first
            await Share.share({
                title: title,
                text: text,
                url: url,
                dialogTitle: 'Share App'
            });
        } catch (error) {
            console.warn("Capacitor Share failed, trying Navigator Share", error);
            // Fallback to Web Share API
            if (navigator.share) {
                try {
                    await navigator.share({
                        title: title,
                        text: text,
                        url: url
                    });
                } catch (err) {
                    console.error("Navigator Share failed", err);
                }
            } else {
                 // Final Fallback: Copy to Clipboard
                 try {
                     await navigator.clipboard.writeText(`${text} ${url}`);
                     alert("Link copied to clipboard!");
                 } catch (err) {
                     alert(`Share this link: ${url}`);
                 }
            }
        }
    });
}

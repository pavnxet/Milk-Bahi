import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Toast } from '@capacitor/toast';
import { LocalNotifications } from '@capacitor/local-notifications';
import Chart from 'chart.js/auto';
import { jsPDF } from 'jspdf';
import { generateCSVContent } from './csvHelper.js';
import { calculateEntry, parseLocalDate, sanitizeFilename, sanitizeData, isShareDismissed, todayKey, isFutureKey, shouldPromptStar } from './utils.js';

// --- Constants ---
const REPO_URL = "https://github.com/pavnxet/Milk-Bahi";
const RELEASES_URL = "https://github.com/pavnxet/Milk-Bahi/releases";
const STAR_COUNT_KEY = "milk_tracker_star_prompt_count";

// --- Storage & settings ---
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

// --- Helpers ---
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

// Write mutex: FS is the source of truth; concurrent saves are serialized
// through this promise chain so no write can clobber another.
let saveChain = Promise.resolve();

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

    // Set today's date (and never allow future entry dates)
    dateInput.value = state.currentDate;
    dateInput.max = todayKey();
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
    renderDate(parseLocalDate(state.currentDate));
    if (state.reminderEnabled) {
        try {
            await scheduleNotification();
        } catch (e) {
            console.error("Failed to re-schedule reminder on init", e);
        }
    }
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
            // Intent: copy yesterday's volumes only — the note stays blank and
            // prices are stamped at save time from current settings, not copied.
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
        const parsed = JSON.parse(result.data);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            state.data = {};
        } else {
            const hadLegacy = Object.values(parsed).some((v) => typeof v === 'number');
            state.data = sanitizeData(parsed);
            // Persist migration when legacy number-format entries were converted.
            if (hadLegacy) await saveDataToDisk();
        }
    } catch (e) {
        console.log("FS Load failed, trying LS", e);
        // Fallback
        const localData = localStorage.getItem(STORAGE_KEY);
        if (localData) {
            try {
                const parsed = JSON.parse(localData);
                if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                    const hadLegacy = Object.values(parsed).some((v) => typeof v === 'number');
                    state.data = sanitizeData(parsed);
                    // Persist migration when legacy number-format entries were converted.
                    if (hadLegacy) await saveDataToDisk();
                } else {
                    state.data = {};
                }
            } catch (e2) {
                console.error("LS Load failed (corrupt JSON), starting empty", e2);
                state.data = {};
            }
        }
    }

    // Load today's data if exists
    const today = dateInput.value;
    loadEditorForDate(today);

    renderSummary();
    renderFullHistory();
}

async function writeDataOnce() {
    // Dual-write: FS is the source of truth, localStorage is the fallback
    // mirror. Each store has its own try/catch so one failing never
    // blocks the other.
    const payload = JSON.stringify(state.data);
    try {
        await Filesystem.writeFile({
            path: `${DATA_FOLDER}/${DATA_FILE}`,
            data: payload,
            directory: Directory.Documents,
            encoding: Encoding.UTF8,
        });
    } catch (e) {
        console.error("FS Save failed", e);
    }
    try {
        localStorage.setItem(STORAGE_KEY, payload);
    } catch (e) {
        console.error("LS Save failed", e);
    }
}

function saveDataToDisk() {
    const run = saveChain.then(writeDataOnce);
    // Advance the chain regardless of outcome; the release happens via
    // this reassignment so a failed write never blocks later saves.
    saveChain = run.catch(() => {});
    return run;
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
        if (dateInput.value === date) {
            // Deleted date is visible: reset the editor to a blank entry.
            loadEditorForDate(dateInput.value);
        }
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

decCowBtn.addEventListener('click', () => { currentCow = Math.max(0, Math.round((currentCow - 0.5) * 2) / 2); updateDisplay(); });
incCowBtn.addEventListener('click', () => { currentCow = Math.max(0, Math.round((currentCow + 0.5) * 2) / 2); updateDisplay(); });

decBuffBtn.addEventListener('click', () => { currentBuff = Math.max(0, Math.round((currentBuff - 0.5) * 2) / 2); updateDisplay(); });
incBuffBtn.addEventListener('click', () => { currentBuff = Math.max(0, Math.round((currentBuff + 0.5) * 2) / 2); updateDisplay(); });


saveBtn.addEventListener('click', async () => {
    const date = dateInput.value;
    if (!date) return alert("Please select a date");
    if (isFutureKey(date)) {
        try {
            await Toast.show({ text: 'Future entries are not allowed' });
        } catch (_) {
            alert("Future entries are not allowed");
        }
        dateInput.value = todayKey();
        loadEditorForDate(dateInput.value);
        return;
    }
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
// Exported so init() (and external callers) can render the month header.
export { renderDate };

function loadEditorForDate(dateStr) {
    clampDateToToday(dateStr);
    renderDate(parseLocalDate(dateInput.value));
    const key = dateInput.value;

    // Load data for this date
    if (state.data[key]) {
        const entry = state.data[key];
        currentCow = entry.cow || 0;
        currentBuff = entry.buffalo || 0;
        entryNoteInput.value = entry.note || '';
    } else {
        currentCow = 0;
        currentBuff = 0;
        entryNoteInput.value = '';
    }

    checkAndShowCopyYesterday(key);

    updateDisplay();
    renderSummary();
}

// Future dates are not allowed: snap the picker back to today and keep the
// next-day button disabled while today is selected. Accepts an optional
// candidate value (used by callers that just assigned dateInput.value).
function clampDateToToday(candidate) {
    const today = todayKey();
    dateInput.max = today;
    const value = candidate !== undefined ? candidate : dateInput.value;
    if (value > today) dateInput.value = today;
    nextDayBtn.disabled = dateInput.value >= today;
}

function getMonthData() {
    const [year, month] = dateInput.value.split('-');
    const prefix = `${year}-${month}`;

    const entries = Object.entries(state.data).filter(([k, v]) => k.startsWith(prefix));
    return entries.sort((a, b) => b[0].localeCompare(a[0])); // Descending date
}

function renderSummary() {
    const entries = getMonthData();

    const { totalCow, totalBuff, totalCost } = calculateTotals(entries, state.cowPrice, state.buffaloPrice);

    totalCowEl.innerText = `${totalCow.toFixed(1)}L`;
    totalBuffaloEl.innerText = `${totalBuff.toFixed(1)}L`;
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

    // Budget tracking (D1): spent-vs-budget line + red total when over budget.
    totalCostEl.style.color = '';
    if (state.monthlyBudget > 0) {
        goalSection.style.display = 'block';
        const budgetLine = `Budget: Rs.${totalCost.toFixed(0)} / Rs.${state.monthlyBudget}`;
        goalText.innerText = state.monthlyTarget > 0 ? `${goalText.innerText} • ${budgetLine}` : budgetLine;
        if (totalCost > state.monthlyBudget) totalCostEl.style.color = 'red';
    }
}

// History pagination (Wave C): page size + visible count. Re-render resets
// to page 1; the Load-more button appends the next page (see wiring section
// at the end of this file).
const HISTORY_PAGE_SIZE = 60;
let historyVisibleCount = HISTORY_PAGE_SIZE;

function createHistoryItem(date, qty) {
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

    return item;
}

function updateHistoryLoadMore(total) {
    const btn = document.getElementById('history-load-more');
    if (!btn) return;
    btn.style.display = historyVisibleCount < total ? 'block' : 'none';
}

let historyDirty = false;

function renderFullHistory() {
    // Skip the rebuild while the History tab is hidden; the tab switch
    // re-renders on demand (saves a full DOM rebuild on every save/delete).
    const tabHistory = document.getElementById('tab-history');
    if (tabHistory && !tabHistory.classList.contains('active')) {
        historyDirty = true;
        return;
    }
    historyDirty = false;
    // Paginated: show newest page first; Load-more appends the rest.
    historyVisibleCount = HISTORY_PAGE_SIZE;
    const entries = Object.entries(state.data).sort((a, b) => b[0].localeCompare(a[0]));
    historyListEl.innerHTML = '';

    const fragment = document.createDocumentFragment();

    entries.slice(0, historyVisibleCount).forEach(([date, qty]) => {
        fragment.appendChild(createHistoryItem(date, qty));
    });

    historyListEl.appendChild(fragment);
    updateHistoryLoadMore(entries.length);
}

dateInput.addEventListener('change', () => {
    loadEditorForDate(dateInput.value);
});

prevDayBtn.addEventListener('click', () => {
    const d = new Date(dateInput.value); // UTC Midnight
    d.setUTCDate(d.getUTCDate() - 1);
    dateInput.value = d.toISOString().split('T')[0];
    loadEditorForDate(dateInput.value);
});

nextDayBtn.addEventListener('click', () => {
    const d = new Date(dateInput.value); // UTC Midnight
    d.setUTCDate(d.getUTCDate() + 1);
    dateInput.value = d.toISOString().split('T')[0];
    loadEditorForDate(dateInput.value);
});

// --- Settings Logic (Wave C wiring: open/close via openSettings/closeSettings
// so the overlay, focus-in and focus-restore stay in sync) ---
settingsBtn.addEventListener('click', () => openSettings());
closeSettingsBtn.addEventListener('click', () => closeSettings());

priceCowInput.addEventListener('change', (e) => {
    const v = parseFloat(e.target.value);
    if (Number.isNaN(v)) { e.target.value = state.cowPrice; return; }
    state.cowPrice = v;
    localStorage.setItem(PRICE_COW_KEY, state.cowPrice);
    renderSummary();
});

priceBuffaloInput.addEventListener('change', (e) => {
    const v = parseFloat(e.target.value);
    if (Number.isNaN(v)) { e.target.value = state.buffaloPrice; return; }
    state.buffaloPrice = v;
    localStorage.setItem(PRICE_BUFFALO_KEY, state.buffaloPrice);
    renderSummary();
});

monthlyTargetInput.addEventListener('change', (e) => {
    const v = parseFloat(e.target.value);
    if (Number.isNaN(v)) { e.target.value = state.monthlyTarget || ''; return; }
    state.monthlyTarget = v || 0;
    localStorage.setItem(MONTHLY_TARGET_KEY, state.monthlyTarget);
    renderSummary();
});

monthlyBudgetInput.addEventListener('change', (e) => {
    const v = parseFloat(e.target.value);
    if (Number.isNaN(v)) { e.target.value = state.monthlyBudget || ''; return; }
    state.monthlyBudget = v || 0;
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
    const d = new Date();
    const todayKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const fileName = sanitizeFilename(`milk-tracker-backup-${todayKey}.json`);
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

        // Share succeeded: delete the temp Cache file.
        try {
            await Filesystem.deleteFile({ path: fileName, directory: Directory.Cache });
        } catch (cleanupErr) {
            console.warn("Backup temp cleanup failed", cleanupErr);
        }

    } catch (e) {
        if (isShareDismissed(e)) return; // User cancelled the share sheet: stay silent.
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
        a.download = fileName;
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
            if (!imported || typeof imported !== 'object' || Array.isArray(imported)) throw new Error("Invalid JSON");

            // Explicit format detect: presence of 'data' or 'settings' means
            // new-format backup. Never fall through to legacy parsing for it.
            const isNewFormat = ('data' in imported) || ('settings' in imported);
            let newData = {};
            if (isNewFormat) {
                if (!imported.data || typeof imported.data !== 'object' || Array.isArray(imported.data)) {
                    throw new Error("Invalid Data format");
                }
                newData = sanitizeData(imported.data);
            } else {
                // Legacy Format: imported is just the data object itself.
                // sanitizeData converts legacy numbers and keeps note/prices.
                newData = sanitizeData(imported);
            }

            const incomingCount = Object.keys(newData).length;
            const currentCount = Object.keys(state.data).length;
            const backupDate = imported.timestamp ? new Date(imported.timestamp).toLocaleString() : 'unknown date';

            if (incomingCount === 0 && currentCount > 0) {
                // Refuse to wipe non-empty data without a second explicit confirm.
                const wipe = confirm(`Backup from ${backupDate} has 0 valid entries (you currently have ${currentCount}). Restoring would ERASE all current data. Really wipe and restore?`);
                if (!wipe) { restoreInput.value = ''; return; }
            }

            if (!confirm(`Restore backup from ${backupDate}? It has ${incomingCount} entries (you currently have ${currentCount}). This will overwrite your current local data. Are you sure?`)) {
                restoreInput.value = '';
                return;
            }

            if (isNewFormat) {
                // Restore Settings with Validation
                if (typeof imported.settings?.cowPrice === 'number') {
                    state.cowPrice = imported.settings.cowPrice;
                    localStorage.setItem(PRICE_COW_KEY, state.cowPrice);
                    priceCowInput.value = state.cowPrice;
                }
                if (typeof imported.settings?.buffaloPrice === 'number') {
                    state.buffaloPrice = imported.settings.buffaloPrice;
                    localStorage.setItem(PRICE_BUFFALO_KEY, state.buffaloPrice);
                    priceBuffaloInput.value = state.buffaloPrice;
                }
                if (typeof imported.settings?.monthlyTarget === 'number') {
                    state.monthlyTarget = imported.settings.monthlyTarget;
                    localStorage.setItem(MONTHLY_TARGET_KEY, state.monthlyTarget);
                    monthlyTargetInput.value = state.monthlyTarget;
                }
                if (typeof imported.settings?.monthlyBudget === 'number') {
                    state.monthlyBudget = imported.settings.monthlyBudget;
                    localStorage.setItem(MONTHLY_BUDGET_KEY, state.monthlyBudget);
                    monthlyBudgetInput.value = state.monthlyBudget;
                }

                // Restore Theme
                if (typeof imported.settings?.isDark === 'boolean') {
                    state.isDark = imported.settings.isDark;
                    document.body.setAttribute('data-theme', state.isDark ? 'dark' : 'light');
                    localStorage.setItem(THEME_KEY, state.isDark ? 'dark' : 'light');
                    themeToggle.checked = state.isDark;
                }

                // Restore Reminder
                if (typeof imported.settings?.reminderEnabled === 'boolean') {
                     state.reminderEnabled = imported.settings.reminderEnabled;
                     localStorage.setItem(REMINDER_ENABLED_KEY, state.reminderEnabled);
                     reminderToggle.checked = state.reminderEnabled;
                     reminderTimeInput.style.display = state.reminderEnabled ? 'block' : 'none';
                }
                if (typeof imported.settings?.reminderTime === 'string') {
                     state.reminderTime = imported.settings.reminderTime;
                     localStorage.setItem(REMINDER_TIME_KEY, state.reminderTime);
                     reminderTimeInput.value = state.reminderTime;
                }
                // Re-schedule notification if needed
                if (state.reminderEnabled) await scheduleNotification();
                else await LocalNotifications.cancel({ notifications: [{ id: 1 }] });
            }

            state.data = newData;
            await saveDataToDisk();
            alert("Data and settings restored successfully!");
            loadEditorForDate(dateInput.value);
            renderSummary();
            renderFullHistory();
        } catch (err) {
            alert("Error reading file. Is it a valid backup?");
            console.error(err);
        } finally {
            restoreInput.value = '';
        }
    };
    reader.readAsText(file);
    restoreInput.value = '';
});


// --- WhatsApp Export ---
whatsappFab.addEventListener('click', () => {
    const entries = getMonthData();

    const { totalCow, totalBuff, totalCost } = calculateTotals(entries, state.cowPrice, state.buffaloPrice);

    const [year, month] = dateInput.value.split('-');
    const monthName = new Date(dateInput.value).toLocaleString('default', { month: 'long' });

    const text = `*Milk Report for ${monthName} ${year}* 🥛\n` +
                    `---------------------------\n` +
                    `Cow Milk: ${totalCow.toFixed(1)} L\n` +
                    `Buffalo Milk: ${totalBuff.toFixed(1)} L\n` +
                    `Total Cost: ₹${totalCost.toFixed(0)}\n` +
                    `---------------------------\n` +
                    `Shared from Milk Bahi\n` +
                    `Made with ❤️ by Pavneet\n` +
                    `Get the app: ${RELEASES_URL}`;

    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    recordShare();
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
        if (targetId === 'tab-history' && historyDirty) renderFullHistory();
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
    const start = parseLocalDate(startStr);
    const end = parseLocalDate(endStr);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
        alert("Please pick a valid date range (start must be on or before end).");
        return [];
    }

    // Sort chronological
    return Object.entries(data).filter(([dateStr, val]) => {
        const d = parseLocalDate(dateStr);
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
    // Red when cost exceeds the prorated monthly budget for the shown days.
    if (state.monthlyBudget > 0 && daysCount > 0 && totalCost > state.monthlyBudget * (daysCount / 30)) {
        anaProjCostEl.style.color = 'red';
    }

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
        const fileName = sanitizeFilename(`Milk_Report_${label}_${Date.now()}.csv`);

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

        recordShare();

        // Share succeeded: delete the temp Cache file.
        try {
            await Filesystem.deleteFile({ path: fileName, directory: Directory.Cache });
        } catch (cleanupErr) {
            console.warn("CSV temp cleanup failed", cleanupErr);
        }

    } catch (e) {
        if (isShareDismissed(e)) return; // User cancelled the share sheet: stay silent.
        console.error("CSV Export Failed", e);
        // Browser fallback
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", sanitizeFilename(`milk_report_${label}.csv`));
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
}

async function exportToPDF() {
    const { entries, label } = getFilteredDataForAnalytics();
    if (entries.length === 0) return alert("No data to export");

    const doc = new jsPDF();

    // jsPDF standard fonts are WinAnsi: strip anything outside Latin-1 and
    // use "Rs." consistently (the ₹ glyph is not in the base-14 fonts).
    const pdfSafeText = (s) => String(s ?? '').replace(/₹/g, 'Rs.').replace(/[^\x20-\x7E\xA0-\xFF]/g, ' ');

    doc.setFontSize(18);
    doc.text(pdfSafeText(`Milk Report`), 14, 22);
    doc.setFontSize(12);
    doc.text(pdfSafeText(label), 14, 28);

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

         doc.text(pdfSafeText(date), 14, y);
         doc.text(pdfSafeText(result.cow.toString()), 50, y);
         doc.text(pdfSafeText(result.buffalo.toString()), 70, y);
         doc.text(pdfSafeText(result.cost.toFixed(0)), 90, y);
         if (val.note) {
             // Wrap long notes; each wrapped line can trigger a page break.
             const lines = doc.splitTextToSize(pdfSafeText(val.note), 80);
             for (const line of lines) {
                 if (y > 270) {
                     doc.addPage();
                     y = 20;
                     printHeader(y);
                     y += 8;
                 }
                 doc.text(line, 120, y);
                 y += 7;
             }
         } else {
             y += 7;
         }
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
    doc.text(pdfSafeText(`Total Cow Milk: ${totalCow.toFixed(1)} L`), 14, y);
    y += 6;
    doc.text(pdfSafeText(`Total Buffalo Milk: ${totalBuff.toFixed(1)} L`), 14, y);
    y += 6;
    doc.setFontSize(14);
    doc.setTextColor(255, 0, 0); // Red for cost
    doc.text(pdfSafeText(`Grand Total Cost: Rs. ${totalCost.toFixed(0)}`), 14, y);
    y += 8;
    if (y > 260) {
        doc.addPage();
        y = 20;
    }
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 255);
    doc.textWithLink("Get the Milk Bahi app:", 14, y, { url: RELEASES_URL });
    y += 6;
    doc.textWithLink(RELEASES_URL, 14, y, { url: RELEASES_URL });

    // --- Output & Share ---
    try {
        // jsPDF 4.x dropped the 'base64' output type (returns null).
        // Derive the payload from the data URI instead.
        const dataUri = doc.output('datauristring');
        const marker = ';base64,';
        const markerIdx = dataUri.indexOf(marker);
        if (markerIdx === -1) throw new Error('PDF encoding failed: no base64 payload');
        const base64Data = dataUri.slice(markerIdx + marker.length);
        const fileName = sanitizeFilename(`Milk_Report_${label}_${Date.now()}.pdf`);

        const result = await Filesystem.writeFile({
            path: fileName,
            data: base64Data,
            directory: Directory.Cache
        });

        await Share.share({
            title: 'Milk Report PDF',
            url: result.uri
        });

        recordShare();

        // Share succeeded: delete the temp Cache file.
        try {
            await Filesystem.deleteFile({ path: fileName, directory: Directory.Cache });
        } catch (cleanupErr) {
            console.warn("PDF temp cleanup failed", cleanupErr);
        }

    } catch (e) {
        if (isShareDismissed(e)) return; // User cancelled the share sheet: stay silent.
        console.error("PDF Export Failed", e);
        // Browser fallback
        doc.save(sanitizeFilename(`milk_report_${label}.pdf`));
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

// --- Wave C wiring: settings modal a11y + history Load-more ---
// Reuses existing elements: #settings-modal, #settings-overlay, .modal-content
// dialog, #settings-btn, #menu-btn, #sidebar, #sidebar-overlay. Vanilla
// addEventListener style, no frameworks.
const settingsOverlay = document.getElementById('settings-overlay');
const settingsDialog = settingsModal ? settingsModal.querySelector('.modal-content') : null;
let lastSettingsFocus = null;

function openSettings() {
    lastSettingsFocus = document.activeElement;
    settingsModal.classList.add('active');
    if (settingsOverlay) settingsOverlay.classList.add('active');
    // Focus-in: move focus into the dialog so keyboard users land inside.
    if (settingsDialog && typeof settingsDialog.focus === 'function') {
        settingsDialog.focus();
    } else if (closeSettingsBtn && typeof closeSettingsBtn.focus === 'function') {
        closeSettingsBtn.focus();
    }
}

function closeSettings() {
    settingsModal.classList.remove('active');
    if (settingsOverlay) settingsOverlay.classList.remove('active');
    // Focus-restore: return focus to the opener (or #settings-btn fallback).
    const target = lastSettingsFocus && document.contains(lastSettingsFocus)
        ? lastSettingsFocus
        : settingsBtn;
    if (target && typeof target.focus === 'function') target.focus();
    lastSettingsFocus = null;
}

if (settingsOverlay) {
    settingsOverlay.addEventListener('click', () => closeSettings());
}

// Click whose target is #settings-modal itself (backdrop area) also closes.
settingsModal.addEventListener('click', (e) => {
    if (e.target === settingsModal) closeSettings();
});

// Escape closes star/settings first, else the sidebar (existing closeSidebar).
document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (starModal && starModal.classList.contains('active')) {
        closeStarModal();
    } else if (settingsModal.classList.contains('active')) {
        closeSettings();
    } else if (sidebar && sidebar.classList.contains('active')) {
        closeSidebar();
    }
});

const historyLoadMoreBtn = document.getElementById('history-load-more');
if (historyLoadMoreBtn) {
    historyLoadMoreBtn.addEventListener('click', () => {
        const entries = Object.entries(state.data).sort((a, b) => b[0].localeCompare(a[0]));
        historyVisibleCount += HISTORY_PAGE_SIZE;
        const next = entries.slice(historyVisibleCount - HISTORY_PAGE_SIZE, historyVisibleCount);
        const fragment = document.createDocumentFragment();
        next.forEach(([date, qty]) => {
            fragment.appendChild(createHistoryItem(date, qty));
        });
        historyListEl.appendChild(fragment);
        updateHistoryLoadMore(entries.length);
    });
}

// --- Star nudge: prompt every Nth successful report share, with a
// beginner-friendly guide (most users have never used GitHub). ---
const starModal = document.getElementById('star-modal');
const starOverlay = document.getElementById('star-overlay');
const starDialog = starModal ? starModal.querySelector('.modal-content') : null;
const closeStarBtn = document.getElementById('close-star');
const laterStarBtn = document.getElementById('later-star-btn');
const openRepoBtn = document.getElementById('open-repo-btn');
const starBtn = document.getElementById('star-btn');
let lastStarFocus = null;

function openStarModal() {
    if (!starModal) return;
    lastStarFocus = document.activeElement;
    starModal.classList.add('active');
    if (starOverlay) starOverlay.classList.add('active');
    if (starDialog && typeof starDialog.focus === 'function') starDialog.focus();
}

function closeStarModal() {
    if (!starModal) return;
    starModal.classList.remove('active');
    if (starOverlay) starOverlay.classList.remove('active');
    const target = lastStarFocus && document.contains(lastStarFocus) ? lastStarFocus : starBtn;
    if (target && typeof target.focus === 'function') target.focus();
    lastStarFocus = null;
}

// Counts a successful report share; opens the star guide on cadence.
function recordShare() {
    let count = 0;
    try {
        count = parseInt(localStorage.getItem(STAR_COUNT_KEY) || '0', 10) || 0;
        count += 1;
        localStorage.setItem(STAR_COUNT_KEY, String(count));
    } catch (_) {
        return;
    }
    if (shouldPromptStar(count)) openStarModal();
}

if (closeStarBtn) closeStarBtn.addEventListener('click', () => closeStarModal());
if (laterStarBtn) laterStarBtn.addEventListener('click', () => closeStarModal());
if (starOverlay) starOverlay.addEventListener('click', () => closeStarModal());
if (starModal) {
    starModal.addEventListener('click', (e) => {
        if (e.target === starModal) closeStarModal();
    });
}
if (openRepoBtn) {
    openRepoBtn.addEventListener('click', () => {
        window.open(REPO_URL, '_blank');
        closeStarModal();
    });
}
if (starBtn) {
    starBtn.addEventListener('click', () => openStarModal());
}

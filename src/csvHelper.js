// src/csvHelper.js

/**
 * Generates CSV content from entries.
 * @param {Array<[string, {cow: number, buffalo: number, cowPrice?: number, buffaloPrice?: number, note?: string}]>} entries
 * @param {number} defaultCowPrice
 * @param {number} defaultBuffaloPrice
 * @returns {string} The CSV content.
 */
export function generateCSVContent(entries, defaultCowPrice, defaultBuffaloPrice) {
    if (!entries || entries.length === 0) return "";

    const headers = ["Date", "Cow (L)", "Buffalo (L)", "Cow Price", "Buffalo Price", "Cost (INR)", "Note"];
    let csvContent = headers.join(",") + "\n";

    entries.forEach(([date, val]) => {
        const c = val.cow || 0;
        const b = val.buffalo || 0;
        const cP = val.cowPrice !== undefined ? val.cowPrice : defaultCowPrice;
        const bP = val.buffaloPrice !== undefined ? val.buffaloPrice : defaultBuffaloPrice;
        const cost = (c * cP) + (b * bP);

        let note = val.note || "";

        // CSV Escaping Logic
        // If note contains comma, double quote, or newline, wrap in quotes
        if (/[",\n]/.test(note)) {
            note = `"${note.replace(/"/g, '""')}"`;
        }

        const row = [
            date,
            c,
            b,
            cP,
            bP,
            cost,
            note
        ];

        csvContent += row.join(",") + "\n";
    });

    return csvContent;
}

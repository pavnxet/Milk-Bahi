import { calculateEntry } from './utils.js';

/**
 * Generates CSV content string from entries.
 * @param {Array} entries - Array of [date, value] from state.data
 * @param {number} currentCowPrice - Current default cow price
 * @param {number} currentBuffaloPrice - Current default buffalo price
 * @returns {string} CSV content (with UTF-8 BOM for Excel)
 */
export function generateCSVContent(entries, currentCowPrice, currentBuffaloPrice) {
    let csvContent = "\uFEFFDate,Cow (L),Buffalo (L),Cow Price,Buffalo Price,Cost (INR),Note\n";

    entries.forEach(([date, val]) => {
         const result = calculateEntry(val, currentCowPrice, currentBuffaloPrice);

         // RFC 4180 Compliant Escaping for Note + formula-injection guard
         let note = val.note || "";
         if (/^[=+\-@\t\r]/.test(note)) note = "'" + note;
         if (/[\r\n",]/.test(note)) {
             note = `"${note.replace(/"/g, '""')}"`;
         }

         csvContent += `${date},${result.cow},${result.buffalo},${result.cowPrice},${result.buffaloPrice},${result.cost},${note}\n`;
    });

    return csvContent;
}

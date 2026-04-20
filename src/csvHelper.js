
/**
 * Calculates the entry values based on defaults.
 * @param {Object} val - The entry object from state.data
 * @param {number} defaultCowPrice
 * @param {number} defaultBuffaloPrice
 * @returns {Object} Calculated values
 */
export function calculateEntry(val, defaultCowPrice, defaultBuffaloPrice) {
    const cow = val.cow || 0;
    const buffalo = val.buffalo || 0;
    const cowPrice = val.cowPrice !== undefined ? val.cowPrice : defaultCowPrice;
    const buffaloPrice = val.buffaloPrice !== undefined ? val.buffaloPrice : defaultBuffaloPrice;
    const cost = (cow * cowPrice) + (buffalo * buffaloPrice);
    return { cow, buffalo, cowPrice, buffaloPrice, cost };
}

/**
 * Generates CSV content string from entries.
 * @param {Array} entries - Array of [date, value] from state.data
 * @param {number} currentCowPrice - Current default cow price
 * @param {number} currentBuffaloPrice - Current default buffalo price
 * @returns {string} CSV content
 */
export function generateCSVContent(entries, currentCowPrice, currentBuffaloPrice) {
    let csvContent = "Date,Cow (L),Buffalo (L),Cow Price,Buffalo Price,Cost (INR),Note\n";

    entries.forEach(([date, val]) => {
         const result = calculateEntry(val, currentCowPrice, currentBuffaloPrice);

         // RFC 4180 Compliant Escaping for Note
         let note = val.note || "";
         if (note.includes(",") || note.includes("\n") || note.includes('"')) {
             note = `"${note.replace(/"/g, '""')}"`;
         }

         csvContent += `${date},${result.cow},${result.buffalo},${result.cowPrice},${result.buffaloPrice},${result.cost},${note}\n`;
    });

    return csvContent;
}

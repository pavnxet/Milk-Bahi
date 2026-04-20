// Lightweight PDF generation helper
export function generatePDFReport(entries, cowPrice, buffaloPrice) {
    // Simple text-based PDF content generator
    let content = "MILK REPORT\n";
    content += "============\n\n";
    
    content += "Date        Cow    Buff   Cost   Note\n";
    content += "------------------------------------------\n";
    
    let totalCow = 0, totalBuff = 0, totalCost = 0;
    
    entries.forEach(([date, val]) => {
        const cow = val.cow || 0;
        const buffalo = val.buffalo || 0;
        const cPrice = val.cowPrice || cowPrice;
        const bPrice = val.buffaloPrice || buffaloPrice;
        const cost = (cow * cPrice) + (buffalo * bPrice);
        
        totalCow += cow;
        totalBuff += buffalo;
        totalCost += cost;
        
        const note = val.note ? (val.note.length > 20 ? val.note.substring(0, 18) + '..' : val.note) : '';
        content += `${date}  ${cow.toFixed(1).padStart(5)}  ${buffalo.toFixed(1).padStart(5)}  ${cost.toFixed(0).padStart(5)}  ${note}\n`;
    });
    
    content += "\n------------------------------------------\n";
    content += `TOTALS:     ${totalCow.toFixed(1)}  ${totalBuff.toFixed(1)}  ${totalCost.toFixed(0)}\n`;
    
    return content;
}

export function downloadAsText(content, filename) {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

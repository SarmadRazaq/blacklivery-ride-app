const fs = require('fs');
const path = 'f:/BlackLivery/backend/postman_flow_tests.json';
const reportPath = 'f:/BlackLivery/backend/url_report.txt';
let report = '';

try {
    const collection = JSON.parse(fs.readFileSync(path, 'utf8'));

    function scanItems(items, parentName = '') {
        items.forEach(item => {
            const fullName = parentName ? `${parentName} > ${item.name}` : item.name;

            if (item.item) {
                // It's a folder
                scanItems(item.item, fullName);
            } else if (item.request) {
                // It's a request
                let url = '';
                if (typeof item.request.url === 'string') {
                    url = item.request.url;
                } else if (item.request.url && item.request.url.raw) {
                    url = item.request.url.raw;
                }

                if (!url || url.trim() === '') {
                    report += `[MISSING] ${fullName}\n`;
                } else if (!url.includes('{{baseUrl}}') && !url.startsWith('http')) {
                    report += `[WARNING] ${fullName}: URL might be invalid (${url})\n`;
                } else {
                    // report += `[OK] ${fullName}: ${url}\n`;
                }

                // Check specifically for the ones the user was worried about
                const criticalKeywords = ['Start', 'Verify', 'Google', 'Reset', 'Logout', 'Stripe', 'Documents', 'Bank', 'Application', 'Vehicles', 'Chat', 'Pricing', 'Surge', 'Promotions', 'Bonuses'];
                if (criticalKeywords.some(kw => item.name.includes(kw))) {
                    report += `[CHECK] ${item.name.padEnd(50)} : ${url}\n`;
                }
            }
        });
    }

    scanItems(collection.item);
    fs.writeFileSync(reportPath, report);
    console.log('Report written to ' + reportPath);

} catch (e) {
    console.error('Error:', e.message);
}

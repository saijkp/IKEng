const axios = require('axios');

exports.handler = async (event) => {
    let q = event.queryStringParameters.q || '';
    if (!q) return { statusCode: 200, body: JSON.stringify([]) };

    const options = {
        method: 'GET',
        url: 'https://otapi-1688.p.rapidapi.com/BatchSearchItemsFrame',
        params: { 
            language: 'en', 
            framePosition: '0', 
            frameSize: '40', 
            ItemTitle: q, // Removed strict "FBA/Export" forced keywords
            SortBy: 'SaleCount:Desc' // Keeps the most popular (trusted) items at the top
        },
        headers: {
            'x-rapidapi-key': '94d703de80msh2eb28d6ac171df9p1e7d96jsn48a6076fe119',
            'x-rapidapi-host': 'otapi-1688.p.rapidapi.com'
        }
    };

    try {
        const response = await axios.request(options);
        const rawItems = response.data?.Result?.Items?.Items?.Content || [];
        
        const results = rawItems.map(item => {
            const priceCny = parseFloat(item.Price?.OriginalPrice || item.Price?.Value || 0);
            const title = item.Title || "";
            
            // Clean the ID for broken links
            const rawId = item.Id || item.ExternalId || "";
            const cleanId = rawId.toString().replace(/\D/g, ''); 
            
            // Calculations
            const landedCostGbp = priceCny * 0.11 * 1.55;
            const estRetailGbp = landedCostGbp * 3.5; // Slightly higher multiplier for UK retail
            const netProfit = estRetailGbp - landedCostGbp - (estRetailGbp * 0.15) - 3.00; // Simplified Amazon Fee
            
            // --- NEW: EASY TAGGING LOGIC ---
            // Instead of hiding items, we just tag them so you can see why they appeared
            let tag = "GENERAL IMPORT";
            if (title.toLowerCase().includes('acoustic') || title.toLowerCase().includes('panel')) tag = "BUILDING MATERIAL";
            if (title.toLowerCase().includes('amazon') || title.toLowerCase().includes('cross')) tag = "FBA READY";

            let img = item.MainPictureUrl || item.ImageUrl || "";
            if (img.startsWith('//')) img = 'https:' + img;

            return {
                title: title,
                tag: tag,
                landed_gbp: landedCostGbp.toFixed(2),
                est_retail: estRetailGbp.toFixed(2),
                net_profit: netProfit.toFixed(2),
                roi: ((netProfit / landedCostGbp) * 100).toFixed(0) + "%",
                img: img,
                link: cleanId ? `https://detail.1688.com/offer/${cleanId}.html` : 'https://www.1688.com'
            };
        });

        return { 
            statusCode: 200, 
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify(results) 
        };
    } catch (e) { return { statusCode: 200, body: JSON.stringify([]) }; }
};

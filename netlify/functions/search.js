const axios = require('axios');

exports.handler = async (event) => {
    let q = event.queryStringParameters.q || '';
    if (!q) return { statusCode: 200, body: JSON.stringify([]) };

    // --- AMAZON SELLER SMART QUERY ---
    // Filters for export-ready factories familiar with FBA.
    const smartQuery = q + " 跨境 FBA Export Amazon"; 

    const options = {
        method: 'GET',
        url: 'https://otapi-1688.p.rapidapi.com/BatchSearchItemsFrame',
        params: { 
            language: 'en', 
            framePosition: '0', 
            frameSize: '40', 
            ItemTitle: smartQuery,
            SortBy: 'SaleCount:Desc' 
        },
        headers: {
            'x-rapidapi-key': '94d703de80msh2eb28d6ac171df9p1e7d96jsn48a6076fe119',
            'x-rapidapi-host': 'otapi-1688.p.rapidapi.com'
        }
    };

    try {
        const response = await axios.request(options);
        const rawItems = response.data?.Result?.Items?.Items?.Content || [];
        
        const results = rawItems.slice(0, 10).map(item => {
            const priceCny = parseFloat(item.Price?.OriginalPrice || item.Price?.Value || 0);
            
            // LINK FIX: Numerical ID Extraction to prevent broken links
            const rawId = item.Id || item.ExternalId || "";
            const cleanId = rawId.toString().replace(/\D/g, ''); 
            
            // LANDED CALCULATION (UK 2026)
            const landedCostGbp = priceCny * 0.11 * 1.55;

            // AMAZON PROFIT ESTIMATOR
            const estRetailGbp = landedCostGbp * 3.2; 
            const referralFee = estRetailGbp * 0.15;
            const fbaPickPack = 2.91; // 2026 small parcel rate
            const netProfit = estRetailGbp - landedCostGbp - referralFee - fbaPickPack;
            const roiPercent = ((netProfit / landedCostGbp) * 100).toFixed(0);

            let img = item.MainPictureUrl || item.ImageUrl || "";
            if (img.startsWith('//')) img = 'https:' + img;

            return {
                title: item.Title || "FBA Potential Listing",
                price_cny: priceCny.toFixed(2),
                landed_gbp: landedCostGbp.toFixed(2),
                est_retail: estRetailGbp.toFixed(2),
                net_profit: netProfit.toFixed(2),
                roi: roiPercent + "%",
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

const axios = require('axios');

exports.handler = async (event) => {
    let q = event.queryStringParameters.q || '';
    if (!q) return { statusCode: 200, body: JSON.stringify([]) };

    // --- MATERIAL-SPECIFIC TWEAK ---
    let smartQuery = q;
    
    // Logic: If user searches "Tiles", force it toward Indoor Porcelain/Ceramic
    if (q.toLowerCase().includes('tile')) {
        smartQuery = q + " Porcelain Ceramic Indoor"; 
    } 
    // Logic: If user searches "Slat" or "Panel", focus on Decorative Manufacturing
    else if (q.toLowerCase().includes('slat') || q.toLowerCase().includes('panel')) {
        smartQuery = q + " Decoration Manufacturer";
    }

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
        
        const results = rawItems
            .filter(item => {
                const title = (item.Title || "").toLowerCase();
                // EXCLUSION FILTER: Remove "Bricks" and "Pavement" if searching for indoor tiles
                if (q.toLowerCase().includes('tile') && (title.includes('brick') || title.includes('pave'))) {
                    return false;
                }
                return true;
            })
            .slice(0, 10)
            .map(item => {
                const priceCny = parseFloat(item.Price?.OriginalPrice || item.Price?.Value || 0);
                const rawId = item.Id || item.ExternalId || "";
                const cleanId = rawId.toString().replace(/\D/g, ''); 
                
                const factoryGbp = (priceCny * 0.11).toFixed(2);
                const landedGbp = (priceCny * 0.11 * 1.55 * 1.08).toFixed(2);

                return {
                    title: item.Title || "1688 Audit Result",
                    price_cny: priceCny.toFixed(2),
                    factory_gbp: factoryGbp,
                    landed_gbp: landedGbp,
                    img: (item.MainPictureUrl || item.ImageUrl || "").replace('http:', 'https:'),
                    link: cleanId ? `https://detail.1688.com/offer/${cleanId}.html` : 'https://www.1688.com'
                };
            });

        return { 
            statusCode: 200, 
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify(results) 
        };
    } catch (error) {
        return { statusCode: 200, body: JSON.stringify([]) };
    }
};

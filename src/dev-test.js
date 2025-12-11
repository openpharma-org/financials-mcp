// src/dev-test.js
const {
  fetchYahooProfile,
  fetchYahooSummary,
  fetchYahooEstimates,
  fetchYahooPricing,
  fetchYahooFinancials,
  fetchRevenueBreakdown,
  fetchStockNews,
  fetchStockPeers,
  fetchEconomicIndicators,
  fetchFredSeriesSearch,
  fetchFredSeriesData,
  fetchFredCategories,
  fetchFredReleases,
  fetchFredVintageData,
  fetchFredTags,
  fetchFredRegionalData,
  fetchFredSources,
  fetchFredSeriesUpdates,
  fetchFredSeriesRelationships,
  fetchFredMapsData,
  fetchMarketIndices,
  fetchStockScreener,
  fetchStockCorrelation,
  fetchYahooEarningsHistory,
  fetchYahooRecommendations,
  fetchYahooESG,
  fetchStockDividends,
  fetchStockTechnicals
} = require('./financial-api.js');

async function testYahooMethods() {
  const symbol = process.argv[2] || "TSLA";
  const method = process.argv[3] || "stock_profile";
  const searchType = process.argv[4]; // Optional parameter for stock_news

  try {
    console.log(`Testing Yahoo Finance ${method} extraction for symbol: ${symbol}`);

    if (method === "stock_profile") {
      console.log("Testing stock_profile method...");
      const result = await fetchYahooProfile({ symbol });
      console.log("Asset profile extracted successfully!");
      console.log("Converting to stock profile row...");
      console.log(JSON.stringify(result.row, null, 2));
    } else if (method === "stock_summary") {
      console.log("Testing stock_summary method...");
      const result = await fetchYahooSummary({ symbol });
      console.log("Summary data extracted successfully!");
      console.log("Converting to stock summary row...");
      console.log(JSON.stringify(result.row, null, 2));
    } else if (method === "stock_estimates") {
      console.log("Testing stock_estimates method...");
      const result = await fetchYahooEstimates({ symbol });
      console.log("Estimates data extracted successfully!");
      console.log("Converting to stock estimates row...");
      console.log(JSON.stringify(result.row, null, 2));
    } else if (method === "stock_pricing") {
      console.log("Testing stock_pricing method...");
      const result = await fetchYahooPricing({ symbol });
      console.log("Pricing data extracted successfully!");
      console.log("Converting to stock pricing row...");
      console.log(JSON.stringify(result.row, null, 2));
    } else if (method === "stock_financials") {
      console.log("Testing stock_financials method...");
      const result = await fetchYahooFinancials({ symbol });
      console.log("Financial data extracted successfully!");
      console.log("Converting to stock financials row...");
      console.log(JSON.stringify(result.row, null, 2));
    } else if (method === "stock_revenue_breakdown") {
      console.log("Testing stock_revenue_breakdown method...");
      const result = await fetchRevenueBreakdown({ symbol });
      console.log("Revenue breakdown data extracted successfully!");
      console.log("Converting to revenue breakdown rows...");
      console.log(JSON.stringify(result.rows, null, 2));
    } else if (method === "stock_news") {
      console.log("Testing stock_news method...");
      
      // Support both stock symbols and general search
      const params = { symbol };
      if (searchType === 'general') {
        params.search_type = 'general';
        console.log(`Using general search for: "${symbol}"`);
      } else {
        console.log(`Using stock-specific search for: ${symbol}`);
      }
      
      const result = await fetchStockNews(params);
      console.log("Stock news data extracted successfully!");
      console.log("Converting to news rows...");
      console.log(JSON.stringify(result.rows, null, 2));
    } else if (method === "stock_peers") {
      console.log("Testing stock_peers method...");
      const result = await fetchStockPeers({ symbol });
      console.log("Peer comparison data extracted successfully!");
      console.log("Converting to peer comparison rows...");
      console.log(JSON.stringify(result.rows, null, 2));
    } else if (method === "economic_indicators") {
      console.log("Testing economic_indicators method...");
      const result = await fetchEconomicIndicators();
      console.log("Economic indicators data extracted successfully!");
      console.log("Converting to economic indicators rows...");
      console.log(JSON.stringify(result.rows, null, 2));
    } else if (method === "market_indices") {
      console.log("Testing market_indices method...");
      const result = await fetchMarketIndices();
      console.log("Market indices data extracted successfully!");
      console.log("Converting to market indices rows...");
      console.log(JSON.stringify(result.rows, null, 2));
    } else if (method === "stock_screener") {
      console.log("Testing stock_screener method...");
      let criteria = {};
      try {
        criteria = JSON.parse(symbol || '{}');
      } catch (e) {
        criteria = { maxResults: 5, maxPE: 30 }; // Default test criteria
      }
      console.log("Using criteria:", criteria);
      const result = await fetchStockScreener({ criteria });
      console.log("Stock screener data extracted successfully!");
      console.log("Converting to screener rows...");
      console.log(JSON.stringify(result.rows, null, 2));
    } else if (method === "stock_correlation") {
      console.log("Testing stock_correlation method...");
      const symbols = symbol ? symbol.split(',').map(s => s.trim().toUpperCase()) : ['AAPL', 'MSFT'];
      console.log("Analyzing correlation for:", symbols);
      const result = await fetchStockCorrelation({ symbols });
      console.log("Stock correlation data extracted successfully!");
      console.log("Converting to correlation rows...");
      console.log(JSON.stringify(result.rows, null, 2));
    } else if (method === "stock_earnings_history") {
      console.log("Testing stock_earnings_history method...");
      const result = await fetchYahooEarningsHistory({ symbol });
      console.log("Earnings history data extracted successfully!");
      console.log("Converting to stock earnings history rows...");
      console.log(JSON.stringify(result.rows, null, 2));
    } else if (method === "stock_recommendations") {
      console.log("Testing stock_recommendations method...");
      const result = await fetchYahooRecommendations({ symbol });
      console.log("Recommendations data extracted successfully!");
      console.log("Converting to stock recommendations rows...");
      console.log(JSON.stringify(result.rows, null, 2));
    } else if (method === "stock_esg") {
      console.log("Testing stock_esg method...");
      const result = await fetchYahooESG({ symbol });
      console.log("ESG data extracted successfully!");
      console.log("Converting to stock ESG row...");
      console.log(JSON.stringify(result.row, null, 2));
    } else if (method === "stock_dividends") {
      console.log("Testing stock_dividends method...");
      const result = await fetchStockDividends({ symbol });
      console.log("Dividend data extracted successfully!");
      console.log("Converting to stock dividend row...");
      console.log(JSON.stringify(result.row, null, 2));
      } else if (method === "stock_technicals") {
    console.log("Testing stock_technicals method...");
    const result = await fetchStockTechnicals({ symbol });
    console.log("Technical data extracted successfully!");
    console.log("Converting to stock technical row...");
    console.log(JSON.stringify(result.row, null, 2));
  } else if (method === "fred_series_search") {
    console.log("Testing fred_series_search method...");
    const searchTerms = symbol; // Use symbol as search terms
    const result = await fetchFredSeriesSearch({ searchTerms, limit: 10 });
    console.log("FRED series search completed successfully!");
    console.log("Converting to search rows...");
    console.log(JSON.stringify(result.rows, null, 2));
  } else if (method === "fred_series_data") {
    console.log("Testing fred_series_data method...");
    const seriesId = symbol; // Use symbol as series ID
    const result = await fetchFredSeriesData({ seriesId, limit: 10 });
    console.log("FRED series data extracted successfully!");
    console.log("Converting to series data rows...");
    console.log(JSON.stringify(result.rows, null, 2));
  } else if (method === "fred_categories") {
    console.log("Testing fred_categories method...");
    const categoryId = symbol || null; // Use symbol as category ID (optional)
    const result = await fetchFredCategories({ categoryId, limit: 20 });
    console.log("FRED categories extracted successfully!");
    console.log("Converting to categories rows...");
    console.log(JSON.stringify(result.rows, null, 2));
  } else if (method === "fred_releases") {
    console.log("Testing fred_releases method...");
    const result = await fetchFredReleases({ limit: 20 });
    console.log("FRED releases extracted successfully!");
    console.log("Converting to releases rows...");
    console.log(JSON.stringify(result.rows, null, 2));
  } else if (method === "fred_vintage_data") {
    console.log("Testing fred_vintage_data method...");
    const seriesId = symbol; // Use symbol as series ID
    const result = await fetchFredVintageData({ seriesId });
    console.log("FRED vintage data extracted successfully!");
    console.log("Converting to vintage data rows...");
    console.log(JSON.stringify(result.rows, null, 2));
  } else if (method === "fred_tags") {
    console.log("Testing fred_tags method...");
    const searchText = symbol === '' ? '' : symbol; // Use symbol as search text for tags
    const result = await fetchFredTags({ searchText, limit: 20 });
    console.log("FRED tags extracted successfully!");
    console.log("Converting to tag rows...");
    console.log(JSON.stringify(result.rows, null, 2));
  } else if (method === "fred_regional_data") {
    console.log("Testing fred_regional_data method...");
    const tagNames = symbol; // Use symbol as tag names for regional data
    const result = await fetchFredRegionalData({ tagNames, limit: 20 });
    console.log("FRED regional data extracted successfully!");
    console.log("Converting to regional data rows...");
    console.log(JSON.stringify(result.rows, null, 2));
  } else if (method === "fred_sources") {
    console.log("Testing fred_sources method...");
    // Only use symbol as sourceId if it's a number, otherwise get all sources
    const sourceId = (symbol && !isNaN(symbol)) ? symbol : null;
    const result = await fetchFredSources({ sourceId, limit: 20 });
    console.log("FRED sources extracted successfully!");
    console.log("Converting to sources rows...");
    console.log(JSON.stringify(result.rows, null, 2));
  } else if (method === "fred_series_updates") {
    console.log("Testing fred_series_updates method...");
    const result = await fetchFredSeriesUpdates({ limit: 20 });
    console.log("FRED series updates extracted successfully!");
    console.log("Converting to updates rows...");
    console.log(JSON.stringify(result.rows, null, 2));
  } else if (method === "fred_series_relationships") {
    console.log("Testing fred_series_relationships method...");
    const seriesId = symbol; // Use symbol as series ID
    const result = await fetchFredSeriesRelationships({ seriesId });
    console.log("FRED series relationships extracted successfully!");
    console.log("Converting to relationships rows...");
    console.log(JSON.stringify(result.rows, null, 2));
  } else if (method === "fred_maps_data") {
    console.log("Testing fred_maps_data method...");
    const region = symbol || 'state'; // Use symbol as region or default to state
    const result = await fetchFredMapsData({ region, limit: 20 });
    console.log("FRED maps data extracted successfully!");
    console.log("Converting to maps rows...");
    console.log(JSON.stringify(result.rows, null, 2));
  } else {
    console.error("Unknown method. Available methods: stock_profile, stock_summary, stock_estimates, stock_pricing, stock_financials, stock_revenue_breakdown, stock_news, stock_peers, economic_indicators, fred_series_search, fred_series_data, fred_categories, fred_releases, fred_vintage_data, fred_tags, fred_regional_data, fred_sources, fred_series_updates, fred_series_relationships, fred_maps_data, market_indices, stock_screener, stock_correlation, stock_earnings_history, stock_recommendations, stock_esg, stock_dividends, stock_technicals");
    process.exit(1);
  }

    console.log("\n✅ Test completed successfully!");
  } catch (error) {
    console.error("❌ Test failed:");
    console.error(error.message);
    process.exit(1);
  }
}

testYahooMethods();

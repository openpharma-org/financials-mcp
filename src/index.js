#!/usr/bin/env node

/**
 * Yahoo Finance & FRED Economic Data MCP Server
 * 
 * A comprehensive Model Context Protocol (MCP) server providing professional-grade
 * financial intelligence through Yahoo Finance and Federal Reserve Economic Data (FRED).
 * 
 * Features:
 * - 26 Financial Analysis Methods
 * - Real-time Market Data & Economic Indicators  
 * - Advanced Analytics & Portfolio Management
 * - News Sentiment Analysis
 * - Peer Comparison & Stock Screening
 * - FRED Economic Data Integration
 * 
 * @version 0.1.0
 * @author Yahoo Finance MCP Team
 * @license MIT
 */

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} = require('@modelcontextprotocol/sdk/types.js');

// Import all financial data extraction modules
const {
  // Core Stock Analysis Methods
  fetchYahooProfile,
  fetchYahooSummary,
  fetchYahooEstimates,
  fetchYahooPricing,
  fetchYahooFinancials,
  fetchRevenueBreakdown,
  fetchYahooEarningsHistory,
  fetchYahooRecommendations,
  fetchYahooESG,
  fetchStockDividends,
  fetchStockTechnicals,
  
  // Advanced Analytics Methods
  fetchStockNews,
  fetchStockPeers,
  fetchStockScreener,
  fetchStockCorrelation,
  
  // Economic & Market Intelligence
  fetchEconomicIndicators,
  fetchMarketIndices,
  
  // FRED Economic Data Methods
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
  fetchFredMapsData
} = require('./financial-api.js');

// Server Configuration
const SERVER_INFO = {
  name: 'financial-mcp-server',
  version: '0.1.0',
  description: 'World-Class Financial & Economic Intelligence Platform'
};

// Initialize MCP Server
const server = new Server(
  SERVER_INFO,
  {
    capabilities: {
      tools: {},
    },
  }
);

/**
 * Method Categories for Financial Intelligence Platform
 */
const METHOD_CATEGORIES = {
  CORE_STOCK: {
    name: "Core Stock Analysis",
    description: "Fundamental company and financial metrics",
    methods: ['stock_profile', 'stock_summary', 'stock_estimates', 'stock_pricing', 'stock_financials', 'stock_revenue_breakdown', 'stock_earnings_history', 'stock_recommendations', 'stock_esg', 'stock_dividends', 'stock_technicals']
  },
  ADVANCED_ANALYTICS: {
    name: "Advanced Analytics",
    description: "Sophisticated analysis and discovery tools",
    methods: ['stock_news', 'stock_peers', 'stock_screener', 'stock_correlation']
  },
  ECONOMIC_INTELLIGENCE: {
    name: "Economic & Market Intelligence", 
    description: "Macro-economic data and market indicators",
    methods: ['economic_indicators', 'market_indices']
  },
  FRED_DATA: {
    name: "FRED Economic Data",
    description: "Federal Reserve Economic Data integration",
    methods: ['fred_series_search', 'fred_series_data', 'fred_categories', 'fred_releases', 'fred_vintage_data', 'fred_tags', 'fred_regional_data', 'fred_sources', 'fred_series_updates', 'fred_series_relationships', 'fred_maps_data']
  }
};

/**
 * Complete method definitions with detailed examples and use cases
 */
const ALL_METHODS = [
  // Core Stock Analysis Methods
  'stock_profile', 'stock_summary', 'stock_estimates', 'stock_pricing', 'stock_financials', 
  'stock_revenue_breakdown', 'stock_earnings_history', 'stock_recommendations', 'stock_esg', 
  'stock_dividends', 'stock_technicals',
  
  // Advanced Analytics Methods
  'stock_news', 'stock_peers', 'stock_screener', 'stock_correlation',
  
  // Economic & Market Intelligence
  'economic_indicators', 'market_indices',
  
  // FRED Economic Data Methods
  'fred_series_search', 'fred_series_data', 'fred_categories', 'fred_releases', 
  'fred_vintage_data', 'fred_tags', 'fred_regional_data', 'fred_sources', 
  'fred_series_updates', 'fred_series_relationships', 'fred_maps_data'
];

// Define tools with comprehensive documentation
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
            tools: [
          {
            name: 'financial-intelligence',
        description: `🚀 WORLD-CLASS FINANCIAL & ECONOMIC INTELLIGENCE PLATFORM

A comprehensive MCP server providing institutional-grade financial analysis through 26 specialized methods:

📈 CORE STOCK ANALYSIS (11 methods):
• Company profiles, financials, estimates, pricing, ESG, dividends, technicals
• Revenue breakdowns, earnings history, analyst recommendations

📊 ADVANCED ANALYTICS (4 methods):  
• News sentiment analysis, peer comparison, stock screening, correlation analysis

🏦 ECONOMIC INTELLIGENCE (2 methods):
• Market indices, comprehensive economic indicators dashboard

📋 FRED ECONOMIC DATA (12 methods):
• Search 800,000+ economic series, fetch data, browse categories
• Economic calendar, vintage analysis, regional data, tag discovery
• Source transparency, real-time updates, deep relationships, geographic maps

💡 KEY FEATURES:
✅ Real-time market data & economic indicators
✅ Advanced sentiment analysis & peer comparison  
✅ Portfolio correlation & risk analysis
✅ Multi-criteria stock discovery & screening
✅ Federal Reserve economic data integration
✅ Professional-grade financial intelligence

🔑 FRED API REQUIRED: Set FRED_API_KEY environment variable for full functionality`,

        inputSchema: {
          type: 'object',
          properties: {
            method: {
              type: 'string',
              enum: ALL_METHODS,
              description: `📋 ANALYSIS METHOD SELECTION:

🏢 CORE STOCK ANALYSIS:
• stock_profile - Company details, address, industry, employees, business summary
• stock_summary - Key metrics: market cap, P/E, EPS, beta, enterprise values  
• stock_estimates - Analyst EPS/revenue estimates, price targets, recommendations
• stock_pricing - Real-time pricing, volume, daily ranges, extended hours
• stock_financials - Cash flow, income highlights, balance sheet ratios
• stock_revenue_breakdown - Revenue by business segment & geography
• stock_earnings_history - Historical EPS trends & earnings analysis
• stock_recommendations - Analyst rating trends & consensus changes
• stock_esg - Environmental, Social, Governance scores & controversies
• stock_dividends - Dividend history, yield calculations, payout ratios
• stock_technicals - Technical indicators, moving averages, volatility

📈 ADVANCED ANALYTICS:
• stock_news - Recent news with sentiment analysis (stock-specific or general search)
• stock_peers - Industry peer comparison based on key financial metrics
• stock_screener - Multi-criteria stock discovery (filter by P/E, market cap, etc.)
• stock_correlation - Portfolio correlation analysis for risk management

🌍 ECONOMIC & MARKET:
• economic_indicators - Comprehensive macro dashboard (GDP, unemployment, inflation, rates)
• market_indices - Major indices (S&P 500, NASDAQ, DOW, VIX) & sector performance

🏦 FRED ECONOMIC DATA:
• fred_series_search - Search 800,000+ economic series by keywords (no API key for search)
• fred_series_data - Fetch specific FRED series observations (requires API key)
• fred_categories - Browse economic data categories hierarchically (requires API key)
• fred_releases - Economic calendar with release schedules (requires API key)
• fred_vintage_data - Historical data revision analysis (requires API key)
• fred_tags - Tag-based economic concept discovery (requires API key)
• fred_regional_data - Geographic economic analysis (state/MSA data) (requires API key)
• fred_sources - Data source transparency and quality assessment (requires API key)
• fred_series_updates - Real-time monitoring of recently updated indicators (requires API key)
• fred_series_relationships - Deep metadata analysis and series connections (requires API key)
• fred_maps_data - Geographic economic data visualization and mapping (requires API key)`,
              
              examples: [
                'stock_profile',
                'stock_summary', 
                'stock_estimates',
                'stock_pricing',
                'stock_news',
                'stock_screener',
                'economic_indicators',
                'fred_series_search',
                'market_indices'
              ]
            },
            
            symbol: {
              type: 'string',
              description: `📊 INPUT PARAMETER (context-dependent):

🏢 FOR STOCK METHODS: Stock ticker symbol
   Examples: "AAPL", "TSLA", "MSFT", "GOOGL", "NVDA"

🔍 FOR SEARCH METHODS: Search terms/keywords  
   Examples: "unemployment", "GDP", "inflation", "tesla bitcoin"

📋 FOR SCREENER: JSON criteria object
   Example: '{"maxPE":20,"minMarketCap":1000000000,"minDividendYield":2}'

📈 FOR CORRELATION: Comma-separated symbols
   Example: "AAPL,MSFT,GOOGL,AMZN,TSLA"

🏦 FOR FRED DATA: Series ID, category ID, or search terms
   Examples: "UNRATE" (unemployment), "GDP", "10" (category), "regional"

💡 FOR MARKET/ECONOMIC: Empty string or any value (ignored)
   Example: "" or "market_overview"`,
              
              examples: [
                'AAPL',
                'TSLA', 
                'tesla bitcoin',
                '{"maxPE":20,"minMarketCap":1000000000}',
                'AAPL,MSFT,GOOGL',
                'UNRATE',
                'unemployment',
                ''
              ]
            },
            
            search_type: {
              type: 'string',
              enum: ['stock', 'general'],
              description: `🔍 NEWS SEARCH TYPE (for stock_news method only):

📈 "stock" - Stock-specific news from Yahoo Finance quote page
   • Company announcements, earnings reports, analyst updates
   • Financial news directly related to the specific ticker
   • Structured news data with sentiment analysis

🌐 "general" - General search across Yahoo News  
   • Broader market news, economic events, industry trends
   • Search by keywords (e.g., "tesla bitcoin", "fed rate cuts")
   • Comprehensive news coverage with sentiment analysis

💡 DEFAULT: "stock" (if not specified)`,
              
              examples: ['stock', 'general']
            }
          },
          required: ['method'],
          additionalProperties: false
        }
      }
    ]
  };
});

/**
 * Input Validation & Processing Functions
 */
function validateAndProcessInput({ method, symbol, search_type }) {
  // Validate method
  if (!method) {
    throw new Error(`❌ METHOD REQUIRED: Please specify a method from: ${ALL_METHODS.join(', ')}`);
  }
  
  if (!ALL_METHODS.includes(method)) {
    throw new Error(`❌ INVALID METHOD: "${method}". Available methods: ${ALL_METHODS.join(', ')}`);
  }

  // Methods that don't require symbol parameter
  const noSymbolRequired = ['economic_indicators', 'market_indices', 'fred_categories', 'fred_releases', 'fred_tags', 'fred_series_updates'];
  
  // Validate symbol for methods that require it
  if (!symbol && !noSymbolRequired.includes(method)) {
    const examplesByMethod = {
      stock_profile: 'AAPL',
      stock_screener: '{"maxPE":20,"minMarketCap":1000000000}',
      stock_correlation: 'AAPL,MSFT,GOOGL',
      fred_series_search: 'unemployment',
      fred_series_data: 'UNRATE',
      fred_vintage_data: 'GDP',
      fred_regional_data: 'state',
      fred_sources: '1',
      fred_series_relationships: 'UNRATE',
      fred_maps_data: 'state'
    };
    
    const example = examplesByMethod[method] || 'AAPL';
    throw new Error(`❌ SYMBOL REQUIRED: Method "${method}" requires a symbol parameter. Example: "${example}"`);
  }

  // Process symbol based on method type
  let processedSymbol = symbol;
  
  if (method === 'stock_correlation' && symbol) {
    // Validate comma-separated symbols
    const symbols = symbol.split(',').map(s => s.trim()).filter(s => s);
    if (symbols.length < 2) {
      throw new Error(`❌ CORRELATION REQUIRES 2+ SYMBOLS: Provide comma-separated symbols like "AAPL,MSFT,GOOGL"`);
    }
    processedSymbol = symbols.join(',');
  }
  
  if (method === 'stock_screener' && symbol) {
    // Validate JSON criteria
    try {
      JSON.parse(symbol);
    } catch (e) {
      throw new Error(`❌ INVALID SCREENER CRITERIA: Symbol must be valid JSON. Example: '{"maxPE":20,"minMarketCap":1000000000}'`);
    }
  }

  return { method, symbol: processedSymbol, search_type };
}

/**
 * Enhanced Tool Call Handler with Professional Error Handling
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  // Validate tool name
  if (name !== 'financial-intelligence') {
    return {
      content: [{
        type: 'text',
        text: `❌ UNKNOWN TOOL: "${name}"\n\n🔧 Available tool: "financial-intelligence"\n\n📋 Use method parameter to specify analysis type.`
      }]
    };
  }

  try {
    // Validate and process input parameters
    const { method, symbol, search_type } = validateAndProcessInput(args);

    // Processing request - MCP servers avoid console.log to prevent Claude errors
    let results;
    
    // Route to appropriate analysis method
    switch (method) {
      
      // ═══════════════════════════════════════════════════════════════
      //                     CORE STOCK ANALYSIS
      // ═══════════════════════════════════════════════════════════════
      
      case 'stock_profile': {
        results = await fetchYahooProfile({ symbol });
        return {
          content: [
            { type: 'text', text: `📈 **COMPANY PROFILE ANALYSIS**\n\n${results.markdown}` }
          ]
        };
      }
      
      case 'stock_summary': {
        results = await fetchYahooSummary({ symbol });
        return {
          content: [
            { type: 'text', text: `💰 **FINANCIAL SUMMARY**\n\n${results.markdown}` }
          ]
        };
      }
      
      case 'stock_estimates': {
        results = await fetchYahooEstimates({ symbol });
        return {
          content: [
            { type: 'text', text: `🎯 **ANALYST ESTIMATES & TARGETS**\n\n${results.markdown}` }
          ]
        };
      }
      
      case 'stock_pricing': {
        results = await fetchYahooPricing({ symbol });
        return {
          content: [
            { type: 'text', text: `💵 **REAL-TIME PRICING DATA**\n\n${results.markdown}` }
          ]
        };
      }
      
      case 'stock_financials': {
        results = await fetchYahooFinancials({ symbol });
        return {
          content: [
            { type: 'text', text: `📋 **FINANCIAL METRICS & RATIOS**\n\n${results.markdown}` }
          ]
        };
      }

      case 'stock_revenue_breakdown': {
        results = await fetchRevenueBreakdown({ symbol });
        return {
          content: [
            { type: 'text', text: `📊 **REVENUE BREAKDOWN ANALYSIS**\n\n${results.markdown}` }
          ]
        };
      }

      case 'stock_earnings_history': {
        results = await fetchYahooEarningsHistory({ symbol });
        return {
          content: [
            { type: 'text', text: `📈 **EARNINGS HISTORY & TRENDS**\n\n${results.markdown}` }
          ]
        };
      }
      
      case 'stock_recommendations': {
        results = await fetchYahooRecommendations({ symbol });
        return {
          content: [
            { type: 'text', text: `🎯 **ANALYST RECOMMENDATIONS**\n\n${results.markdown}` }
          ]
        };
      }
      
      case 'stock_esg': {
        results = await fetchYahooESG({ symbol });
        return {
          content: [
            { type: 'text', text: `🌱 **ESG ANALYSIS**\n\n${results.markdown}` }
          ]
        };
      }

      case 'stock_dividends': {
        results = await fetchStockDividends({ symbol });
        return {
          content: [
            { type: 'text', text: `💰 **DIVIDEND ANALYSIS**\n\n${results.markdown}` }
          ]
        };
      }

      case 'stock_technicals': {
        results = await fetchStockTechnicals({ symbol });
        return {
          content: [
            { type: 'text', text: `📈 **TECHNICAL ANALYSIS**\n\n${results.markdown}` }
          ]
        };
      }

      // ═══════════════════════════════════════════════════════════════
      //                    ADVANCED ANALYTICS
      // ═══════════════════════════════════════════════════════════════

      case 'stock_news': {
        results = await fetchStockNews({ symbol, search_type });
        return {
          content: [
            { type: 'text', text: `📰 **NEWS & SENTIMENT ANALYSIS**\n\n${results.markdown}` }
          ]
        };
      }

      case 'stock_peers': {
        results = await fetchStockPeers({ symbol });
        return {
          content: [
            { type: 'text', text: `🏭 **PEER COMPARISON ANALYSIS**\n\n${results.markdown}` }
          ]
        };
      }

      case 'stock_screener': {
        let criteria = {};
        try {
          criteria = JSON.parse(symbol || '{}');
        } catch (e) {
          criteria = { maxResults: 10 };
        }
        
        results = await fetchStockScreener({ criteria });
        return {
          content: [
            { type: 'text', text: `🔍 **STOCK SCREENING RESULTS**\n\n${results.markdown}` }
          ]
        };
      }

      case 'stock_correlation': {
        const symbols = symbol ? symbol.split(',').map(s => s.trim().toUpperCase()) : [];
        
        results = await fetchStockCorrelation({ symbols });
        return {
          content: [
            { type: 'text', text: `📊 **CORRELATION ANALYSIS**\n\n${results.markdown}` }
          ]
        };
      }

      // ═══════════════════════════════════════════════════════════════
      //                ECONOMIC & MARKET INTELLIGENCE
      // ═══════════════════════════════════════════════════════════════

      case 'economic_indicators': {
        results = await fetchEconomicIndicators();
        return {
          content: [
            { type: 'text', text: `🌍 **ECONOMIC INDICATORS DASHBOARD**\n\n${results.markdown}` }
          ]
        };
      }

      case 'market_indices': {
        results = await fetchMarketIndices();
        return {
          content: [
            { type: 'text', text: `📈 **MARKET INDICES & SECTORS**\n\n${results.markdown}` }
          ]
        };
      }

      // ═══════════════════════════════════════════════════════════════
      //                      FRED ECONOMIC DATA
      // ═══════════════════════════════════════════════════════════════

      case 'fred_series_search': {
        const searchTerms = symbol || '';
        
        results = await fetchFredSeriesSearch({ searchTerms, limit: 10 });
        return {
          content: [
            { type: 'text', text: `🔍 **FRED SERIES SEARCH RESULTS**\n\n${results.markdown}` }
          ]
        };
      }

      case 'fred_series_data': {
        const seriesId = symbol || '';
        
        results = await fetchFredSeriesData({ seriesId, limit: 10 });
        return {
          content: [
            { type: 'text', text: `📊 **FRED SERIES DATA**\n\n${results.markdown}` }
          ]
        };
      }

      case 'fred_categories': {
        const categoryId = symbol || null;
        
        results = await fetchFredCategories({ categoryId, limit: 20 });
        return {
          content: [
            { type: 'text', text: `📁 **FRED ECONOMIC CATEGORIES**\n\n${results.markdown}` }
          ]
        };
      }

      case 'fred_releases': {
        results = await fetchFredReleases({ limit: 20 });
        return {
          content: [
            { type: 'text', text: `📅 **FRED ECONOMIC CALENDAR**\n\n${results.markdown}` }
          ]
        };
      }

      case 'fred_vintage_data': {
        const seriesId = symbol;
        
        results = await fetchFredVintageData({ seriesId });
        return {
          content: [
            { type: 'text', text: `📊 **FRED VINTAGE DATA ANALYSIS**\n\n${results.markdown}` }
          ]
        };
      }

      case 'fred_tags': {
        const searchText = symbol || '';
        
        results = await fetchFredTags({ searchText, limit: 20 });
        return {
          content: [
            { type: 'text', text: `🏷️ **FRED ECONOMIC TAGS**\n\n${results.markdown}` }
          ]
        };
      }

      case 'fred_regional_data': {
        const tagNames = symbol;
        
        results = await fetchFredRegionalData({ tagNames, limit: 20 });
        return {
          content: [
            { type: 'text', text: `🗺️ **FRED REGIONAL ECONOMIC DATA**\n\n${results.markdown}` }
          ]
        };
      }

      case 'fred_sources': {
        const sourceId = symbol || null;
        
        results = await fetchFredSources({ sourceId, limit: 20 });
        return {
          content: [
            { type: 'text', text: `🏛️ **FRED DATA SOURCES**\n\n${results.markdown}` }
          ]
        };
      }

      case 'fred_series_updates': {
        results = await fetchFredSeriesUpdates({ limit: 20 });
        return {
          content: [
            { type: 'text', text: `⚡ **FRED SERIES UPDATES**\n\n${results.markdown}` }
          ]
        };
      }

      case 'fred_series_relationships': {
        const seriesId = symbol;
        
        results = await fetchFredSeriesRelationships({ seriesId });
        return {
          content: [
            { type: 'text', text: `🔗 **FRED SERIES RELATIONSHIPS**\n\n${results.markdown}` }
          ]
        };
      }

      case 'fred_maps_data': {
        const region = symbol || 'state';
        
        results = await fetchFredMapsData({ region, limit: 20 });
        return {
          content: [
            { type: 'text', text: `🗺️ **FRED GEOGRAPHIC MAPS DATA**\n\n${results.markdown}` }
          ]
        };
      }
      
      // ═══════════════════════════════════════════════════════════════
      //                        ERROR HANDLING
      // ═══════════════════════════════════════════════════════════════
      
      default:
        return {
          content: [{
            type: 'text',
            text: `❌ UNKNOWN METHOD: "${method}"\n\n🔧 Available methods:\n${ALL_METHODS.map(m => `• ${m}`).join('\n')}\n\n💡 Use the method parameter to specify your analysis type.`
          }]
        };
    }
  } catch (error) {
    // Error logged internally - MCP servers avoid console to prevent Claude errors
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return {
      content: [
        {
          type: 'text',
          text: `❌ **YAHOO FINANCE MCP ERROR**

**Error Details:**
${errorMessage}

**Troubleshooting Tips:**
🔧 Verify your method and symbol parameters
🔑 Ensure FRED_API_KEY is set for FRED methods
📊 Check symbol format (e.g., "AAPL" for stocks, JSON for screener)
🌐 Verify internet connectivity

**Need Help?**
📖 Check README.md for examples
💬 Review method descriptions in tool definition
🔍 Try a different symbol or method

**Example Usage:**
• method: "stock_profile", symbol: "AAPL"
• method: "fred_series_search", symbol: "unemployment"
• method: "economic_indicators", symbol: ""
• method: "stock_screener", symbol: '{"maxPE":20}'`
        }
      ]
    };
  }
});

/**
 * Server Initialization and Startup
 */
async function main() {
  try {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    
    // Server started successfully - logging avoided to prevent Claude errors
    
  } catch (error) {
    // Failed to start server - error logged internally
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  // Shutting down - logging avoided to prevent Claude errors
  process.exit(0);
});

process.on('SIGTERM', () => {
  // Terminated - logging avoided to prevent Claude errors  
  process.exit(0);
});

// Start the server
main().catch((error) => {
  // Fatal error - logged internally to prevent Claude errors
  process.exit(1);
});

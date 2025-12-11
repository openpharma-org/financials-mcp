# Financial Intelligence MCP Server 🚀

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A comprehensive **Model Context Protocol (MCP) server** that provides professional-grade access to financial and economic data. This server transforms AI assistants into powerful financial analysis platforms with access to Yahoo Finance data, Federal Reserve Economic Data (FRED), and advanced analytics capabilities.

## 🌟 **World-Class Features**

### 📊 **Yahoo Finance Integration**
- **Real-time stock data** with pricing, financials, and estimates
- **Company intelligence** including profiles, news, and ESG metrics
- **Advanced analytics** with peer comparison and technical indicators
- **Revenue analysis** by segment and geography
- **Executive information** and corporate governance data

### 🏦 **Federal Reserve Economic Data (FRED)** - 12 Methods
- **800,000+ economic series** with professional discovery tools
- **Real-time economic monitoring** with automated updates
- **Data source transparency** and quality assessment
- **Deep metadata analysis** with relationships mapping
- **Historical data revisions** and vintage analysis
- **Geographic economic data** with mapping visualization
- **Economic calendar** with release schedules
- **Tag-based discovery** system for precise data finding

### 🔬 **Advanced Analytics**
- **Portfolio correlation analysis** for risk management
- **Stock screening** with multi-criteria discovery
- **Sentiment analysis** on financial news
- **Technical analysis** with moving averages and indicators
- **Economic health scoring** with recession indicators
- **Yield curve analysis** and monetary policy insights

### ⚡ **Production-Ready**
- **Rate limiting** and intelligent caching
- **Robust error handling** with fallback systems
- **Professional data formatting** (JSON + Markdown)
- **MCP protocol compliance** for seamless AI integration

---

## 🚀 **Quick Start**

### Installation

```bash
git clone https://github.com/openpharma-org/financials-mcp.git
cd financial-mcp-server
npm install
```

### MCP Configuration

Add to your Claude Desktop or MCP client:

```json
{
  "mcpServers": {
    "financial-intelligence": {
      "command": "npx",
      "args": ["-y", "@openpharma-org/financials-mcp"],
      "env": {
        "FRED_API_KEY": "your-fred-api-key-here"
      }
    }
  }
}
```

**Get your free FRED API key**: [https://fred.stlouisfed.org/docs/api/api_key.html](https://fred.stlouisfed.org/docs/api/api_key.html)

---

## 📈 **Complete API Reference**

### **📊 Core Stock Analysis**

#### `stock_profile` - Company Intelligence
Comprehensive company information including risk metrics and business details.
```bash
npm test TSLA stock_profile
```

#### `stock_summary` - Financial KPIs  
Key financial metrics including market cap, P/E ratios, and enterprise values.
```bash
npm test AAPL stock_summary
```

#### `stock_estimates` - Analyst Forecasts
Earnings estimates, revenue projections, and price targets from analysts.
```bash
npm test GOOGL stock_estimates
```

#### `stock_pricing` - Real-time Pricing
Current and extended-hours pricing with volume and market status.
```bash
npm test MSFT stock_pricing
```

#### `stock_financials` - Financial Performance
Cash flow, margins, growth rates, and financial health metrics.
```bash
npm test AMZN stock_financials
```

### **🔍 Advanced Stock Analytics**

#### `stock_revenue_breakdown` - Revenue Analysis
Revenue by business segment and geographic regions.
```bash
npm test TSLA stock_revenue_breakdown
```

#### `stock_news` - News & Sentiment
Recent news articles with AI-powered sentiment analysis.
```bash
npm test AAPL stock_news
npm test "tesla bitcoin" stock_news general  # General search
```

#### `stock_peers` - Industry Comparison
Peer analysis with industry benchmarking and relative valuation.
```bash
npm test NVDA stock_peers
```

#### `stock_recommendations` - Analyst Ratings
Buy/sell/hold recommendations with analyst consensus trends.
```bash
npm test META stock_recommendations
```

#### `stock_esg` - ESG Metrics
Environmental, Social, and Governance scores with controversy assessment.
```bash
npm test TSLA stock_esg
```

#### `stock_dividends` - Dividend Analysis
Dividend history, yield analysis, and payout sustainability metrics.
```bash
npm test KO stock_dividends
```

#### `stock_technicals` - Technical Analysis
Moving averages, volume analysis, and technical indicators.
```bash
npm test SPY stock_technicals
```

### **💼 Portfolio & Market Analytics**

#### `stock_screener` - Multi-Criteria Discovery
Advanced stock screening with customizable criteria.
```bash
npm test '{"maxPE":15,"minDividendYield":0.03,"minMarketCap":1000000000}' stock_screener
```

#### `stock_correlation` - Portfolio Analysis
Correlation analysis for portfolio optimization and risk management.
```bash
npm test "AAPL,MSFT,GOOGL,AMZN" stock_correlation
```

#### `market_indices` - Market Overview
Major market indices and sector performance with trend analysis.
```bash
npm test "" market_indices
```

### **🏦 Federal Reserve Economic Data (FRED)**

#### `economic_indicators` - Economic Dashboard
30+ key economic indicators with professional analysis and health scoring.
```bash
npm test "" economic_indicators
```

#### `fred_series_search` - Economic Data Discovery
Search 800,000+ economic series with enhanced sitesearch API.
```bash
npm test "unemployment" fred_series_search
npm test "housing market" fred_series_search
```

#### `fred_series_data` - Economic Data Analysis
Detailed economic data with trend analysis and statistical insights.
```bash
npm test "GDP" fred_series_data
npm test "UNRATE" fred_series_data
```

#### `fred_categories` - Data Organization
Browse economic data by hierarchical categories.
```bash
npm test "" fred_categories          # Root categories
npm test "125" fred_categories       # Employment data
```

#### `fred_releases` - Economic Calendar
Economic release schedules with press releases and publication dates.
```bash
npm test "" fred_releases
```

#### `fred_vintage_data` - Historical Analysis
Historical data revisions and real-time analysis for policy research.
```bash
npm test "GDP" fred_vintage_data
npm test "PAYEMS" fred_vintage_data
```

#### `fred_tags` - Tag-Based Discovery
Powerful tag system for precise economic data discovery.
```bash
npm test "" fred_tags                # Popular tags
npm test "inflation" fred_tags       # Inflation-related tags
```

#### `fred_regional_data` - Geographic Economics
State, county, and metro area economic data for regional analysis.
```bash
npm test "state" fred_regional_data
npm test "california" fred_regional_data
```

#### `fred_sources` - Data Source Transparency
Data source management and quality assessment for transparency and credibility.
```bash
npm test "" fred_sources              # All sources
npm test "1" fred_sources             # Specific source
```

#### `fred_series_updates` - Real-Time Monitoring
Track recently updated economic indicators for timely analysis and decision-making.
```bash
npm test "" fred_series_updates
```

#### `fred_series_relationships` - Deep Metadata Analysis
Deep series metadata analysis including categories, releases, tags, and connections.
```bash
npm test "UNRATE" fred_series_relationships
npm test "GDP" fred_series_relationships
```

#### `fred_maps_data` - Geographic Visualization
Geographic economic data for spatial analysis and economic mapping.
```bash
npm test "state" fred_maps_data
npm test "msa" fred_maps_data
npm test "county" fred_maps_data
```

---

## 🎯 **Usage Examples & Professional Use Cases**

### 🏢 **Corporate Investment Research**
```bash
# Deep company analysis
npm test AAPL stock_profile           # Company fundamentals
npm test AAPL stock_financials        # Financial health
npm test AAPL stock_estimates         # Analyst forecasts
npm test AAPL stock_pricing           # Real-time valuation
npm test AAPL stock_dividends         # Income analysis
npm test AAPL stock_esg               # ESG scoring

# Competitive intelligence
npm test AAPL stock_peers             # Industry comparison
npm test AAPL stock_revenue_breakdown # Business segments
npm test AAPL stock_earnings_history  # Performance trends
npm test AAPL stock_recommendations   # Analyst ratings
```

### 📈 **Trading & Technical Analysis**
```bash
# Market entry signals
npm test AAPL stock_technicals        # Technical indicators
npm test AAPL stock_pricing           # Real-time pricing
npm test "AAPL earnings" stock_news   # Catalyst analysis

# Risk assessment
npm test "AAPL,GOOGL,MSFT" stock_correlation  # Portfolio risk
npm test "" market_indices             # Market sentiment
npm test "VIX" fred_series_data       # Volatility index
```

### 💼 **Portfolio Management**
```bash
# Asset allocation research
npm test '{"minMarketCap":10000000000,"maxPE":25,"minDividendYield":0.02}' stock_screener

# Risk diversification
npm test "AAPL,MSFT,GOOGL,AMZN,TSLA,JPM,JNJ,PG,KO,WMT" stock_correlation

# Sector rotation analysis
npm test "" market_indices            # Sector performance
npm test "technology stocks" stock_news  # Sector sentiment
npm test "AAPL,MSFT,GOOGL" stock_peers   # Tech comparison
```

### 🏦 **Economic & Policy Analysis**
```bash
# Macro economic monitoring
npm test "" economic_indicators        # Economic dashboard
npm test "GDP" fred_series_data       # Growth trends
npm test "UNRATE" fred_series_data    # Employment
npm test "inflation" fred_series_search # Price stability

# Federal Reserve policy tracking
npm test "FEDFUNDS" fred_series_data  # Interest rates
npm test "" fred_series_updates       # Latest data releases
npm test "FEDFUNDS" fred_vintage_data # Policy history
npm test "FEDFUNDS" fred_series_relationships # Fed connections
```

### 🗺️ **Regional Economic Research**
```bash
# Geographic economic analysis
npm test "state" fred_maps_data        # State-level data
npm test "california" fred_regional_data  # CA economics
npm test "unemployment" fred_tags      # Regional tags
npm test "msa" fred_maps_data         # Metro area analysis

# Real estate market research
npm test "housing" fred_series_search  # Housing indicators
npm test "HOUST" fred_series_data     # Housing starts
npm test "MORTGAGE30US" fred_series_data # Mortgage rates
```

### 📰 **Market Intelligence & Sentiment**
```bash
# News sentiment analysis
npm test TSLA stock_news              # Company-specific news
npm test "fed rate cuts" stock_news   # General market news
npm test "inflation concerns" stock_news # Economic sentiment

# Market timing signals
npm test "" fred_series_updates       # Fresh economic data
npm test "yield curve" fred_series_search # Recession indicators
npm test "UNRATE" fred_vintage_data   # Data revision impacts
```

### 🔬 **Academic & Research Applications**
```bash
# Data quality assessment
npm test "" fred_sources              # Source transparency
npm test "BLS" fred_sources           # Bureau of Labor Statistics
npm test "1" fred_sources            # Federal Reserve Board

# Historical analysis
npm test "GDP" fred_vintage_data      # Data revisions
npm test "PAYEMS" fred_vintage_data   # Employment revisions
npm test "GDP" fred_series_relationships # Economic connections

# Tag-based discovery
npm test "" fred_tags                 # Popular economic concepts
npm test "recession" fred_tags        # Recession indicators
npm test "monetary policy" fred_tags  # Fed policy tags
```

### 🏭 **Industry Analysis**
```bash
# Sector deep-dive
npm test AAPL stock_peers             # Technology sector
npm test F stock_peers                # Automotive sector
npm test JPM stock_peers              # Financial sector

# Supply chain analysis
npm test AAPL stock_revenue_breakdown # Geographic revenue
npm test "semiconductor" stock_news   # Supply chain news
npm test "trade" fred_series_search   # International trade data
```

### 💡 **Startup & VC Research**
```bash
# Market opportunity sizing
npm test '{"minMarketCap":0,"maxMarketCap":5000000000}' stock_screener
npm test "emerging markets" fred_series_search
npm test "venture capital" stock_news

# Competitive landscape
npm test ROKU stock_peers             # Streaming competition
npm test ROKU stock_revenue_breakdown # Market segments
npm test "cord cutting" stock_news    # Industry trends
```

### 🎓 **Educational Use Cases**
```bash
# Economics curriculum
npm test "" fred_categories           # Browse economic data
npm test "125" fred_categories        # Employment category
npm test "GDP" fred_series_data       # Economic growth
npm test "inflation" fred_series_search # Price dynamics

# Finance curriculum  
npm test AAPL stock_financials        # Financial statements
npm test AAPL stock_estimates         # Valuation models
npm test "AAPL,SPY" stock_correlation # Beta calculation
npm test "" market_indices            # Index composition
```

---

## 🏗️ **Technical Architecture**

### Data Sources
- **Yahoo Finance**: Real-time financial data, news, analyst estimates
- **FRED API**: Federal Reserve economic data (800,000+ series)
- **StockAnalysis.com**: Revenue breakdown by segment/geography
- **Yahoo Search**: General news search with sentiment analysis

### Extraction Methods
- **JSON Parsing**: Embedded data extraction with regex patterns
- **HTML Scraping**: Cheerio-based structured data extraction  
- **API Integration**: Direct FRED API access with authentication
- **Hybrid Approach**: Multiple extraction methods for maximum coverage

### Advanced Features
- **Sentiment Analysis**: AI-powered news sentiment with bullish/bearish classification
- **Rate Limiting**: Intelligent request throttling for API compliance
- **Error Handling**: Robust fallback systems and graceful degradation
- **Caching**: Built-in caching for frequently accessed data

---

## 📦 **Dependencies**

```json
{
  "@modelcontextprotocol/sdk": "^1.15.0",
  "axios": "^1.7.7",
  "cheerio": "^1.0.0",
  "sentiment": "^5.0.2"
}
```

---

## 🔑 **Environment Setup**

### FRED API Key (Recommended)
Get your free API key from [FRED](https://fred.stlouisfed.org/docs/api/api_key.html):

```bash
export FRED_API_KEY="your-api-key-here"
```

**Without API key**: Basic functionality works, but economic features are limited.

---

## 🚦 **Rate Limits & Guidelines**

### Yahoo Finance
- **Mobile User-Agent**: Uses mobile headers for reliable access
- **Request Throttling**: Built-in delays between requests
- **Error Handling**: Graceful handling of bot detection

### FRED API  
- **120 requests/minute**: Automatic rate limiting compliance
- **Batch Processing**: Efficient concurrent requests with delays
- **Fallback Systems**: Yahoo Finance backup for treasury rates

---

## 🎛️ **Configuration**

### MCP Client Setup
```json
{
  "financial-intelligence": {
    "command": "npx",
    "args": ["-y", "@openpharma-org/financials-mcp"],
    "env": {
      "FRED_API_KEY": "YOUR_FRED_API_KEY"
    }
  }
}
```

### Local Development
```bash
# Test specific methods
npm test TSLA stock_profile
npm test "" economic_indicators
npm test "GDP" fred_series_data

# Test with search parameters
npm test "inflation" fred_series_search
npm test "AAPL,MSFT" stock_correlation
```

---

## 📊 **Data Coverage**

### Stock Markets
- **US Markets**: NYSE, NASDAQ (AAPL, TSLA, GOOGL, etc.)
- **International**: Major global exchanges
- **Asset Classes**: Stocks, ETFs, indices

### Economic Data
- **US Economic Indicators**: GDP, unemployment, inflation, etc.
- **Federal Reserve Data**: Monetary policy, interest rates
- **Regional Data**: State, county, metro area statistics
- **Historical Data**: Decades of economic history with revisions

### Financial Metrics
- **Valuation**: P/E, EV/EBITDA, PEG ratios
- **Performance**: Returns, volatility, beta
- **Fundamentals**: Revenue, earnings, cash flow
- **Market Data**: Price, volume, market cap

---

## 🛠️ **Development**

### Requirements
- Node.js ≥ 18.0.0
- npm or yarn

### Project Structure
```
financial-mcp-server/
├── src/
│   ├── index.js           # MCP server implementation
│   ├── financial-api.js   # Core financial data extraction (6,500+ lines)
│   └── dev-test.js        # Testing utilities
├── FRED_API_SETUP.md      # FRED configuration guide
├── package.json
└── README.md
```

### Testing
```bash
# Test all major features
npm test AAPL stock_profile
npm test "" economic_indicators  
npm test "unemployment" fred_series_search
npm test "AAPL,MSFT" stock_correlation
```

---

## 🎯 **Use Cases**

### 📈 **Investment Analysis**
- Company research and due diligence
- Peer comparison and industry analysis
- Economic context for investment decisions
- Portfolio correlation and risk analysis

### 🏦 **Economic Research**
- Macro economic analysis and forecasting
- Regional economic development studies
- Historical data analysis with revisions
- Policy impact assessment

### 📊 **Financial Planning**
- Market condition monitoring
- Economic indicator tracking
- Sector rotation strategies
- Risk management and diversification

### 🔍 **Data Discovery**
- Economic data exploration via tags
- Company intelligence gathering
- News monitoring with sentiment
- Technical analysis and screening

---

## 📝 **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 **Acknowledgments**

- **Data Sources**: [Yahoo Finance](https://finance.yahoo.com/), [Federal Reserve Economic Data (FRED)](https://fred.stlouisfed.org/)
- **Framework**: [Model Context Protocol](https://modelcontextprotocol.io/)
- **Libraries**: [Axios](https://axios-http.com/), [Cheerio](https://cheerio.js.org/), [Sentiment](https://www.npmjs.com/package/sentiment)

---

## 🆘 **Support**

- 🐛 [Report Issues](https://github.com/openpharma-org/financials-mcp/issues)
- 📖 [Documentation](https://github.com/openpharma-org/financials-mcp)
- 💬 [Discussions](https://github.com/openpharma-org/financials-mcp/discussions)

---

**⚠️ Disclaimer**: This is an unofficial tool. Please respect data providers' terms of service. Data is for informational purposes only and should not be used as the sole basis for investment decisions.

**🚀 Built for the future of AI-powered financial analysis.**
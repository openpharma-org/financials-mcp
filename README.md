# Unofficial Financial MCP Server

A comprehensive **Model Context Protocol (MCP) server** that provides professional-grade access to financial and economic data through Yahoo Finance and Federal Reserve Economic Data (FRED).

## Configuration

```json
{
  "mcpServers": {
    "financial-mcp-server": {
      "command": "node",
      "args": ["/path/to/financial-mcp-server/build/index.js"],
      "env": {
        "FRED_API_KEY": "your-fred-api-key-here"
      }
    }
  }
}
```

**Get your free FRED API key**: [https://fred.stlouisfed.org/docs/api/api_key.html](https://fred.stlouisfed.org/docs/api/api_key.html)

---

## Available Methods

### Stock Analysis (11 methods)

| Method | Description | Parameters |
|--------|-------------|------------|
| `stock_profile` | Company details, industry, employees, business summary | `symbol`: ticker (e.g., "AAPL") |
| `stock_summary` | Key metrics: market cap, P/E, EPS, beta, enterprise value | `symbol`: ticker |
| `stock_estimates` | Analyst EPS/revenue estimates, price targets | `symbol`: ticker |
| `stock_pricing` | Real-time pricing, volume, daily ranges | `symbol`: ticker |
| `stock_financials` | Cash flow, income highlights, balance sheet ratios | `symbol`: ticker |
| `stock_revenue_breakdown` | Revenue by business segment & geography | `symbol`: ticker |
| `stock_earnings_history` | Historical EPS trends & earnings analysis | `symbol`: ticker |
| `stock_recommendations` | Analyst rating trends & consensus changes | `symbol`: ticker |
| `stock_esg` | Environmental, Social, Governance scores | `symbol`: ticker |
| `stock_dividends` | Dividend history, yield, payout ratios | `symbol`: ticker |
| `stock_technicals` | Technical indicators, moving averages, volatility | `symbol`: ticker |

### Advanced Analytics (4 methods)

| Method | Description | Parameters |
|--------|-------------|------------|
| `stock_news` | Recent news with sentiment analysis | `symbol`: ticker or search terms, `search_type`: "stock" or "general" |
| `stock_peers` | Industry peer comparison on key metrics | `symbol`: ticker |
| `stock_screener` | Multi-criteria stock discovery | `symbol`: JSON criteria (e.g., `{"maxPE":20,"minMarketCap":1000000000}`) |
| `stock_correlation` | Portfolio correlation analysis | `symbol`: comma-separated tickers (e.g., "AAPL,MSFT,GOOGL") |

### Market & Economic (2 methods)

| Method | Description | Parameters |
|--------|-------------|------------|
| `economic_indicators` | Comprehensive macro dashboard (GDP, unemployment, inflation, rates) | - |
| `market_indices` | Major indices (S&P 500, NASDAQ, DOW, VIX) & sector performance | - |

### FRED Economic Data (12 methods)

| Method | Description | Parameters |
|--------|-------------|------------|
| `fred_series_search` | Search 800,000+ economic series | `symbol`: search terms (e.g., "unemployment") |
| `fred_series_data` | Fetch specific series observations | `symbol`: series ID (e.g., "UNRATE") |
| `fred_categories` | Browse economic data categories | `symbol`: category ID |
| `fred_releases` | Economic calendar with release schedules | - |
| `fred_vintage_data` | Historical data revision analysis | `symbol`: series ID |
| `fred_tags` | Tag-based economic concept discovery | `symbol`: tag name |
| `fred_regional_data` | Geographic economic analysis (state/MSA) | `symbol`: series ID |
| `fred_sources` | Data source transparency & quality | `symbol`: source ID |
| `fred_series_updates` | Recently updated indicators | - |
| `fred_series_relationships` | Series metadata & connections | `symbol`: series ID |
| `fred_maps_data` | Geographic economic data for mapping | `symbol`: series ID |

---

## Example Usage

### Get Apple's company profile
```
method: stock_profile
symbol: AAPL
```

### Search for unemployment data
```
method: fred_series_search
symbol: unemployment rate
```

### Screen for value stocks
```
method: stock_screener
symbol: {"maxPE": 15, "minDividendYield": 2, "minMarketCap": 10000000000}
```

### Analyze portfolio correlation
```
method: stock_correlation
symbol: AAPL,MSFT,GOOGL,AMZN,TSLA
```

### Get financial news with sentiment
```
method: stock_news
symbol: TSLA
search_type: stock
```

---

## Rate Limits

### Yahoo Finance
- Mobile User-Agent for reliable access
- Built-in request throttling
- Graceful bot detection handling

### FRED API
- 120 requests/minute (automatic compliance)
- Efficient batch processing
- Yahoo Finance fallback for treasury rates

---

## Data Coverage

**Stock Markets**: NYSE, NASDAQ, major global exchanges (stocks, ETFs, indices)

**Economic Data**: GDP, unemployment, inflation, interest rates, regional statistics, historical revisions

**Financial Metrics**: Valuation (P/E, EV/EBITDA), performance (returns, volatility, beta), fundamentals (revenue, earnings, cash flow)

---

**Disclaimer**: Unofficial tool. Data is for informational purposes only and should not be used as the sole basis for investment decisions.

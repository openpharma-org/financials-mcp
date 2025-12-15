# Unofficial Financial Intelligence MCP Server 🚀

A comprehensive **Model Context Protocol (MCP) server** that provides professional-grade access to financial and economic data. This server transforms AI assistants into powerful financial analysis platforms with access to Yahoo Finance data, Federal Reserve Economic Data (FRED), and advanced analytics capabilities.

## **World-Class Features**

### **Yahoo Finance Integration**
- **Real-time stock data** with pricing, financials, and estimates
- **Company intelligence** including profiles, news, and ESG metrics
- **Advanced analytics** with peer comparison and technical indicators
- **Revenue analysis** by segment and geography
- **Executive information** and corporate governance data

### **Federal Reserve Economic Data (FRED)** - 12 Methods
- **800,000+ economic series** with professional discovery tools
- **Real-time economic monitoring** with automated updates
- **Data source transparency** and quality assessment
- **Deep metadata analysis** with relationships mapping
- **Historical data revisions** and vintage analysis
- **Geographic economic data** with mapping visualization
- **Economic calendar** with release schedules
- **Tag-based discovery** system for precise data finding

### **Advanced Analytics**
- **Portfolio correlation analysis** for risk management
- **Stock screening** with multi-criteria discovery
- **Sentiment analysis** on financial news
- **Technical analysis** with moving averages and indicators
- **Economic health scoring** with recession indicators
- **Yield curve analysis** and monetary policy insights

### **Production-Ready**
- **Rate limiting** and intelligent caching
- **Robust error handling** with fallback systems
- **Professional data formatting** (JSON + Markdown)
- **MCP protocol compliance** for seamless AI integration

---

## Usage


```json
{
  "mcpServers": {
    "financial-intelligence": {
      "command": "npx",
      "args": ["-y", "path-to-your-financial-mcp-server"],
      "env": {
        "FRED_API_KEY": "your-fred-api-key-here"
      }
    }
  }
}
```

**Get your free FRED API key**: [https://fred.stlouisfed.org/docs/api/api_key.html](https://fred.stlouisfed.org/docs/api/api_key.html)

---

## **Environment Setup**

### FRED API Key (Recommended)
Get your free API key from [FRED](https://fred.stlouisfed.org/docs/api/api_key.html):

```bash
export FRED_API_KEY="your-api-key-here"
```

**Without API key**: Basic functionality works, but economic features are limited.

---

## **Rate Limits & Guidelines**

### Yahoo Finance
- **Mobile User-Agent**: Uses mobile headers for reliable access
- **Request Throttling**: Built-in delays between requests
- **Error Handling**: Graceful handling of bot detection

### FRED API  
- **120 requests/minute**: Automatic rate limiting compliance
- **Batch Processing**: Efficient concurrent requests with delays
- **Fallback Systems**: Yahoo Finance backup for treasury rates

---

## **Data Coverage**

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

## **Use Cases**

### **Investment Analysis**
- Company research and due diligence
- Peer comparison and industry analysis
- Economic context for investment decisions
- Portfolio correlation and risk analysis

### **Economic Research**
- Macro economic analysis and forecasting
- Regional economic development studies
- Historical data analysis with revisions
- Policy impact assessment

### **Financial Planning**
- Market condition monitoring
- Economic indicator tracking
- Sector rotation strategies
- Risk management and diversification

### **Data Discovery**
- Economic data exploration via tags
- Company intelligence gathering
- News monitoring with sentiment
- Technical analysis and screening

---

**Disclaimer**: This is an unofficial tool. Please respect data providers' terms of service. Data is for informational purposes only and should not be used as the sole basis for investment decisions.
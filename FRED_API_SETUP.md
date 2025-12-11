# 🏦 FRED API Configuration

## Overview
The Financial Intelligence MCP Server includes comprehensive economic indicators powered by the Federal Reserve Economic Data (FRED) API.

## 🔑 API Key Setup

Your FRED API Key: `ce541416c997b515065c3770bae2be21`

### MCP Configuration

Add this to your MCP settings configuration:

```json
{
  "financial-intelligence": {
    "command": "npx",
    "args": ["-y", "@uh-joan/financial-mcp-server"],
    "env": {
      "FRED_API_KEY": "ce541416c997b515065c3770bae2be21"
    }
  }
}
```

## 📊 Enhanced Economic Data

With the FRED API key, you get access to **30+ comprehensive economic indicators**:

### GDP & Growth
- Gross Domestic Product (GDP)
- Real GDP 
- GDP Growth Rate

### Labor Market  
- Unemployment Rate
- Nonfarm Payrolls
- Labor Force Participation Rate
- Job Openings (JOLTS)

### Inflation & Prices
- Consumer Price Index (CPI)
- Core CPI (ex food & energy)
- PCE Price Index (Fed's preferred measure)
- Core PCE Price Index
- Producer Price Index (PPI)

### Interest Rates (Complete Yield Curve)
- Federal Funds Rate
- Treasury Rates: 1M, 3M, 6M, 1Y, 2Y, 5Y, 10Y, 30Y

### Money Supply
- M1 Money Supply
- M2 Money Supply

### Consumer & Business
- Retail Sales
- Consumer Sentiment (University of Michigan)
- Industrial Production Index

### Housing Market
- Housing Starts
- New Home Sales
- Existing Home Sales

### Financial Markets
- VIX Volatility Index
- S&P 500 Index

### Trade & Government
- Trade Balance
- Federal Debt Total
- Federal Debt to GDP Ratio

## 🚀 Usage

```bash
# Get comprehensive economic dashboard
npm test "" economic_indicators
```

## 📈 Features

- **Professional Analysis**: Automated yield curve analysis, recession indicators
- **Economic Health Scoring**: Multi-metric health assessment
- **Rate Limiting**: Respects FRED API limits (120 requests/minute)
- **Robust Fallbacks**: Yahoo Finance backup for treasury rates
- **Real-time Data**: Latest available economic data from Federal Reserve

## 🔗 FRED API Reference

Based on: https://fred.stlouisfed.org/docs/api/fred/

- **Series Observations**: Primary endpoint for economic data
- **Rate Limiting**: 120 requests per minute
- **Data Quality**: Official Federal Reserve data
- **Historical Data**: Access to decades of economic history

## ✅ Benefits

1. **Professional-Grade Data**: Same data used by Fed, banks, institutions
2. **Comprehensive Coverage**: 30+ key economic indicators
3. **Intelligent Analysis**: Automated economic health assessment
4. **Yield Curve Analysis**: Recession probability indicators
5. **Market Context**: Integration with stock market data

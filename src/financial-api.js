const axios = require('axios');
const cheerio = require('cheerio');
const Sentiment = require('sentiment');

/**
 * Extract company profile data from Yahoo Finance using the proven working method
 * @param {string} symbol - Stock ticker symbol
 * @param {string} userAgent - User-Agent string (optional)
 * @returns {Promise<Object|null>} Asset profile data
 */
async function extractAssetProfile(symbol) {
  try {
    
    // Use the EXACT working approach - simple axios request with mobile User-Agent
    const response = await axios.get(`https://finance.yahoo.com/quote/${symbol}?p=${symbol}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7 like Mac OS X) AppleWebKit/605.1.15'
      },
      timeout: 15000
    });
    
    const html = response.data;
    
    // Check if we have profile data
    if (!html.includes('address1') || !html.includes('fullTimeEmployees')) {
      return null;
    }
    
    
    // Extract the JSON object containing profile data
    const jsonPattern = /(\{[^{}]*\\"address1\\":\\"[^\\"].*?\\"fullTimeEmployees\\":\d+[^{}]*\})/;
    const jsonMatch = html.match(jsonPattern);
    
    if (!jsonMatch) {
      return null;
    }
    
    
    // Extract individual fields from the raw JSON text (handles escaped quotes)
    const rawJson = jsonMatch[1];
    const result = {};
    
    const fieldPatterns = {
      address1: /\\"address1\\":\\"([^\\"]*)\\"/,
      city: /\\"city\\":\\"([^\\"]*)\\"/,
      state: /\\"state\\":\\"([^\\"]*)\\"/,
      zip: /\\"zip\\":\\"([^\\"]*)\\"/,
      country: /\\"country\\":\\"([^\\"]*)\\"/,
      phone: /\\"phone\\":\\"([^\\"]*)\\"/,
      website: /\\"website\\":\\"([^\\"]*)\\"/,
      industry: /\\"industry\\":\\"([^\\"]*)\\"/,
      sector: /\\"sector\\":\\"([^\\"]*)\\"/,
      longBusinessSummary: /\\"longBusinessSummary\\":\\"([^\\"]*)\\"/,
      fullTimeEmployees: /\\"fullTimeEmployees\\":(\d+)/
    };
    
    for (const [field, pattern] of Object.entries(fieldPatterns)) {
      const match = rawJson.match(pattern);
      if (match) {
        result[field] = field === 'fullTimeEmployees' ? parseInt(match[1]) : match[1];
      }
    }
    
    if (Object.keys(result).length > 5) {
      return result;
    } else {
      return null;
    }
    
  } catch (error) {
    return null;
  }
}


/**
 * Convert asset profile to standardized stock profile row
 * @param {string} symbol - Stock symbol
 * @param {Object} assetProfile - Asset profile data
 * @returns {Object} Standardized row
 */
function toStockProfileRow(symbol, assetProfile) {
  const currentDate = new Date().toISOString().split('T')[0];
  
  return {
    symbol: symbol.toUpperCase(),
    address: assetProfile.address1 || null,
    city: assetProfile.city || null,
    country: assetProfile.country || null,
    phone: assetProfile.phone || null,
    zip: assetProfile.zip || null,
    industry: assetProfile.industry || "Information not available",
    sector: assetProfile.sector || "Information not available", 
    long_business_summary: assetProfile.longBusinessSummary || "Company information extracted from page metadata",
    full_time_employees: assetProfile.fullTimeEmployees || null,
    report_date: currentDate
  };
}

/**
 * Convert stock profile row to markdown format
 * @param {Object} row - Stock profile row
 * @returns {string} Markdown formatted string
 */
function rowAsMarkdown(row) {
  const parts = [
    `# ${row.symbol} Company Profile`,
    '',
    '## Basic Information',
    `**Symbol:** ${row.symbol}`,
    `**Industry:** ${row.industry}`,
    `**Sector:** ${row.sector}`,
    ''
  ];
  
  if (row.address || row.city || row.country) {
    parts.push('## Contact Information');
    if (row.address) parts.push(`**Address:** ${row.address}`);
    if (row.city) parts.push(`**City:** ${row.city}`);
    if (row.country) parts.push(`**Country:** ${row.country}`);
    if (row.phone) parts.push(`**Phone:** ${row.phone}`);
    if (row.zip) parts.push(`**ZIP:** ${row.zip}`);
    parts.push('');
  }
  
  if (row.full_time_employees) {
    parts.push('## Employment');
    parts.push(`**Full-time Employees:** ${row.full_time_employees.toLocaleString()}`);
    parts.push('');
  }
  
  if (row.long_business_summary && row.long_business_summary !== "Company information extracted from page metadata") {
    parts.push('## Business Summary');
    parts.push(row.long_business_summary);
    parts.push('');
  }
  
  parts.push(`**Report Date:** ${row.report_date}`);
  
  return parts.join('\n');
}

// Officers functionality removed - data not reliably available in Yahoo Finance JSON/HTML

/**
 * Main function to fetch Yahoo Finance profile data
 * @param {Object} params - Parameters
 * @param {string} params.symbol - Stock symbol
 * @returns {Promise<Object>} Result with row and markdown
 */
async function fetchYahooProfile({ symbol }) {
  try {
    
    const profile = await extractAssetProfile(symbol);
    
    if (!profile) {
      throw new Error('Could not extract company profile data from Yahoo Finance page');
    }
    
    const row = toStockProfileRow(symbol, profile);
    const markdown = rowAsMarkdown(row);
    
    return { row, markdown };
    
  } catch (error) {
    throw error;
  }
}

/**
 * Extract financial summary data from Yahoo Finance key statistics
 * @param {string} symbol - Stock ticker symbol
 * @returns {Promise<Object|null>} Summary data
 */
async function extractSummaryData(symbol) {
  try {
    
    // Use the main quote page which contains financial statistics
    const response = await axios.get(`https://finance.yahoo.com/quote/${symbol}?p=${symbol}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1'
      },
      timeout: 15000
    });
    
    const html = response.data;
    
    // NEW APPROACH: Use Cheerio to parse HTML elements with data attributes
    const cheerio = require('cheerio');
    const $ = cheerio.load(html);
    
    
    // Helper function to parse financial values
    const parseFinancialValue = (value, text) => {
      if (!value && !text) return null;
      
      const numStr = value || text;
      if (numStr === '--' || numStr === 'N/A') return null;
      
      // Handle formats like "1.092T", "202.71", "60,087,858"
      const cleanStr = numStr.replace(/,/g, '');
      
      if (cleanStr.includes('T')) {
        return parseFloat(cleanStr) * 1e12;
      } else if (cleanStr.includes('B')) {
        return parseFloat(cleanStr) * 1e9;
      } else if (cleanStr.includes('M')) {
        return parseFloat(cleanStr) * 1e6;
      } else if (cleanStr.includes('K')) {
        return parseFloat(cleanStr) * 1e3;
      } else {
        return parseFloat(cleanStr);
      }
    };
    
    // Extract data from fin-streamer elements with data attributes
    const summaryData = {};
    
    // Map of data fields to our internal names
    const fieldMapping = {
      'marketCap': 'marketCap',
      'trailingPE': 'trailingPE', 
      'forwardPE': 'forwardPE',
      'beta': 'beta',
      'enterpriseValue': 'enterpriseValue',
      'sharesOutstanding': 'sharesOutstanding',
      'pegRatio': 'pegRatio'
    };
    
    $(`fin-streamer[data-symbol="${symbol}"]`).each((i, elem) => {
      const element = $(elem);
      const dataField = element.attr('data-field');
      const dataValue = element.attr('data-value');
      const text = element.text().trim();
      
      if (dataField && fieldMapping[dataField]) {
        const value = parseFinancialValue(dataValue, text);
        if (value !== null) {
          summaryData[fieldMapping[dataField]] = {
            raw: value,
            fmt: dataValue || text
          };
        }
      }
    });
    
    // Also try to extract some additional metrics that might not be in fin-streamer
    const additionalMetrics = {
      'trailingEps': /data-field="trailingEps"[^>]*data-value="([^"]*)"/, 
      'forwardEps': /data-field="forwardEps"[^>]*data-value="([^"]*)"/, 
      'enterpriseToEbitda': /enterpriseToEbitda[^>]*"(\d+\.?\d*)"/, 
      'enterpriseToRevenue': /enterpriseToRevenue[^>]*"(\d+\.?\d*)"/
    };
    
    for (const [field, pattern] of Object.entries(additionalMetrics)) {
      const match = html.match(pattern);
      if (match && match[1]) {
        const value = parseFloat(match[1]);
        if (!isNaN(value)) {
          summaryData[field] = {
            raw: value,
            fmt: match[1]
          };
        }
      }
    }
    
    // Always combine HTML data with JSON data for complete coverage
    
    // Extract advanced metrics from JSON data (these aren't in fin-streamer elements)
    const jsonFieldPatterns = {
      enterpriseValue: /\\"enterpriseValue\\":\s*(\{[^}]+\})/,
      sharesOutstanding: /\\"sharesOutstanding\\":\s*(\{[^}]+\})/,
      beta: /\\"beta\\":\s*(\{[^}]+\})/,
      forwardPE: /\\"forwardPE\\":\s*(\{[^}]+\})/,
      trailingEps: /\\"trailingEps\\":\s*(\{[^}]+\})/,
      forwardEps: /\\"forwardEps\\":\s*(\{[^}]+\})/,
      pegRatio: /\\"pegRatio\\":\s*(\{[^}]*\})/,
      enterpriseToEbitda: /\\"enterpriseToEbitda\\":\s*(\{[^}]+\})/,
      enterpriseToRevenue: /\\"enterpriseToRevenue\\":\s*(\{[^}]+\})/
    };
    
    for (const [field, pattern] of Object.entries(jsonFieldPatterns)) {
      // Only extract from JSON if we didn't get it from HTML
      if (!summaryData[field]) {
        const match = html.match(pattern);
        if (match) {
          try {
            let jsonStr = match[1];
            jsonStr = jsonStr.replace(/\\"/g, '"');
            const fieldData = JSON.parse(jsonStr);
            summaryData[field] = fieldData;
          } catch (e) {
          }
        }
      }
    }
    
    // Also make sure we have trailingPE from HTML (not the EPS value)
    if (summaryData.trailingPE && summaryData.trailingPE.raw < 10) {
      // This is likely EPS, not P/E ratio - let's get the real P/E from JSON
      const trailingPEMatch = html.match(/\\"trailingPE\\":\s*(\{[^}]+\})/);
      if (trailingPEMatch) {
        try {
          let jsonStr = trailingPEMatch[1];
          jsonStr = jsonStr.replace(/\\"/g, '"');
          const peData = JSON.parse(jsonStr);
          if (peData.raw > 10) { // P/E ratios are usually > 10
            summaryData.trailingPE = peData;
          }
        } catch (e) {
        }
      }
    }
    
    if (Object.keys(summaryData).length > 0) {
      return summaryData;
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Convert summary data to standardized stock summary row
 * @param {string} symbol - Stock symbol
 * @param {Object} summaryData - Raw summary data
 * @returns {Object} Standardized row
 */
function toStockSummaryRow(symbol, summaryData) {
  const currentDate = new Date().toISOString().split('T')[0];
  
  // Helper function to extract numeric value from data object
  const getValue = (obj) => {
    if (!obj) return null;
    if (typeof obj === 'number') return obj;
    if (obj.raw !== undefined) return obj.raw;
    if (obj.fmt !== undefined) {
      // Try to parse formatted values like "1.23T", "456.78B", "123.45M", "12.34K"
      const fmtStr = obj.fmt.toString();
      const match = fmtStr.match(/([\d.]+)([TKMBG]?)/);
      if (match) {
        const num = parseFloat(match[1]);
        const suffix = match[2];
        const multipliers = { K: 1e3, M: 1e6, B: 1e9, T: 1e12, G: 1e9 };
        return num * (multipliers[suffix] || 1);
      }
    }
    return null;
  };
  
  return {
    symbol: symbol.toUpperCase(),
    market_cap: getValue(summaryData.marketCap),
    enterprise_value: getValue(summaryData.enterpriseValue),
    shares_outstanding: getValue(summaryData.sharesOutstanding),
    beta: getValue(summaryData.beta),
    trailing_pe: getValue(summaryData.trailingPE),
    forward_pe: getValue(summaryData.forwardPE),
    trailing_eps: getValue(summaryData.trailingEps),
    forward_eps: getValue(summaryData.forwardEps),
    enterprise_to_ebitda: getValue(summaryData.enterpriseToEbitda),
    enterprise_to_revenue: getValue(summaryData.enterpriseToRevenue),
    peg_ratio: getValue(summaryData.pegRatio),
    currency: summaryData.currency || 'USD',
    report_date: currentDate
  };
}

/**
 * Convert stock summary row to markdown format
 * @param {Object} row - Stock summary row
 * @returns {string} Markdown formatted string
 */
function summaryAsMarkdown(row) {
  const formatNumber = (num) => {
    if (num === null || num === undefined) return 'N/A';
    if (num >= 1e12) return `${(num / 1e12).toFixed(2)}T`;
    if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
    return num.toLocaleString();
  };
  
  const formatRatio = (num) => {
    if (num === null || num === undefined) return 'N/A';
    return num.toFixed(2);
  };
  
  const parts = [
    `# ${row.symbol} Financial Summary`,
    '',
    '## Valuation Metrics',
    `**Market Cap:** ${formatNumber(row.market_cap)} ${row.currency}`,
    `**Enterprise Value:** ${formatNumber(row.enterprise_value)} ${row.currency}`,
    `**Shares Outstanding:** ${formatNumber(row.shares_outstanding)}`,
    '',
    '## Risk & Performance',
    `**Beta:** ${formatRatio(row.beta)}`,
    '',
    '## Price Ratios',
    `**Trailing P/E:** ${formatRatio(row.trailing_pe)}`,
    `**Forward P/E:** ${formatRatio(row.forward_pe)}`,
    `**PEG Ratio:** ${formatRatio(row.peg_ratio)}`,
    '',
    '## Earnings Per Share',
    `**Trailing EPS:** ${formatRatio(row.trailing_eps)} ${row.currency}`,
    `**Forward EPS:** ${formatRatio(row.forward_eps)} ${row.currency}`,
    '',
    '## Enterprise Ratios',
    `**EV/EBITDA:** ${formatRatio(row.enterprise_to_ebitda)}`,
    `**EV/Revenue:** ${formatRatio(row.enterprise_to_revenue)}`,
    '',
    `**Report Date:** ${row.report_date}`
  ];
  
  return parts.join('\n');
}

/**
 * Main function to fetch Yahoo Finance summary data
 * @param {Object} params - Parameters
 * @param {string} params.symbol - Stock symbol
 * @returns {Promise<Object>} Result with row and markdown
 */
async function fetchYahooSummary({ symbol }) {
  try {
    
    const summaryData = await extractSummaryData(symbol);
    
    if (!summaryData) {
      throw new Error('Could not extract financial summary data from Yahoo Finance page');
    }
    
    const row = toStockSummaryRow(symbol, summaryData);
    const markdown = summaryAsMarkdown(row);
    
    return { row, markdown };
    
  } catch (error) {
    throw error;
  }
}

/**
 * Extract analyst estimates data from Yahoo Finance
 * @param {string} symbol - Stock ticker symbol
 * @returns {Promise<Object|null>} Estimates data
 */
async function extractEstimatesData(symbol) {
  try {
    
    // Use the main quote page which contains estimates in JSON
    const response = await axios.get(`https://finance.yahoo.com/quote/${symbol}?p=${symbol}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1'
      },
      timeout: 15000
    });
    
    const html = response.data;
    
    // Extract estimates from JSON data
    
    const estimatesData = {};
    
    // Estimates field patterns
    const estimatePatterns = {
      // Earnings estimates
      earningsAverage: /\\"earningsAverage\\":\s*(\{[^}]+\})/,
      earningsHigh: /\\"earningsHigh\\":\s*(\{[^}]+\})/,
      earningsLow: /\\"earningsLow\\":\s*(\{[^}]+\})/,
      // Revenue estimates  
      revenueAverage: /\\"revenueAverage\\":\s*(\{[^}]+\})/,
      revenueHigh: /\\"revenueHigh\\":\s*(\{[^}]+\})/,
      revenueLow: /\\"revenueLow\\":\s*(\{[^}]+\})/,
      // Price targets
      targetMeanPrice: /\\"targetMeanPrice\\":\s*(\{[^}]+\})/,
      targetHighPrice: /\\"targetHighPrice\\":\s*(\{[^}]+\})/,
      targetLowPrice: /\\"targetLowPrice\\":\s*(\{[^}]+\})/,
      // Analyst data
      recommendationMean: /\\"recommendationMean\\":\s*(\{[^}]+\})/,
      numberOfAnalystOpinions: /\\"numberOfAnalystOpinions\\":\s*(\{[^}]+\})/
    };
    
    for (const [field, pattern] of Object.entries(estimatePatterns)) {
      const match = html.match(pattern);
      if (match) {
        try {
          let jsonStr = match[1];
          jsonStr = jsonStr.replace(/\\"/g, '"');
          const fieldData = JSON.parse(jsonStr);
          estimatesData[field] = fieldData;
        } catch (e) {
        }
      }
    }
    
    if (Object.keys(estimatesData).length > 0) {
      return estimatesData;
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Convert estimates data to standardized stock estimates row
 * @param {string} symbol - Stock symbol
 * @param {Object} estimatesData - Raw estimates data
 * @returns {Object} Standardized row
 */
function toStockEstimatesRow(symbol, estimatesData) {
  const currentDate = new Date().toISOString().split('T')[0];
  
  // Helper function to extract numeric value from data object
  const getValue = (obj) => {
    if (!obj) return null;
    if (typeof obj === 'number') return obj;
    if (obj.raw !== undefined) return obj.raw;
    if (obj.fmt !== undefined) {
      // Try to parse formatted values like "24.98B", "0.49", etc.
      const fmtStr = obj.fmt.toString();
      const match = fmtStr.match(/([\d.]+)([TKMBG]?)/);
      if (match) {
        const num = parseFloat(match[1]);
        const suffix = match[2];
        const multipliers = { K: 1e3, M: 1e6, B: 1e9, T: 1e12, G: 1e9 };
        return num * (multipliers[suffix] || 1);
      }
    }
    return null;
  };
  
  return {
    symbol: symbol.toUpperCase(),
    // Earnings estimates
    earnings_estimate_avg: getValue(estimatesData.earningsAverage),
    earnings_estimate_high: getValue(estimatesData.earningsHigh),
    earnings_estimate_low: getValue(estimatesData.earningsLow),
    // Revenue estimates
    revenue_estimate_avg: getValue(estimatesData.revenueAverage),
    revenue_estimate_high: getValue(estimatesData.revenueHigh),
    revenue_estimate_low: getValue(estimatesData.revenueLow),
    // Price targets
    price_target_mean: getValue(estimatesData.targetMeanPrice),
    price_target_high: getValue(estimatesData.targetHighPrice),
    price_target_low: getValue(estimatesData.targetLowPrice),
    // Analyst data
    recommendation_mean: getValue(estimatesData.recommendationMean),
    analyst_count: getValue(estimatesData.numberOfAnalystOpinions),
    currency: 'USD',
    report_date: currentDate
  };
}

/**
 * Convert stock estimates row to markdown format
 * @param {Object} row - Stock estimates row
 * @returns {string} Markdown formatted string
 */
function estimatesAsMarkdown(row) {
  const formatNumber = (num) => {
    if (num === null || num === undefined) return 'N/A';
    if (num >= 1e12) return `${(num / 1e12).toFixed(2)}T`;
    if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
    return num.toLocaleString();
  };
  
  const formatDecimal = (num) => {
    if (num === null || num === undefined) return 'N/A';
    return num.toFixed(2);
  };
  
  // Helper function to format recommendation
  const formatRecommendation = (mean) => {
    if (mean === null || mean === undefined) return 'N/A';
    if (mean <= 1.5) return 'Strong Buy';
    if (mean <= 2.5) return 'Buy';
    if (mean <= 3.5) return 'Hold';
    if (mean <= 4.5) return 'Sell';
    return 'Strong Sell';
  };
  
  const parts = [
    `# ${row.symbol} Analyst Estimates`,
    '',
    '## Earnings Per Share (EPS) Estimates',
    `**Consensus Estimate:** ${formatDecimal(row.earnings_estimate_avg)} ${row.currency}`,
    `**High Estimate:** ${formatDecimal(row.earnings_estimate_high)} ${row.currency}`,
    `**Low Estimate:** ${formatDecimal(row.earnings_estimate_low)} ${row.currency}`,
    `**Range:** ${formatDecimal(row.earnings_estimate_low)} - ${formatDecimal(row.earnings_estimate_high)} ${row.currency}`,
    '',
    '## Revenue Estimates',
    `**Consensus Estimate:** ${formatNumber(row.revenue_estimate_avg)} ${row.currency}`,
    `**High Estimate:** ${formatNumber(row.revenue_estimate_high)} ${row.currency}`,
    `**Low Estimate:** ${formatNumber(row.revenue_estimate_low)} ${row.currency}`,
    `**Range:** ${formatNumber(row.revenue_estimate_low)} - ${formatNumber(row.revenue_estimate_high)} ${row.currency}`,
    '',
    '## Price Targets',
    `**Mean Price Target:** ${formatDecimal(row.price_target_mean)} ${row.currency}`,
    `**High Target:** ${formatDecimal(row.price_target_high)} ${row.currency}`,
    `**Low Target:** ${formatDecimal(row.price_target_low)} ${row.currency}`,
    `**Range:** ${formatDecimal(row.price_target_low)} - ${formatDecimal(row.price_target_high)} ${row.currency}`,
    '',
    '## Analyst Coverage',
    `**Recommendation:** ${formatRecommendation(row.recommendation_mean)} (${formatDecimal(row.recommendation_mean)})`,
    `**Number of Analysts:** ${row.analyst_count || 'N/A'}`,
    '',
    `**Report Date:** ${row.report_date}`
  ];
  
  return parts.join('\n');
}

/**
 * Main function to fetch Yahoo Finance estimates data
 * @param {Object} params - Parameters
 * @param {string} params.symbol - Stock symbol
 * @returns {Promise<Object>} Result with row and markdown
 */
async function fetchYahooEstimates({ symbol }) {
  try {
    
    const estimatesData = await extractEstimatesData(symbol);
    
    if (!estimatesData) {
      throw new Error('Could not extract analyst estimates data from Yahoo Finance page');
    }
    
    const row = toStockEstimatesRow(symbol, estimatesData);
    const markdown = estimatesAsMarkdown(row);
    
    return { row, markdown };
    
  } catch (error) {
    throw error;
  }
}

/**
 * Extract pricing data from Yahoo Finance (real-time, pre/post market)
 * @param {string} symbol - Stock ticker symbol
 * @returns {Promise<Object|null>} Pricing data
 */
async function extractPricingData(symbol) {
  try {
    
    const response = await axios.get(`https://finance.yahoo.com/quote/${symbol}?p=${symbol}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1'
      },
      timeout: 15000
    });
    
    const html = response.data;
    
    const pricingData = {};
    
    // Pricing field patterns from summaryDetail and price sections
    const pricingPatterns = {
      // Current and previous prices
      currentPrice: /\\"currentPrice\\":\s*(\{[^}]+\})/,
      previousClose: /\\"previousClose\\":\s*(\{[^}]+\})/,
      open: /\\"open\\":\s*(\{[^}]+\})/,
      dayLow: /\\"dayLow\\":\s*(\{[^}]+\})/,
      dayHigh: /\\"dayHigh\\":\s*(\{[^}]+\})/,
      
      // Market hours pricing
      regularMarketPrice: /\\"regularMarketPrice\\":\s*(\{[^}]+\})/,
      regularMarketChange: /\\"regularMarketChange\\":\s*(\{[^}]+\})/,
      regularMarketChangePercent: /\\"regularMarketChangePercent\\":\s*(\{[^}]+\})/,
      
      // Pre-market data
      preMarketPrice: /\\"preMarketPrice\\":\s*(\{[^}]+\})/,
      preMarketChange: /\\"preMarketChange\\":\s*(\{[^}]+\})/,
      preMarketChangePercent: /\\"preMarketChangePercent\\":\s*(\{[^}]+\})/,
      
      // Post-market data
      postMarketPrice: /\\"postMarketPrice\\":\s*(\{[^}]+\})/,
      postMarketChange: /\\"postMarketChange\\":\s*(\{[^}]+\})/,
      postMarketChangePercent: /\\"postMarketChangePercent\\":\s*(\{[^}]+\})/,
      
      // Volume data
      volume: /\\"volume\\":\s*(\{[^}]+\})/,
      averageVolume: /\\"averageVolume\\":\s*(\{[^}]+\})/,
      averageDailyVolume10Day: /\\"averageDailyVolume10Day\\":\s*(\{[^}]+\})/,
      
      // Price ranges
      fiftyTwoWeekLow: /\\"fiftyTwoWeekLow\\":\s*(\{[^}]+\})/,
      fiftyTwoWeekHigh: /\\"fiftyTwoWeekHigh\\":\s*(\{[^}]+\})/,
      fiftyDayAverage: /\\"fiftyDayAverage\\":\s*(\{[^}]+\})/,
      twoHundredDayAverage: /\\"twoHundredDayAverage\\":\s*(\{[^}]+\})/,
      
      // Bid/Ask
      bid: /\\"bid\\":\s*(\{[^}]+\})/,
      ask: /\\"ask\\":\s*(\{[^}]+\})/,
      bidSize: /\\"bidSize\\":\s*(\{[^}]+\})/,
      askSize: /\\"askSize\\":\s*(\{[^}]+\})/,
      
      // Market state
      marketState: /\\"marketState\\":\s*\\"([^"]+)\\"/
    };
    
    for (const [field, pattern] of Object.entries(pricingPatterns)) {
      const match = html.match(pattern);
      if (match) {
        try {
          if (field === 'marketState') {
            pricingData[field] = match[1];
          } else {
            let jsonStr = match[1];
            jsonStr = jsonStr.replace(/\\"/g, '"');
            const fieldData = JSON.parse(jsonStr);
            pricingData[field] = fieldData;
          }
        } catch (e) {
        }
      }
    }
    
    if (Object.keys(pricingData).length > 0) {
      return pricingData;
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Convert pricing data to standardized stock pricing row
 * @param {string} symbol - Stock symbol
 * @param {Object} pricingData - Raw pricing data
 * @returns {Object} Standardized row
 */
function toStockPricingRow(symbol, pricingData) {
  const currentDate = new Date().toISOString().split('T')[0];
  
  const getValue = (obj) => {
    if (!obj) return null;
    if (typeof obj === 'number') return obj;
    if (obj.raw !== undefined) return obj.raw;
    return null;
  };
  
  const getFmt = (obj) => {
    if (!obj) return null;
    if (obj.fmt !== undefined) return obj.fmt;
    return null;
  };
  
  return {
    symbol: symbol.toUpperCase(),
    
    // Current pricing
    current_price: getValue(pricingData.currentPrice) || getValue(pricingData.regularMarketPrice),
    previous_close: getValue(pricingData.previousClose),
    open_price: getValue(pricingData.open),
    day_low: getValue(pricingData.dayLow),
    day_high: getValue(pricingData.dayHigh),
    
    // Market changes
    regular_market_change: getValue(pricingData.regularMarketChange),
    regular_market_change_percent: getValue(pricingData.regularMarketChangePercent),
    
    // Extended hours
    pre_market_price: getValue(pricingData.preMarketPrice),
    pre_market_change: getValue(pricingData.preMarketChange),
    pre_market_change_percent: getValue(pricingData.preMarketChangePercent),
    post_market_price: getValue(pricingData.postMarketPrice),
    post_market_change: getValue(pricingData.postMarketChange),
    post_market_change_percent: getValue(pricingData.postMarketChangePercent),
    
    // Volume
    volume: getValue(pricingData.volume),
    average_volume: getValue(pricingData.averageVolume),
    average_volume_10day: getValue(pricingData.averageDailyVolume10Day),
    
    // Price ranges
    fifty_two_week_low: getValue(pricingData.fiftyTwoWeekLow),
    fifty_two_week_high: getValue(pricingData.fiftyTwoWeekHigh),
    fifty_day_average: getValue(pricingData.fiftyDayAverage),
    two_hundred_day_average: getValue(pricingData.twoHundredDayAverage),
    
    // Bid/Ask
    bid_price: getValue(pricingData.bid),
    ask_price: getValue(pricingData.ask),
    bid_size: getValue(pricingData.bidSize),
    ask_size: getValue(pricingData.askSize),
    
    // Meta
    market_state: pricingData.marketState || 'UNKNOWN',
    currency: 'USD',
    report_date: currentDate
  };
}

/**
 * Convert stock pricing row to markdown format
 * @param {Object} row - Stock pricing row
 * @returns {string} Markdown formatted string
 */
function pricingAsMarkdown(row) {
  const formatPrice = (num) => {
    if (num === null || num === undefined) return 'N/A';
    return `$${num.toFixed(2)}`;
  };
  
  const formatPercent = (num) => {
    if (num === null || num === undefined) return 'N/A';
    const sign = num >= 0 ? '+' : '';
    return `${sign}${(num * 100).toFixed(2)}%`;
  };
  
  const formatVolume = (num) => {
    if (num === null || num === undefined) return 'N/A';
    if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
    return num.toLocaleString();
  };
  
  const getMarketStateIcon = (state) => {
    switch (state) {
      case 'REGULAR': return '🟢';
      case 'CLOSED': return '🔴';
      case 'PRE': return '🟡';
      case 'POST': return '🟠';
      default: return '⚪';
    }
  };
  
  const parts = [
    `# ${row.symbol} Stock Pricing`,
    '',
    `## Market Status ${getMarketStateIcon(row.market_state)}`,
    `**Market State:** ${row.market_state}`,
    '',
    '## Current Pricing',
    `**Current Price:** ${formatPrice(row.current_price)}`,
    `**Previous Close:** ${formatPrice(row.previous_close)}`,
    `**Daily Change:** ${formatPrice(row.regular_market_change)} (${formatPercent(row.regular_market_change_percent)})`,
    '',
    '## Daily Range',
    `**Open:** ${formatPrice(row.open_price)}`,
    `**Day Low:** ${formatPrice(row.day_low)}`,
    `**Day High:** ${formatPrice(row.day_high)}`,
    `**Range:** ${formatPrice(row.day_low)} - ${formatPrice(row.day_high)}`,
    '',
    '## Extended Hours Trading',
    `**Pre-Market:** ${formatPrice(row.pre_market_price)} (${formatPercent(row.pre_market_change_percent)})`,
    `**Post-Market:** ${formatPrice(row.post_market_price)} (${formatPercent(row.post_market_change_percent)})`,
    '',
    '## Volume Analysis',
    `**Today's Volume:** ${formatVolume(row.volume)}`,
    `**Average Volume:** ${formatVolume(row.average_volume)}`,
    `**10-Day Avg Volume:** ${formatVolume(row.average_volume_10day)}`,
    '',
    '## Price Ranges',
    `**52-Week Low:** ${formatPrice(row.fifty_two_week_low)}`,
    `**52-Week High:** ${formatPrice(row.fifty_two_week_high)}`,
    `**52-Week Range:** ${formatPrice(row.fifty_two_week_low)} - ${formatPrice(row.fifty_two_week_high)}`,
    `**50-Day Average:** ${formatPrice(row.fifty_day_average)}`,
    `**200-Day Average:** ${formatPrice(row.two_hundred_day_average)}`,
    '',
    '## Bid/Ask Spread',
    `**Bid:** ${formatPrice(row.bid_price)} x ${row.bid_size || 'N/A'}`,
    `**Ask:** ${formatPrice(row.ask_price)} x ${row.ask_size || 'N/A'}`,
    '',
    `**Report Date:** ${row.report_date}`
  ];
  
  return parts.join('\n');
}

/**
 * Main function to fetch Yahoo Finance pricing data
 * @param {Object} params - Parameters
 * @param {string} params.symbol - Stock symbol
 * @returns {Promise<Object>} Result with row and markdown
 */
async function fetchYahooPricing({ symbol }) {
  try {
    
    const pricingData = await extractPricingData(symbol);
    
    if (!pricingData) {
      throw new Error('Could not extract pricing data from Yahoo Finance page');
    }
    
    const row = toStockPricingRow(symbol, pricingData);
    const markdown = pricingAsMarkdown(row);
    
    return { row, markdown };
    
  } catch (error) {
    throw error;
  }
}

/**
 * Extract financial data (cash flow, margins, profitability) from Yahoo Finance
 * @param {string} symbol - Stock ticker symbol
 * @returns {Promise<Object|null>} Financial data
 */
async function extractFinancialData(symbol) {
  try {
    
    const response = await axios.get(`https://finance.yahoo.com/quote/${symbol}?p=${symbol}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1'
      },
      timeout: 15000
    });
    
    const html = response.data;
    
    const financialData = {};
    
    // Financial field patterns from financialData section
    const financialPatterns = {
      // Cash & Debt
      totalCash: /\\"totalCash\\":\s*(\{[^}]+\})/,
      totalCashPerShare: /\\"totalCashPerShare\\":\s*(\{[^}]+\})/,
      totalDebt: /\\"totalDebt\\":\s*(\{[^}]+\})/,
      debtToEquity: /\\"debtToEquity\\":\s*(\{[^}]+\})/,
      
      // Profitability
      totalRevenue: /\\"totalRevenue\\":\s*(\{[^}]+\})/,
      revenuePerShare: /\\"revenuePerShare\\":\s*(\{[^}]+\})/,
      grossProfits: /\\"grossProfits\\":\s*(\{[^}]+\})/,
      ebitda: /\\"ebitda\\":\s*(\{[^}]+\})/,
      
      // Returns
      returnOnAssets: /\\"returnOnAssets\\":\s*(\{[^}]+\})/,
      returnOnEquity: /\\"returnOnEquity\\":\s*(\{[^}]+\})/,
      
      // Cash Flow
      freeCashflow: /\\"freeCashflow\\":\s*(\{[^}]+\})/,
      operatingCashflow: /\\"operatingCashflow\\":\s*(\{[^}]+\})/,
      
      // Growth
      earningsGrowth: /\\"earningsGrowth\\":\s*(\{[^}]+\})/,
      revenueGrowth: /\\"revenueGrowth\\":\s*(\{[^}]+\})/,
      
      // Margins
      grossMargins: /\\"grossMargins\\":\s*(\{[^}]+\})/,
      ebitdaMargins: /\\"ebitdaMargins\\":\s*(\{[^}]+\})/,
      operatingMargins: /\\"operatingMargins\\":\s*(\{[^}]+\})/,
      profitMargins: /\\"profitMargins\\":\s*(\{[^}]+\})/,
      
      // Liquidity
      quickRatio: /\\"quickRatio\\":\s*(\{[^}]+\})/,
      currentRatio: /\\"currentRatio\\":\s*(\{[^}]+\})/
    };
    
    for (const [field, pattern] of Object.entries(financialPatterns)) {
      const match = html.match(pattern);
      if (match) {
        try {
          let jsonStr = match[1];
          jsonStr = jsonStr.replace(/\\"/g, '"');
          const fieldData = JSON.parse(jsonStr);
          financialData[field] = fieldData;
        } catch (e) {
        }
      }
    }
    
    if (Object.keys(financialData).length > 0) {
      return financialData;
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Convert financial data to standardized stock financials row
 * @param {string} symbol - Stock symbol
 * @param {Object} financialData - Raw financial data
 * @returns {Object} Standardized row
 */
function toStockFinancialsRow(symbol, financialData) {
  const currentDate = new Date().toISOString().split('T')[0];
  
  const getValue = (obj) => {
    if (!obj) return null;
    if (typeof obj === 'number') return obj;
    if (obj.raw !== undefined) return obj.raw;
    return null;
  };
  
  return {
    symbol: symbol.toUpperCase(),
    
    // Cash & Debt
    total_cash: getValue(financialData.totalCash),
    total_cash_per_share: getValue(financialData.totalCashPerShare),
    total_debt: getValue(financialData.totalDebt),
    debt_to_equity: getValue(financialData.debtToEquity),
    
    // Revenue & Profitability
    total_revenue: getValue(financialData.totalRevenue),
    revenue_per_share: getValue(financialData.revenuePerShare),
    gross_profits: getValue(financialData.grossProfits),
    ebitda: getValue(financialData.ebitda),
    
    // Returns
    return_on_assets: getValue(financialData.returnOnAssets),
    return_on_equity: getValue(financialData.returnOnEquity),
    
    // Cash Flow
    free_cashflow: getValue(financialData.freeCashflow),
    operating_cashflow: getValue(financialData.operatingCashflow),
    
    // Growth Rates
    earnings_growth: getValue(financialData.earningsGrowth),
    revenue_growth: getValue(financialData.revenueGrowth),
    
    // Margins
    gross_margins: getValue(financialData.grossMargins),
    ebitda_margins: getValue(financialData.ebitdaMargins),
    operating_margins: getValue(financialData.operatingMargins),
    profit_margins: getValue(financialData.profitMargins),
    
    // Liquidity Ratios
    quick_ratio: getValue(financialData.quickRatio),
    current_ratio: getValue(financialData.currentRatio),
    
    currency: 'USD',
    report_date: currentDate
  };
}

/**
 * Convert stock financials row to markdown format
 * @param {Object} row - Stock financials row
 * @returns {string} Markdown formatted string
 */
function financialsAsMarkdown(row) {
  const formatNumber = (num) => {
    if (num === null || num === undefined) return 'N/A';
    if (num >= 1e12) return `${(num / 1e12).toFixed(2)}T`;
    if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
    return num.toLocaleString();
  };
  
  const formatPercent = (num) => {
    if (num === null || num === undefined) return 'N/A';
    return `${(num * 100).toFixed(2)}%`;
  };
  
  const formatRatio = (num) => {
    if (num === null || num === undefined) return 'N/A';
    return num.toFixed(2);
  };
  
  const parts = [
    `# ${row.symbol} Financial Analysis`,
    '',
    '## Cash & Debt Position',
    `**Total Cash:** ${formatNumber(row.total_cash)} ${row.currency}`,
    `**Cash Per Share:** ${formatRatio(row.total_cash_per_share)} ${row.currency}`,
    `**Total Debt:** ${formatNumber(row.total_debt)} ${row.currency}`,
    `**Debt-to-Equity:** ${formatRatio(row.debt_to_equity)}`,
    '',
    '## Revenue & Profitability',
    `**Total Revenue:** ${formatNumber(row.total_revenue)} ${row.currency}`,
    `**Revenue Per Share:** ${formatRatio(row.revenue_per_share)} ${row.currency}`,
    `**Gross Profits:** ${formatNumber(row.gross_profits)} ${row.currency}`,
    `**EBITDA:** ${formatNumber(row.ebitda)} ${row.currency}`,
    '',
    '## Returns & Efficiency',
    `**Return on Assets (ROA):** ${formatPercent(row.return_on_assets)}`,
    `**Return on Equity (ROE):** ${formatPercent(row.return_on_equity)}`,
    '',
    '## Cash Flow Analysis',
    `**Free Cash Flow:** ${formatNumber(row.free_cashflow)} ${row.currency}`,
    `**Operating Cash Flow:** ${formatNumber(row.operating_cashflow)} ${row.currency}`,
    '',
    '## Growth Metrics',
    `**Earnings Growth:** ${formatPercent(row.earnings_growth)}`,
    `**Revenue Growth:** ${formatPercent(row.revenue_growth)}`,
    '',
    '## Margin Analysis',
    `**Gross Margin:** ${formatPercent(row.gross_margins)}`,
    `**EBITDA Margin:** ${formatPercent(row.ebitda_margins)}`,
    `**Operating Margin:** ${formatPercent(row.operating_margins)}`,
    `**Profit Margin:** ${formatPercent(row.profit_margins)}`,
    '',
    '## Liquidity Ratios',
    `**Quick Ratio:** ${formatRatio(row.quick_ratio)}`,
    `**Current Ratio:** ${formatRatio(row.current_ratio)}`,
    '',
    `**Report Date:** ${row.report_date}`
  ];
  
  return parts.join('\n');
}

/**
 * Main function to fetch Yahoo Finance financial data
 * @param {Object} params - Parameters
 * @param {string} params.symbol - Stock symbol
 * @returns {Promise<Object>} Result with row and markdown
 */
async function fetchYahooFinancials({ symbol }) {
  try {
    
    const financialData = await extractFinancialData(symbol);
    
    if (!financialData) {
      throw new Error('Could not extract financial data from Yahoo Finance page');
    }
    
    const row = toStockFinancialsRow(symbol, financialData);
    const markdown = financialsAsMarkdown(row);
    
    return { row, markdown };
    
  } catch (error) {
    throw error;
  }
}

/**
 * Extract revenue breakdown data from stockanalysis.com
 * @param {string} symbol - Stock ticker symbol
 * @returns {Promise<Object|null>} Revenue breakdown data
 */
async function extractRevenueBreakdownData(symbol) {
  try {
    
    const cheerio = require('cheerio');
    const results = { segments: [], geography: [] };
    
    // Fetch segment breakdown
    try {
      const segmentResponse = await axios.get(`https://stockanalysis.com/stocks/${symbol}/metrics/revenue-by-segment/`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        timeout: 15000
      });
      
      const $segment = cheerio.load(segmentResponse.data);
      
      // Parse segment table
      const segmentHeaders = [];
      $segment('table tr:first-child th, table tr:first-child td').each((i, th) => {
        segmentHeaders.push($segment(th).text().trim());
      });
      
      // Skip the first column (Date) and process revenue segments
      const latestSegmentRow = [];
      $segment('table tr:eq(1) td').each((i, td) => {
        latestSegmentRow.push($segment(td).text().trim());
      });
      
      if (latestSegmentRow.length > 0) {
        const reportDate = latestSegmentRow[0]; // First column is the date
        
        // Process each segment (skip date column)
        for (let i = 1; i < segmentHeaders.length && i < latestSegmentRow.length; i++) {
          const segmentName = segmentHeaders[i];
          const revenueText = latestSegmentRow[i];
          
          if (segmentName && revenueText && segmentName !== reportDate) {
            results.segments.push({
              breakdown_type: 'segment',
              report_date: reportDate,
              item_name: segmentName,
              item_value_text: revenueText,
              item_value: parseRevenueValue(revenueText)
            });
          }
        }
      }
    } catch (segError) {
    }
    
    // Fetch geographic breakdown
    try {
      const geoResponse = await axios.get(`https://stockanalysis.com/stocks/${symbol}/metrics/revenue-by-geography/`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        timeout: 15000
      });
      
      const $geo = cheerio.load(geoResponse.data);
      
      // Parse geographic table
      const geoHeaders = [];
      $geo('table tr:first-child th, table tr:first-child td').each((i, th) => {
        geoHeaders.push($geo(th).text().trim());
      });
      
      const latestGeoRow = [];
      $geo('table tr:eq(1) td').each((i, td) => {
        latestGeoRow.push($geo(td).text().trim());
      });
      
      if (latestGeoRow.length > 0) {
        const reportDate = latestGeoRow[0]; // First column is the date
        
        // Process each geographic region (skip date column)
        for (let i = 1; i < geoHeaders.length && i < latestGeoRow.length; i++) {
          const regionName = geoHeaders[i];
          const revenueText = latestGeoRow[i];
          
          if (regionName && revenueText && regionName !== reportDate) {
            results.geography.push({
              breakdown_type: 'geography',
              report_date: reportDate,
              item_name: regionName,
              item_value_text: revenueText,
              item_value: parseRevenueValue(revenueText)
            });
          }
        }
      }
    } catch (geoError) {
      if (geoError.response?.status === 404) {
      } else {
      }
    }
    
    if (results.segments.length > 0 || results.geography.length > 0) {
      return results;
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Parse revenue value from text like "206.78B" to numeric value
 * @param {string} text - Revenue text like "206.78B"
 * @returns {number|null} Numeric value in actual dollars
 */
function parseRevenueValue(text) {
  if (!text || text === '--' || text === 'N/A') return null;
  
  const match = text.match(/([\d.]+)([BKMGT]?)/);
  if (!match) return null;
  
  const num = parseFloat(match[1]);
  const suffix = match[2];
  
  const multipliers = {
    'K': 1e3,
    'M': 1e6, 
    'B': 1e9,
    'T': 1e12,
    'G': 1e9 // Sometimes used instead of B
  };
  
  return num * (multipliers[suffix] || 1);
}

/**
 * Convert revenue breakdown data to standardized rows
 * @param {string} symbol - Stock symbol
 * @param {Object} revenueData - Raw revenue breakdown data
 * @returns {Array} Array of standardized rows
 */
function toRevenueBreakdownRows(symbol, revenueData) {
  const rows = [];
  
  // Add segment data
  if (revenueData.segments) {
    revenueData.segments.forEach(segment => {
      rows.push({
        symbol: symbol.toUpperCase(),
        breakdown_type: segment.breakdown_type,
        report_date: segment.report_date,
        item_name: segment.item_name,
        item_value: segment.item_value
      });
    });
  }
  
  // Add geographic data
  if (revenueData.geography) {
    revenueData.geography.forEach(geo => {
      rows.push({
        symbol: symbol.toUpperCase(),
        breakdown_type: geo.breakdown_type,
        report_date: geo.report_date,
        item_name: geo.item_name,
        item_value: geo.item_value
      });
    });
  }
  
  return rows;
}

/**
 * Convert revenue breakdown rows to markdown format
 * @param {Array} rows - Array of revenue breakdown rows
 * @param {string} symbol - Stock symbol
 * @returns {string} Markdown formatted string
 */
function revenueBreakdownAsMarkdown(rows, symbol) {
  if (!rows || rows.length === 0) {
    return `# ${symbol} Revenue Breakdown\n\nNo revenue breakdown data available.`;
  }
  
  const formatRevenue = (value) => {
    if (!value) return 'N/A';
    if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}K`;
    return `$${value.toLocaleString()}`;
  };
  
  const segmentRows = rows.filter(r => r.breakdown_type === 'segment');
  const geoRows = rows.filter(r => r.breakdown_type === 'geography');
  
  const parts = [
    `# ${symbol} Revenue Breakdown`,
    ''
  ];
  
  if (segmentRows.length > 0) {
    parts.push('## Revenue by Business Segment');
    parts.push(`**Report Date:** ${segmentRows[0].report_date}`);
    parts.push('');
    parts.push('| Segment | Revenue |');
    parts.push('|---------|---------|');
    
    segmentRows.forEach(row => {
      parts.push(`| ${row.item_name} | ${formatRevenue(row.item_value)} |`);
    });
    
    const totalSegmentRevenue = segmentRows.reduce((sum, row) => sum + (row.item_value || 0), 0);
    parts.push(`| **Total** | **${formatRevenue(totalSegmentRevenue)}** |`);
    parts.push('');
  }
  
  if (geoRows.length > 0) {
    parts.push('## Revenue by Geography');
    parts.push(`**Report Date:** ${geoRows[0].report_date}`);
    parts.push('');
    parts.push('| Region | Revenue |');
    parts.push('|--------|---------|');
    
    geoRows.forEach(row => {
      parts.push(`| ${row.item_name} | ${formatRevenue(row.item_value)} |`);
    });
    
    const totalGeoRevenue = geoRows.reduce((sum, row) => sum + (row.item_value || 0), 0);
    parts.push(`| **Total** | **${formatRevenue(totalGeoRevenue)}** |`);
    parts.push('');
  }
  
  return parts.join('\n');
}

/**
 * Main function to fetch revenue breakdown data
 * @param {Object} params - Parameters
 * @param {string} params.symbol - Stock symbol
 * @returns {Promise<Object>} Result with rows and markdown
 */
async function fetchRevenueBreakdown({ symbol }) {
  try {
    
    const revenueData = await extractRevenueBreakdownData(symbol);
    
    if (!revenueData) {
      throw new Error('Could not extract revenue breakdown data from stockanalysis.com');
    }
    
    const rows = toRevenueBreakdownRows(symbol, revenueData);
    const markdown = revenueBreakdownAsMarkdown(rows, symbol);
    
    return { rows, markdown };
    
  } catch (error) {
    throw error;
  }
}

/**
 * Extract news data from Yahoo Finance quote page or Yahoo Search
 * @param {string} query - Stock ticker symbol or search term
 * @param {boolean} isGeneralSearch - If true, treat as general search term; if false, treat as stock symbol
 * @returns {Promise<Object|null>} News data
 */
async function extractNewsData(query, isGeneralSearch = false) {
  try {
    
    if (isGeneralSearch) {
      // Use Yahoo Search for general topics
      return await extractGeneralNewsData(query);
    } else {
      // Use Yahoo Finance quote page for stock symbols
      return await extractStockNewsData(query);
    }
  } catch (error) {
    return null;
  }
}

/**
 * Extract stock-specific news from Yahoo Finance quote page
 * @param {string} symbol - Stock ticker symbol
 * @returns {Promise<Array|null>} News items
 */
async function extractStockNewsData(symbol) {
  const sentiment = new Sentiment();
  const response = await axios.get(`https://finance.yahoo.com/quote/${symbol}?p=${symbol}`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1'
    },
    timeout: 15000
  });
  
  const $ = cheerio.load(response.data);
  
  // Find the news section
  const newsSection = $('[data-testid*="news"]');
  if (newsSection.length === 0) {
    return null;
  }
  
  
  const newsItems = [];
  
  // Extract news items using the working selector
  newsSection.find('[data-testid*="story"]').each((i, item) => {
    const $item = $(item);
    
    // Extract the link
    const link = $item.find('a').first().attr('href');
    if (!link) return;
    
    // Extract title from the link text or first line
    const fullText = $item.text().trim();
    const lines = fullText.split(/\s{2,}/); // Split on multiple spaces
    
    if (lines.length === 0) return;
    
    const title = lines[0].trim();
    if (!title || title.length < 10) return;
    
    // Extract publisher and timestamp info
    let publisher = null;
    let timestamp = null;
    
    // Look for publisher • timestamp pattern
    for (let j = 1; j < lines.length; j++) {
      const line = lines[j].trim();
      if (line.includes('•')) {
        const parts = line.split('•');
        if (parts.length >= 2) {
          publisher = parts[0].trim();
          timestamp = parts[1].trim();
          break;
        }
      } else if (line.match(/\d+\s+(minute|hour|day)s?\s+ago/)) {
        timestamp = line.trim();
        // Publisher might be in previous line
        if (j > 0) {
          const prevLine = lines[j-1].trim();
          if (prevLine.length < 50 && !prevLine.includes('http')) {
            publisher = prevLine;
          }
        }
        break;
      }
    }
    
    // Generate UUID (simple implementation)
    const uuid = `news_${symbol}_${Date.now()}_${i}`;
    
    // Determine content type
    let type = 'news';
    if (link.includes('/video/')) {
      type = 'video';
    } else if (title.toLowerCase().includes('earnings')) {
      type = 'earnings';
    } else if (title.toLowerCase().includes('sec filing')) {
      type = 'sec_filing';
    }
    
    // Analyze sentiment
    const titleSentiment = sentiment.analyze(title);
    const contentSentiment = sentiment.analyze(fullText.substring(0, 500));
    
    // Calculate combined sentiment score
    const combinedScore = (titleSentiment.score * 2 + contentSentiment.score) / 3; // Weight title more heavily
    const combinedComparative = (titleSentiment.comparative * 2 + contentSentiment.comparative) / 3;
    
    // Determine sentiment classification
    let sentimentLabel = 'neutral';
    let bullishBearish = 'neutral';
    
    if (combinedComparative > 0.1) {
      sentimentLabel = 'positive';
      bullishBearish = 'bullish';
    } else if (combinedComparative < -0.1) {
      sentimentLabel = 'negative';
      bullishBearish = 'bearish';
    }
    
    const newsItem = {
      uuid: uuid,
      related_symbols: [symbol.toUpperCase()],
      title: title,
      publisher: publisher || 'Unknown',
      report_date: timestamp || 'Unknown',
      type: type,
      link: link.startsWith('http') ? link : `https://finance.yahoo.com${link}`,
      sentiment: {
        score: Math.round(combinedScore * 100) / 100,
        comparative: Math.round(combinedComparative * 1000) / 1000,
        label: sentimentLabel,
        bullish_bearish: bullishBearish,
        positive_words: [...new Set([...titleSentiment.positive, ...contentSentiment.positive])],
        negative_words: [...new Set([...titleSentiment.negative, ...contentSentiment.negative])]
      },
      news: [{
        paragraph_number: 1,
        highlight: title,
        paragraph: fullText.substring(0, 500) // First 500 chars as content preview
      }]
    };
    
    newsItems.push(newsItem);
  });
  
  if (newsItems.length > 0) {
    return newsItems;
  }
  
  return null;
}

/**
 * Extract general news from Yahoo Search
 * @param {string} searchTerm - Search term or phrase
 * @returns {Promise<Array|null>} News items
 */
async function extractGeneralNewsData(searchTerm) {
  const sentiment = new Sentiment();
  const searchUrl = `https://search.yahoo.com/search?p=${encodeURIComponent(searchTerm + ' news')}&ei=UTF-8`;
  
  const response = await axios.get(searchUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1'
    },
    timeout: 15000
  });
  
  const $ = cheerio.load(response.data);
  
  const newsItems = [];
  
  // Extract search results
  $('.dd.algo').each((i, item) => {
    const $item = $(item);
    
    // Extract title and link
    const titleLink = $item.find('h3 a').first();
    const title = titleLink.text().trim();
    let link = titleLink.attr('href');
    
    if (!title || title.length < 10 || !link) return;
    
    // Clean up Yahoo search redirect links
    if (link.includes('r.search.yahoo.com')) {
      const urlMatch = link.match(/RU=([^/]+)/);
      if (urlMatch) {
        link = decodeURIComponent(urlMatch[1]);
      }
    }
    
    // Extract source/publisher from the URL or result
    let publisher = 'Unknown';
    const sourceElement = $item.find('.fz-ms').first();
    if (sourceElement.length > 0) {
      publisher = sourceElement.text().trim().split('https://')[0].trim() || 'Unknown';
    } else {
      // Try to extract from URL
      try {
        const urlObj = new URL(link);
        publisher = urlObj.hostname.replace('www.', '');
      } catch (e) {
        publisher = 'Unknown';
      }
    }
    
    // Extract snippet/description
    const snippet = $item.find('.compText').text().trim() || 
                   $item.find('p').text().trim() || 
                   title;
    
    // Generate UUID
    const uuid = `search_${searchTerm.replace(/\s+/g, '_')}_${Date.now()}_${i}`;
    
    // Determine content type
    let type = 'news';
    if (title.toLowerCase().includes('video') || link.includes('video')) {
      type = 'video';
    } else if (title.toLowerCase().includes('earnings')) {
      type = 'earnings';
    }
    
    // Try to extract related symbols from title/content
    const symbolPattern = /\b([A-Z]{1,5})\b/g;
    const potentialSymbols = [];
    const titleUppercase = title.toUpperCase();
    const matches = titleUppercase.match(symbolPattern);
    if (matches) {
      // Filter for likely stock symbols (2-5 chars, common symbols)
      const commonSymbols = ['TSLA', 'BTC', 'ETH', 'AAPL', 'GOOGL', 'MSFT', 'AMZN', 'META', 'NVDA'];
      potentialSymbols.push(...matches.filter(match => 
        match.length >= 2 && match.length <= 5 && 
        (commonSymbols.includes(match) || match.endsWith('-USD'))
      ));
    }
    
    // Analyze sentiment for general search results
    const titleSentiment = sentiment.analyze(title);
    const contentSentiment = sentiment.analyze(snippet);
    
    const combinedScore = (titleSentiment.score * 2 + contentSentiment.score) / 3;
    const combinedComparative = (titleSentiment.comparative * 2 + contentSentiment.comparative) / 3;
    
    let sentimentLabel = 'neutral';
    let bullishBearish = 'neutral';
    
    if (combinedComparative > 0.1) {
      sentimentLabel = 'positive';
      bullishBearish = 'bullish';
    } else if (combinedComparative < -0.1) {
      sentimentLabel = 'negative';
      bullishBearish = 'bearish';
    }

    const newsItem = {
      uuid: uuid,
      related_symbols: potentialSymbols.length > 0 ? [...new Set(potentialSymbols)] : [searchTerm.toUpperCase()],
      title: title,
      publisher: publisher,
      report_date: 'Recent', // Yahoo search doesn't provide precise timestamps
      type: type,
      link: link,
      sentiment: {
        score: Math.round(combinedScore * 100) / 100,
        comparative: Math.round(combinedComparative * 1000) / 1000,
        label: sentimentLabel,
        bullish_bearish: bullishBearish,
        positive_words: [...new Set([...titleSentiment.positive, ...contentSentiment.positive])],
        negative_words: [...new Set([...titleSentiment.negative, ...contentSentiment.negative])]
      },
      news: [{
        paragraph_number: 1,
        highlight: title,
        paragraph: snippet.substring(0, 500)
      }]
    };
    
    newsItems.push(newsItem);
  });
  
  if (newsItems.length > 0) {
    return newsItems;
  }
  
  return null;
}

/**
 * Convert news data to standardized rows
 * @param {string} symbol - Stock symbol
 * @param {Array} newsData - Raw news data  
 * @returns {Array} Array of standardized news rows
 */
function toNewsRows(symbol, newsData) {
  if (!newsData || !Array.isArray(newsData)) {
    return [];
  }
  
  return newsData.map(item => ({
    uuid: item.uuid,
    related_symbols: item.related_symbols,
    title: item.title,
    publisher: item.publisher,
    report_date: item.report_date,
    type: item.type,
    link: item.link,
    news: item.news
  }));
}

/**
 * Convert news rows to markdown format
 * @param {Array} rows - Array of news rows
 * @param {string} symbol - Stock symbol
 * @returns {string} Markdown formatted string
 */
function newsAsMarkdown(rows, symbol) {
  if (!rows || rows.length === 0) {
    return `# ${symbol} Stock News\n\nNo recent news articles found.`;
  }
  
  const parts = [
    `# ${symbol} Stock News`,
    '',
    `**Found ${rows.length} recent news articles:**`,
    ''
  ];
  
  // Calculate sentiment summary
  const sentimentCounts = { bullish: 0, bearish: 0, neutral: 0 };
  let totalSentiment = 0;
  
  rows.forEach(article => {
    if (article.sentiment) {
      sentimentCounts[article.sentiment.bullish_bearish]++;
      totalSentiment += article.sentiment.score;
    }
  });

  const avgSentiment = totalSentiment / rows.length;
  const overallSentiment = avgSentiment > 0.5 ? 'Bullish' : avgSentiment < -0.5 ? 'Bearish' : 'Neutral';

  parts.push('## Sentiment Analysis');
  parts.push(`**Overall Sentiment:** ${overallSentiment} (${avgSentiment.toFixed(2)} avg score)`);
  parts.push(`**Distribution:** ${sentimentCounts.bullish} Bullish, ${sentimentCounts.neutral} Neutral, ${sentimentCounts.bearish} Bearish`);
  parts.push('');

  rows.forEach((article, i) => {
    const sentimentEmoji = article.sentiment ? 
      (article.sentiment.bullish_bearish === 'bullish' ? '📈' : 
       article.sentiment.bullish_bearish === 'bearish' ? '📉' : '➡️') : '';
    
    parts.push(`## ${i + 1}. ${sentimentEmoji} ${article.title}`);
    parts.push(`**Publisher:** ${article.publisher}`);
    parts.push(`**Date:** ${article.report_date}`);
    parts.push(`**Type:** ${article.type}`);
    
    if (article.sentiment) {
      parts.push(`**Sentiment:** ${article.sentiment.bullish_bearish.toUpperCase()} (${article.sentiment.score})`);
      if (article.sentiment.positive_words.length > 0) {
        parts.push(`**Positive words:** ${article.sentiment.positive_words.join(', ')}`);
      }
      if (article.sentiment.negative_words.length > 0) {
        parts.push(`**Negative words:** ${article.sentiment.negative_words.join(', ')}`);
      }
    }
    
    parts.push(`**Link:** [Read Full Article](${article.link})`);

    if (article.news && article.news.length > 0) {
      parts.push('**Preview:**');
      parts.push(article.news[0].paragraph.substring(0, 200) + '...');
    }

    parts.push('');
  });
  
  return parts.join('\n');
}

/**
 * Main function to fetch stock news data
 * @param {Object} params - Parameters
 * @param {string} params.symbol - Stock symbol or search query
 * @param {string} params.search_type - 'stock' for stock symbols, 'general' for search terms (optional, defaults to 'stock')
 * @returns {Promise<Object>} Result with rows and markdown
 */
async function fetchStockNews({ symbol, search_type = 'stock' }) {
  try {
    
    const isGeneralSearch = search_type === 'general';
    const newsData = await extractNewsData(symbol, isGeneralSearch);
    
    if (!newsData) {
      throw new Error(`Could not extract news data for ${symbol}`);
    }
    
    const rows = toNewsRows(symbol, newsData);
    const markdown = newsAsMarkdown(rows, symbol);
    
    return { rows, markdown };
    
  } catch (error) {
    throw error;
  }
}

// Placeholder functions for remaining methods (ownership data not available in Yahoo Finance)

/**
 * Extract peer comparison data using industry classification
 * @param {string} symbol - Stock ticker symbol
 * @returns {Promise<Object|null>} Peer comparison data
 */
async function extractPeerData(symbol) {
  try {
    
    // First get the target company's industry and key metrics
    const response = await axios.get(`https://finance.yahoo.com/quote/${symbol}?p=${symbol}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1'
      },
      timeout: 15000
    });
    
    const html = response.data;
    
    // Extract industry and sector
    const industryMatch = html.match(/\\"industry\\":\\"([^"]+)\\"/);
    const sectorMatch = html.match(/\\"sector\\":\\"([^"]+)\\"/);
    
    if (!industryMatch) {
      return null;
    }
    
    const industry = industryMatch[1];
    const sector = sectorMatch ? sectorMatch[1] : 'Unknown';
    
    
    // Define peer mappings based on industry/symbol
    const peerMappings = {
      // Technology
      'AAPL': ['MSFT', 'GOOGL', 'AMZN', 'META'],
      'MSFT': ['AAPL', 'GOOGL', 'AMZN', 'META'],
      'GOOGL': ['AAPL', 'MSFT', 'AMZN', 'META'],
      'META': ['AAPL', 'MSFT', 'GOOGL', 'AMZN'],
      
      // Auto/EV
      'TSLA': ['NIO', 'RIVN', 'F', 'GM'],
      'F': ['GM', 'TSLA', 'RIVN', 'NIO'],
      'GM': ['F', 'TSLA', 'RIVN', 'NIO'],
      
      // Semiconductors
      'NVDA': ['AMD', 'INTC', 'QCOM', 'AVGO'],
      'AMD': ['NVDA', 'INTC', 'QCOM', 'AVGO'],
      'INTC': ['NVDA', 'AMD', 'QCOM', 'AVGO'],
      
      // Banks
      'JPM': ['BAC', 'WFC', 'C', 'GS'],
      'BAC': ['JPM', 'WFC', 'C', 'GS'],
      
      // Healthcare
      'JNJ': ['PFE', 'MRK', 'ABBV', 'UNH'],
      'PFE': ['JNJ', 'MRK', 'ABBV', 'UNH'],
      
      // Retail
      'WMT': ['TGT', 'COST', 'HD', 'LOW'],
      'AMZN': ['WMT', 'TGT', 'COST', 'EBAY']
    };
    
    // Get peers for this symbol, fallback to industry-based logic
    let peers = peerMappings[symbol.toUpperCase()] || [];
    
    // If no predefined peers, use some defaults based on industry keywords
    if (peers.length === 0) {
      if (industry.toLowerCase().includes('auto')) {
        peers = ['F', 'GM', 'HMC', 'TM'];
      } else if (industry.toLowerCase().includes('tech') || industry.toLowerCase().includes('software')) {
        peers = ['AAPL', 'MSFT', 'GOOGL', 'META'];
      } else if (industry.toLowerCase().includes('bank') || industry.toLowerCase().includes('financial')) {
        peers = ['JPM', 'BAC', 'WFC', 'C'];
      } else if (industry.toLowerCase().includes('health') || industry.toLowerCase().includes('pharma')) {
        peers = ['JNJ', 'PFE', 'MRK', 'UNH'];
      } else {
        // Generic large caps as fallback
        peers = ['AAPL', 'MSFT', 'AMZN', 'GOOGL'];
      }
    }
    
    // Extract key metrics for comparison
    const metrics = {};
    const metricPatterns = {
      marketCap: /\\"marketCap\\":\{[^}]*\\"raw\\":(\d+)/,
      trailingPE: /\\"trailingPE\\":\{[^}]*\\"raw\\":(\d+\.?\d*)/,
      forwardPE: /\\"forwardPE\\":\{[^}]*\\"raw\\":(\d+\.?\d*)/,
      pegRatio: /\\"pegRatio\\":\{[^}]*\\"raw\\":(\d+\.?\d*)/,
      priceToBook: /\\"priceToBook\\":\{[^}]*\\"raw\\":(\d+\.?\d*)/,
      enterpriseValue: /\\"enterpriseValue\\":\{[^}]*\\"raw\\":(\d+)/,
      revenueGrowth: /\\"revenueGrowth\\":\{[^}]*\\"raw\\":(\d+\.?\d*)/,
      earningsGrowth: /\\"earningsGrowth\\":\{[^}]*\\"raw\\":(\d+\.?\d*)/
    };
    
    for (const [metric, pattern] of Object.entries(metricPatterns)) {
      const match = html.match(pattern);
      if (match) {
        metrics[metric] = parseFloat(match[1]);
      }
    }
    
    return {
      symbol: symbol.toUpperCase(),
      industry,
      sector,
      peers: peers.slice(0, 4), // Limit to 4 peers
      metrics
    };
    
  } catch (error) {
    return null;
  }
}

/**
 * Fetch metrics for peer companies
 * @param {Array} peers - Array of peer symbols
 * @returns {Promise<Object>} Peer metrics
 */
async function fetchPeerMetrics(peers) {
  const peerData = {};
  
  for (const peer of peers) {
    try {
      
      const response = await axios.get(`https://finance.yahoo.com/quote/${peer}?p=${peer}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1'
        },
        timeout: 10000
      });
      
      const html = response.data;
      const metrics = {};
      
      const metricPatterns = {
        marketCap: /\\"marketCap\\":\{[^}]*\\"raw\\":(\d+)/,
        trailingPE: /\\"trailingPE\\":\{[^}]*\\"raw\\":(\d+\.?\d*)/,
        forwardPE: /\\"forwardPE\\":\{[^}]*\\"raw\\":(\d+\.?\d*)/,
        pegRatio: /\\"pegRatio\\":\{[^}]*\\"raw\\":(\d+\.?\d*)/,
        priceToBook: /\\"priceToBook\\":\{[^}]*\\"raw\\":(\d+\.?\d*)/,
        enterpriseValue: /\\"enterpriseValue\\":\{[^}]*\\"raw\\":(\d+)/,
        revenueGrowth: /\\"revenueGrowth\\":\{[^}]*\\"raw\\":(\d+\.?\d*)/,
        earningsGrowth: /\\"earningsGrowth\\":\{[^}]*\\"raw\\":(\d+\.?\d*)/
      };
      
      for (const [metric, pattern] of Object.entries(metricPatterns)) {
        const match = html.match(pattern);
        if (match) {
          metrics[metric] = parseFloat(match[1]);
        }
      }
      
      peerData[peer] = metrics;
      
      // Small delay to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      peerData[peer] = null;
    }
  }
  
  return peerData;
}

/**
 * Convert peer data to standardized rows
 * @param {Object} targetData - Target company data
 * @param {Object} peerMetrics - Peer company metrics
 * @returns {Array} Array of comparison rows
 */
function toPeerComparisonRows(targetData, peerMetrics) {
  const rows = [];
  const currentDate = new Date().toISOString().split('T')[0];
  
  // Add target company row
  rows.push({
    symbol: targetData.symbol,
    company_type: 'target',
    industry: targetData.industry,
    sector: targetData.sector,
    market_cap: targetData.metrics.marketCap || null,
    trailing_pe: targetData.metrics.trailingPE || null,
    forward_pe: targetData.metrics.forwardPE || null,
    peg_ratio: targetData.metrics.pegRatio || null,
    price_to_book: targetData.metrics.priceToBook || null,
    enterprise_value: targetData.metrics.enterpriseValue || null,
    revenue_growth: targetData.metrics.revenueGrowth || null,
    earnings_growth: targetData.metrics.earningsGrowth || null,
    report_date: currentDate
  });
  
  // Add peer rows
  Object.entries(peerMetrics).forEach(([symbol, metrics]) => {
    if (metrics) {
      rows.push({
        symbol: symbol,
        company_type: 'peer',
        industry: targetData.industry,
        sector: targetData.sector,
        market_cap: metrics.marketCap || null,
        trailing_pe: metrics.trailingPE || null,
        forward_pe: metrics.forwardPE || null,
        peg_ratio: metrics.pegRatio || null,
        price_to_book: metrics.priceToBook || null,
        enterprise_value: metrics.enterpriseValue || null,
        revenue_growth: metrics.revenueGrowth || null,
        earnings_growth: metrics.earningsGrowth || null,
        report_date: currentDate
      });
    }
  });
  
  return rows;
}

/**
 * Convert peer comparison to markdown
 */
function peerComparisonAsMarkdown(rows, targetSymbol) {
  if (!rows || rows.length === 0) {
    return `# ${targetSymbol} Peer Comparison\n\nNo peer comparison data available.`;
  }

  const targetRow = rows.find(row => row.company_type === 'target');
  const peerRows = rows.filter(row => row.company_type === 'peer');

  const parts = [
    `# ${targetSymbol} Peer Comparison`,
    '',
    `**Industry:** ${targetRow.industry}`,
    `**Sector:** ${targetRow.sector}`,
    `**Peer Companies:** ${peerRows.map(p => p.symbol).join(', ')}`,
    '',
    '## Valuation Metrics Comparison',
    '',
    '| Company | Market Cap (B) | P/E Ratio | Forward P/E | PEG Ratio | P/B Ratio |',
    '|---------|----------------|-----------|-------------|-----------|-----------|'
  ];

  // Add target company first
  const formatMarketCap = (val) => val ? `$${(val / 1e9).toFixed(1)}B` : 'N/A';
  const formatRatio = (val) => val ? val.toFixed(2) : 'N/A';

  parts.push(`| **${targetRow.symbol}** | ${formatMarketCap(targetRow.market_cap)} | ${formatRatio(targetRow.trailing_pe)} | ${formatRatio(targetRow.forward_pe)} | ${formatRatio(targetRow.peg_ratio)} | ${formatRatio(targetRow.price_to_book)} |`);

  // Add peers
  peerRows.forEach(row => {
    parts.push(`| ${row.symbol} | ${formatMarketCap(row.market_cap)} | ${formatRatio(row.trailing_pe)} | ${formatRatio(row.forward_pe)} | ${formatRatio(row.peg_ratio)} | ${formatRatio(row.price_to_book)} |`);
  });

  parts.push('');
  parts.push('## Growth Metrics');
  parts.push('');
  parts.push('| Company | Revenue Growth | Earnings Growth |');
  parts.push('|---------|----------------|-----------------|');

  const formatGrowth = (val) => val ? `${(val * 100).toFixed(1)}%` : 'N/A';

  parts.push(`| **${targetRow.symbol}** | ${formatGrowth(targetRow.revenue_growth)} | ${formatGrowth(targetRow.earnings_growth)} |`);
  peerRows.forEach(row => {
    parts.push(`| ${row.symbol} | ${formatGrowth(row.revenue_growth)} | ${formatGrowth(row.earnings_growth)} |`);
  });

  // Add analysis
  parts.push('');
  parts.push('## Analysis');
  
  if (targetRow.trailing_pe && peerRows.length > 0) {
    const peerPEs = peerRows.filter(p => p.trailing_pe).map(p => p.trailing_pe);
    if (peerPEs.length > 0) {
      const avgPeerPE = peerPEs.reduce((a, b) => a + b, 0) / peerPEs.length;
      const comparison = targetRow.trailing_pe > avgPeerPE ? 'higher' : 'lower';
      parts.push(`**Valuation:** ${targetSymbol} trades at a ${comparison} P/E ratio (${targetRow.trailing_pe.toFixed(2)}) compared to peer average (${avgPeerPE.toFixed(2)})`);
    }
  }

  return parts.join('\n');
}

async function fetchStockPeers({ symbol }) {
  try {
    
    const targetData = await extractPeerData(symbol);
    
    if (!targetData) {
      throw new Error('Could not extract target company data for peer analysis');
    }
    
    
    const peerMetrics = await fetchPeerMetrics(targetData.peers);
    
    const rows = toPeerComparisonRows(targetData, peerMetrics);
    const markdown = peerComparisonAsMarkdown(rows, symbol);
    
    return { rows, markdown };
    
  } catch (error) {
    throw error;
  }
}

async function fetchYahooEarningsHistory({ symbol }) {
  return { rows: [{ symbol, message: "Earnings history extraction not yet implemented" }], markdown: `# ${symbol} Earnings History\n\nEarnings history extraction coming soon.` };
}

/**
 * Extract analyst recommendations data from Yahoo Finance
 * @param {string} symbol - Stock ticker symbol
 * @returns {Promise<Array|null>} Recommendations data
 */
async function extractRecommendationsData(symbol) {
  try {
    
    const response = await axios.get(`https://finance.yahoo.com/quote/${symbol}?p=${symbol}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1'
      },
      timeout: 15000
    });
    
    const html = response.data;
    
    // Search for recommendation trend data
    const recommendationPattern = /\\"recommendationTrend\\":\{[^}]*\\"trend\\":\[([^\]]+)\]/;
    const match = html.match(recommendationPattern);
    
    if (!match) {
      return null;
    }
    
    const trendData = match[1];
    
    // Extract individual recommendation periods
    const periodPattern = /\{([^}]+)\}/g;
    const periods = [];
    let periodMatch;
    
    while ((periodMatch = periodPattern.exec(trendData)) !== null) {
      const periodData = periodMatch[1];
      
      // Extract fields from each period
      const fields = {};
      const fieldPatterns = {
        period: /\\"period\\":\\"([^"]+)\\"/,
        strongBuy: /\\"strongBuy\\":(\d+)/,
        buy: /\\"buy\\":(\d+)/,
        hold: /\\"hold\\":(\d+)/,
        sell: /\\"sell\\":(\d+)/,
        strongSell: /\\"strongSell\\":(\d+)/
      };
      
      for (const [field, pattern] of Object.entries(fieldPatterns)) {
        const fieldMatch = periodData.match(pattern);
        if (fieldMatch) {
          fields[field] = field === 'period' ? fieldMatch[1] : parseInt(fieldMatch[1]);
        }
      }
      
      if (fields.period) {
        periods.push(fields);
      }
    }
    
    if (periods.length > 0) {
      return periods;
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Convert recommendations data to standardized rows
 * @param {string} symbol - Stock symbol
 * @param {Array} recommendationsData - Raw recommendations data
 * @returns {Array} Array of standardized recommendation rows
 */
function toRecommendationsRows(symbol, recommendationsData) {
  if (!recommendationsData || !Array.isArray(recommendationsData)) {
    return [];
  }

  return recommendationsData.map(period => {
    const total = (period.strongBuy || 0) + (period.buy || 0) + (period.hold || 0) + (period.sell || 0) + (period.strongSell || 0);
    
    return {
      symbol: symbol.toUpperCase(),
      period: period.period,
      strong_buy: period.strongBuy || 0,
      buy: period.buy || 0,
      hold: period.hold || 0,
      sell: period.sell || 0,
      strong_sell: period.strongSell || 0,
      total_analysts: total,
      positive_ratings: (period.strongBuy || 0) + (period.buy || 0),
      negative_ratings: (period.sell || 0) + (period.strongSell || 0),
      consensus_score: total > 0 ? (((period.strongBuy || 0) * 5 + (period.buy || 0) * 4 + (period.hold || 0) * 3 + (period.sell || 0) * 2 + (period.strongSell || 0) * 1) / total).toFixed(2) : null,
      report_date: new Date().toISOString().split('T')[0]
    };
  });
}

/**
 * Convert recommendations rows to markdown format
 * @param {Array} rows - Array of recommendation rows
 * @param {string} symbol - Stock symbol
 * @returns {string} Markdown formatted string
 */
function recommendationsAsMarkdown(rows, symbol) {
  if (!rows || rows.length === 0) {
    return `# ${symbol} Analyst Recommendations\n\nNo analyst recommendations data available.`;
  }

  const parts = [
    `# ${symbol} Analyst Recommendations`,
    '',
    `**Total Periods:** ${rows.length}`,
    ''
  ];

  // Add summary table
  parts.push('| Period | Strong Buy | Buy | Hold | Sell | Strong Sell | Total | Consensus Score |');
  parts.push('|--------|------------|-----|------|------|-------------|-------|-----------------|');

  rows.forEach(row => {
    parts.push(`| ${row.period} | ${row.strong_buy} | ${row.buy} | ${row.hold} | ${row.sell} | ${row.strong_sell} | ${row.total_analysts} | ${row.consensus_score}/5.0 |`);
  });

  parts.push('');
  
  // Add interpretation
  const latestRow = rows[0];
  if (latestRow && latestRow.consensus_score) {
    const score = parseFloat(latestRow.consensus_score);
    let interpretation = '';
    if (score >= 4.5) interpretation = 'Strong Buy';
    else if (score >= 3.5) interpretation = 'Buy';
    else if (score >= 2.5) interpretation = 'Hold';
    else if (score >= 1.5) interpretation = 'Sell';
    else interpretation = 'Strong Sell';
    
    parts.push(`**Latest Consensus:** ${interpretation} (${latestRow.consensus_score}/5.0)`);
    parts.push(`**Total Analysts:** ${latestRow.total_analysts}`);
    parts.push(`**Positive Ratings:** ${latestRow.positive_ratings} (${((latestRow.positive_ratings / latestRow.total_analysts) * 100).toFixed(1)}%)`);
  }

  return parts.join('\n');
}

async function fetchYahooRecommendations({ symbol }) {
  try {
    
    const recommendationsData = await extractRecommendationsData(symbol);
    
    if (!recommendationsData) {
      throw new Error('Could not extract recommendations data from Yahoo Finance page');
    }
    
    const rows = toRecommendationsRows(symbol, recommendationsData);
    const markdown = recommendationsAsMarkdown(rows, symbol);
    
    return { rows, markdown };
    
  } catch (error) {
    throw error;
  }
}

/**
 * Extract ESG (Environmental, Social, Governance) data from Yahoo Finance
 * @param {string} symbol - Stock ticker symbol
 * @returns {Promise<Object|null>} ESG data
 */
async function extractESGData(symbol) {
  try {
    
    const response = await axios.get(`https://finance.yahoo.com/quote/${symbol}?p=${symbol}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1'
      },
      timeout: 15000
    });
    
    const html = response.data;
    
    // Search for ESG scores data with more flexible pattern
    const esgPattern = /\\"esgScores\\":\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/;
    const match = html.match(esgPattern);
    
    if (!match) {
      return null;
    }
    
    const esgData = match[1];
    
    // Extract ESG fields
    const result = {};
    const fieldPatterns = {
      totalEsg: /\\"totalEsg\\":\{[^}]*\\"raw\\":(\d+\.?\d*)/,
      environmentScore: /\\"environmentScore\\":\{[^}]*\\"raw\\":(\d+\.?\d*)/,
      socialScore: /\\"socialScore\\":\{[^}]*\\"raw\\":(\d+\.?\d*)/,
      governanceScore: /\\"governanceScore\\":\{[^}]*\\"raw\\":(\d+\.?\d*)/,
      peer: /\\"peer\\":\{[^}]*\\"raw\\":(\d+\.?\d*)/,
      percentile: /\\"percentile\\":\{[^}]*\\"raw\\":(\d+\.?\d*)/,
      adult: /\\"adult\\":(true|false)/,
      alcoholic: /\\"alcoholic\\":(true|false)/,
      animalTesting: /\\"animalTesting\\":(true|false)/,
      catholicValues: /\\"catholicValues\\":(true|false)/,
      controversialWeapons: /\\"controversialWeapons\\":(true|false)/,
      gambling: /\\"gambling\\":(true|false)/,
      gmo: /\\"gmo\\":(true|false)/,
      militaryContract: /\\"militaryContract\\":(true|false)/,
      nuclear: /\\"nuclear\\":(true|false)/,
      pesticides: /\\"pesticides\\":(true|false)/,
      palmOil: /\\"palmOil\\":(true|false)/,
      coal: /\\"coal\\":(true|false)/,
      tobacco: /\\"tobacco\\":(true|false)/
    };
    
    for (const [field, pattern] of Object.entries(fieldPatterns)) {
      const fieldMatch = esgData.match(pattern);
      if (fieldMatch) {
        if (field.includes('Score') || field === 'totalEsg' || field === 'peer' || field === 'percentile') {
          result[field] = parseFloat(fieldMatch[1]);
        } else {
          result[field] = fieldMatch[1] === 'true';
        }
      } else {
      }
    }
    
    
    if (Object.keys(result).length >= 1) {
      return result;
    } else {
      return null;
    }
    
  } catch (error) {
    return null;
  }
}

/**
 * Convert ESG data to standardized row
 * @param {string} symbol - Stock symbol
 * @param {Object} esgData - Raw ESG data
 * @returns {Object} Standardized ESG row
 */
function toESGRow(symbol, esgData) {
  const currentDate = new Date().toISOString().split('T')[0];
  
  return {
    symbol: symbol.toUpperCase(),
    total_esg_score: esgData.totalEsg || null,
    environment_score: esgData.environmentScore || null,
    social_score: esgData.socialScore || null,
    governance_score: esgData.governanceScore || null,
    peer_average: esgData.peer || null,
    percentile: esgData.percentile || null,
    // Controversy flags
    adult_content: esgData.adult || false,
    alcoholic_beverages: esgData.alcoholic || false,
    animal_testing: esgData.animalTesting || false,
    catholic_values: esgData.catholicValues || false,
    controversial_weapons: esgData.controversialWeapons || false,
    gambling: esgData.gambling || false,
    gmo: esgData.gmo || false,
    military_contract: esgData.militaryContract || false,
    nuclear: esgData.nuclear || false,
    pesticides: esgData.pesticides || false,
    palm_oil: esgData.palmOil || false,
    coal: esgData.coal || false,
    tobacco: esgData.tobacco || false,
    report_date: currentDate
  };
}

/**
 * Convert ESG row to markdown format
 * @param {Object} row - ESG row
 * @param {string} symbol - Stock symbol
 * @returns {string} Markdown formatted string
 */
function esgAsMarkdown(row, symbol) {
  if (!row || !row.total_esg_score) {
    return `# ${symbol} ESG Scores\n\nNo ESG data available for this company.`;
  }

  const parts = [
    `# ${symbol} ESG Scores`,
    '',
    '## Overall Scores',
    `**Total ESG Score:** ${row.total_esg_score}/100`,
    `**Environment Score:** ${row.environment_score}/100`,
    `**Social Score:** ${row.social_score}/100`, 
    `**Governance Score:** ${row.governance_score}/100`,
    '',
    '## Peer Comparison',
    `**Peer Average:** ${row.peer_average}/100`,
    `**Percentile Rank:** ${row.percentile}%`,
    ''
  ];

  // Add interpretation
  let interpretation = '';
  if (row.total_esg_score >= 80) interpretation = 'Excellent ESG performance';
  else if (row.total_esg_score >= 60) interpretation = 'Good ESG performance';
  else if (row.total_esg_score >= 40) interpretation = 'Average ESG performance';
  else if (row.total_esg_score >= 20) interpretation = 'Below average ESG performance';
  else interpretation = 'Poor ESG performance';
  
  parts.push(`**Assessment:** ${interpretation}`);
  parts.push('');

  // Add controversy screening
  const controversies = [];
  if (row.adult_content) controversies.push('Adult content');
  if (row.alcoholic_beverages) controversies.push('Alcoholic beverages');
  if (row.animal_testing) controversies.push('Animal testing');
  if (row.controversial_weapons) controversies.push('Controversial weapons');
  if (row.gambling) controversies.push('Gambling');
  if (row.gmo) controversies.push('GMO');
  if (row.military_contract) controversies.push('Military contracts');
  if (row.nuclear) controversies.push('Nuclear');
  if (row.pesticides) controversies.push('Pesticides');
  if (row.palm_oil) controversies.push('Palm oil');
  if (row.coal) controversies.push('Coal');
  if (row.tobacco) controversies.push('Tobacco');

  if (controversies.length > 0) {
    parts.push('## Controversy Screening');
    parts.push('**Involved in:** ' + controversies.join(', '));
  } else {
    parts.push('## Controversy Screening');
    parts.push('**No major controversies identified**');
  }

  return parts.join('\n');
}

async function fetchYahooESG({ symbol }) {
  try {
    
    const esgData = await extractESGData(symbol);
    
    if (!esgData) {
      throw new Error('Could not extract ESG data from Yahoo Finance page');
    }
    
    const row = toESGRow(symbol, esgData);
    const markdown = esgAsMarkdown(row, symbol);
    
    return { row, markdown };
    
  } catch (error) {
    throw error;
  }
}

/**
 * Extract dividend data from Yahoo Finance
 * @param {string} symbol - Stock ticker symbol
 * @returns {Promise<Object|null>} Dividend data
 */
async function extractDividendData(symbol) {
  try {
    
    const response = await axios.get(`https://finance.yahoo.com/quote/${symbol}?p=${symbol}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1'
      },
      timeout: 15000
    });
    
    const html = response.data;
    
    // Extract dividend-related fields
    const result = {};
    const fieldPatterns = {
      dividendRate: /\\"dividendRate\\":\{[^}]*\\"raw\\":(\d+\.?\d*)/,
      dividendYield: /\\"dividendYield\\":\{[^}]*\\"raw\\":(\d+\.?\d*)/,
      exDividendDate: /\\"exDividendDate\\":\{[^}]*\\"raw\\":(\d+)/,
      payoutRatio: /\\"payoutRatio\\":\{[^}]*\\"raw\\":(\d+\.?\d*)/,
      fiveYearAvgDividendYield: /\\"fiveYearAvgDividendYield\\":\{[^}]*\\"raw\\":(\d+\.?\d*)/,
      lastDividendValue: /\\"lastDividendValue\\":\{[^}]*\\"raw\\":(\d+\.?\d*)/,
      lastDividendDate: /\\"lastDividendDate\\":\{[^}]*\\"raw\\":(\d+)/
    };
    
    for (const [field, pattern] of Object.entries(fieldPatterns)) {
      const match = html.match(pattern);
      if (match) {
        if (field.includes('Date')) {
          // Convert Unix timestamp to date
          result[field] = new Date(parseInt(match[1]) * 1000).toISOString().split('T')[0];
        } else {
          result[field] = parseFloat(match[1]);
        }
      }
    }
    
    if (Object.keys(result).length > 0) {
      return result;
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Convert dividend data to standardized row
 * @param {string} symbol - Stock symbol
 * @param {Object} dividendData - Raw dividend data
 * @returns {Object} Standardized dividend row
 */
function toDividendRow(symbol, dividendData) {
  const currentDate = new Date().toISOString().split('T')[0];
  
  return {
    symbol: symbol.toUpperCase(),
    dividend_rate: dividendData.dividendRate || null,
    dividend_yield: dividendData.dividendYield || null,
    ex_dividend_date: dividendData.exDividendDate || null,
    payout_ratio: dividendData.payoutRatio || null,
    five_year_avg_yield: dividendData.fiveYearAvgDividendYield || null,
    last_dividend_value: dividendData.lastDividendValue || null,
    last_dividend_date: dividendData.lastDividendDate || null,
    report_date: currentDate
  };
}

/**
 * Convert dividend row to markdown format
 */
function dividendsAsMarkdown(row, symbol) {
  const parts = [
    `# ${symbol} Dividend Information`,
    ''
  ];

  if (!row.dividend_rate && !row.dividend_yield) {
    parts.push('**This stock does not pay dividends.**');
    return parts.join('\n');
  }

  parts.push('## Current Dividend Info');
  if (row.dividend_rate) parts.push(`**Annual Dividend Rate:** $${row.dividend_rate}`);
  if (row.dividend_yield) parts.push(`**Dividend Yield:** ${(row.dividend_yield * 100).toFixed(2)}%`);
  if (row.ex_dividend_date) parts.push(`**Ex-Dividend Date:** ${row.ex_dividend_date}`);
  if (row.payout_ratio) parts.push(`**Payout Ratio:** ${(row.payout_ratio * 100).toFixed(1)}%`);

  if (row.five_year_avg_yield) {
    parts.push('');
    parts.push('## Historical Average');
    parts.push(`**5-Year Average Yield:** ${(row.five_year_avg_yield * 100).toFixed(2)}%`);
  }

  if (row.last_dividend_value && row.last_dividend_date) {
    parts.push('');
    parts.push('## Last Payment');
    parts.push(`**Last Dividend:** $${row.last_dividend_value} (${row.last_dividend_date})`);
  }

  return parts.join('\n');
}

async function fetchStockDividends({ symbol }) {
  try {
    
    const dividendData = await extractDividendData(symbol);
    
    if (!dividendData) {
      // Create a row indicating no dividends
      const row = {
        symbol: symbol.toUpperCase(),
        dividend_rate: null,
        dividend_yield: null,
        ex_dividend_date: null,
        payout_ratio: null,
        five_year_avg_yield: null,
        last_dividend_value: null,
        last_dividend_date: null,
        report_date: new Date().toISOString().split('T')[0]
      };
      const markdown = dividendsAsMarkdown(row, symbol);
      return { row, markdown };
    }
    
    const row = toDividendRow(symbol, dividendData);
    const markdown = dividendsAsMarkdown(row, symbol);
    
    return { row, markdown };
    
  } catch (error) {
    throw error;
  }
}

/**
 * Extract technical indicators from Yahoo Finance
 * @param {string} symbol - Stock ticker symbol
 * @returns {Promise<Object|null>} Technical data
 */
async function extractTechnicalData(symbol) {
  try {
    
    const response = await axios.get(`https://finance.yahoo.com/quote/${symbol}?p=${symbol}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1'
      },
      timeout: 15000
    });
    
    const html = response.data;
    
    // Extract technical indicators
    const result = {};
    const fieldPatterns = {
      fiftyDayAverage: /\\"fiftyDayAverage\\":\{[^}]*\\"raw\\":(\d+\.?\d*)/,
      twoHundredDayAverage: /\\"twoHundredDayAverage\\":\{[^}]*\\"raw\\":(\d+\.?\d*)/,
      fiftyTwoWeekLow: /\\"fiftyTwoWeekLow\\":\{[^}]*\\"raw\\":(\d+\.?\d*)/,
      fiftyTwoWeekHigh: /\\"fiftyTwoWeekHigh\\":\{[^}]*\\"raw\\":(\d+\.?\d*)/,
      beta: /\\"beta\\":\{[^}]*\\"raw\\":(\d+\.?\d*)/,
      averageVolume: /\\"averageVolume\\":\{[^}]*\\"raw\\":(\d+)/,
      averageVolume10days: /\\"averageVolume10days\\":\{[^}]*\\"raw\\":(\d+)/,
      regularMarketVolume: /\\"regularMarketVolume\\":\{[^}]*\\"raw\\":(\d+)/
    };
    
    for (const [field, pattern] of Object.entries(fieldPatterns)) {
      const match = html.match(pattern);
      if (match) {
        result[field] = field.includes('Volume') ? parseInt(match[1]) : parseFloat(match[1]);
      }
    }
    
    if (Object.keys(result).length > 0) {
      return result;
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Convert technical data to standardized row
 */
function toTechnicalRow(symbol, technicalData) {
  const currentDate = new Date().toISOString().split('T')[0];
  
  return {
    symbol: symbol.toUpperCase(),
    fifty_day_ma: technicalData.fiftyDayAverage || null,
    two_hundred_day_ma: technicalData.twoHundredDayAverage || null,
    fifty_two_week_low: technicalData.fiftyTwoWeekLow || null,
    fifty_two_week_high: technicalData.fiftyTwoWeekHigh || null,
    beta: technicalData.beta || null,
    average_volume: technicalData.averageVolume || null,
    average_volume_10d: technicalData.averageVolume10days || null,
    current_volume: technicalData.regularMarketVolume || null,
    report_date: currentDate
  };
}

/**
 * Convert technical row to markdown format
 */
function technicalsAsMarkdown(row, symbol) {
  const parts = [
    `# ${symbol} Technical Indicators`,
    '',
    '## Moving Averages'
  ];

  if (row.fifty_day_ma) parts.push(`**50-Day MA:** $${row.fifty_day_ma.toFixed(2)}`);
  if (row.two_hundred_day_ma) parts.push(`**200-Day MA:** $${row.two_hundred_day_ma.toFixed(2)}`);

  parts.push('');
  parts.push('## Price Ranges');
  if (row.fifty_two_week_low) parts.push(`**52-Week Low:** $${row.fifty_two_week_low.toFixed(2)}`);
  if (row.fifty_two_week_high) parts.push(`**52-Week High:** $${row.fifty_two_week_high.toFixed(2)}`);

  if (row.beta) {
    parts.push('');
    parts.push('## Risk Metrics');
    parts.push(`**Beta:** ${row.beta.toFixed(2)} (vs S&P 500)`);
  }

  parts.push('');
  parts.push('## Volume Analysis');
  if (row.current_volume) parts.push(`**Current Volume:** ${row.current_volume.toLocaleString()}`);
  if (row.average_volume_10d) parts.push(`**10-Day Avg Volume:** ${row.average_volume_10d.toLocaleString()}`);
  if (row.average_volume) parts.push(`**Average Volume:** ${row.average_volume.toLocaleString()}`);

  return parts.join('\n');
}

async function fetchStockTechnicals({ symbol }) {
  try {
    
    const technicalData = await extractTechnicalData(symbol);
    
    if (!technicalData) {
      throw new Error('Could not extract technical data from Yahoo Finance page');
    }
    
    const row = toTechnicalRow(symbol, technicalData);
    const markdown = technicalsAsMarkdown(row, symbol);
    
    return { row, markdown };
    
  } catch (error) {
    throw error;
  }
}

/**
 * Extract economic indicators from FRED API (Federal Reserve Economic Data)
 * @param {Object} options - Options for economic data
 * @returns {Promise<Object|null>} Economic indicators data
 */
async function extractEconomicData(options = {}) {
  try {
    
    // Get API key from environment variable
    const apiKey = process.env.FRED_API_KEY || 'demo';
    const baseUrl = 'https://api.stlouisfed.org/fred/series/observations';
    
    
    // Comprehensive economic indicators (FRED series IDs)
    const indicators = {
      // GDP & Growth
      gdp: 'GDP',                           // Gross Domestic Product
      realGdp: 'GDPC1',                    // Real Gross Domestic Product
      gdpGrowth: 'A191RL1Q225SBEA',        // Real GDP Growth Rate
      
      // Labor Market
      unemployment: 'UNRATE',               // Unemployment Rate
      employment: 'PAYEMS',                 // Nonfarm Payrolls
      laborForce: 'CIVPART',              // Labor Force Participation Rate
      jobsOpenings: 'JTSJOL',              // Job Openings
      
      // Inflation & Prices
      inflation: 'CPIAUCSL',               // Consumer Price Index
      coreCpi: 'CPILFESL',                // Core CPI (ex food & energy)
      pce: 'PCEPI',                       // PCE Price Index
      corePce: 'PCEPILFE',                // Core PCE Price Index
      producerPrices: 'PPIACO',           // Producer Price Index
      
      // Monetary Policy & Rates
      federalFunds: 'FEDFUNDS',           // Federal Funds Rate
      treasury1m: 'DGS1MO',              // 1-Month Treasury Rate
      treasury3m: 'DGS3MO',              // 3-Month Treasury Rate
      treasury6m: 'DGS6MO',              // 6-Month Treasury Rate
      treasury1y: 'DGS1',                // 1-Year Treasury Rate
      treasury2y: 'DGS2',                // 2-Year Treasury Rate
      treasury5y: 'DGS5',                // 5-Year Treasury Rate
      treasury10y: 'DGS10',              // 10-Year Treasury Rate
      treasury30y: 'DGS30',              // 30-Year Treasury Rate
      
      // Money Supply
      m1Money: 'M1SL',                   // M1 Money Supply
      m2Money: 'M2SL',                   // M2 Money Supply
      
      // Consumer & Business
      retailSales: 'RSAFS',              // Retail Sales
      consumerSentiment: 'UMCSENT',      // University of Michigan Consumer Sentiment
      industrialProduction: 'INDPRO',    // Industrial Production Index
      
      // Housing
      housingStarts: 'HOUST',            // Housing Starts
      newHomeSales: 'HSN1F',             // New Home Sales
      existingHomeSales: 'EXHOSLUSM495S', // Existing Home Sales
      
      // Financial Markets
      vix: 'VIXCLS',                     // VIX Volatility Index
      sp500: 'SP500',                    // S&P 500 Index
      
      // International Trade
      tradeBalance: 'BOPGSTB',           // Trade Balance
      
      // Government Debt
      federalDebt: 'GFDEBTN',            // Federal Debt Total
      debtToGdp: 'GFDEGDQ188S'           // Federal Debt to GDP Ratio
    };
    
    const results = {};
    const maxConcurrent = 5; // Respect rate limits
    const delay = 500; // 500ms between requests
    
    // Process indicators in batches to respect rate limits
    const indicatorEntries = Object.entries(indicators);
    
    for (let i = 0; i < indicatorEntries.length; i += maxConcurrent) {
      const batch = indicatorEntries.slice(i, i + maxConcurrent);
      
      const batchPromises = batch.map(async ([key, seriesId]) => {
        try {
          
          const url = `${baseUrl}?series_id=${seriesId}&api_key=${apiKey}&file_type=json&limit=5&sort_order=desc`;
          
          const response = await axios.get(url, {
            timeout: 15000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; Yahoo-Finance-MCP/1.0)'
            }
          });
          
          if (response.data && response.data.observations && response.data.observations.length > 0) {
            // Get the most recent valid observation
            const latestObs = response.data.observations.find(obs => obs.value !== '.' && obs.value !== null);
            
            if (latestObs) {
              results[key] = {
                value: parseFloat(latestObs.value),
                date: latestObs.date,
                seriesId: seriesId,
                realtime_start: response.data.realtime_start,
                realtime_end: response.data.realtime_end,
                units: response.data.units || 'Unknown'
              };
            }
          }
          
        } catch (error) {
          
          // Enhanced fallback for treasury rates via Yahoo Finance
          if (key.includes('treasury')) {
            try {
              const symbolMap = {
                'treasury1m': '^IRX',    // 13-week treasury bill
                'treasury3m': '^IRX',    // 13-week treasury bill  
                'treasury6m': '^IRX',    // 13-week treasury bill
                'treasury1y': '^TNX',    // 10-year (closest available)
                'treasury2y': '^TNX',    // 10-year (closest available)
                'treasury5y': '^TNX',    // 10-year treasury note
                'treasury10y': '^TNX',   // 10-year treasury note
                'treasury30y': '^TYX'    // 30-year treasury bond
              };
              
              const symbol = symbolMap[key] || '^TNX';
              const yahooResponse = await axios.get(`https://finance.yahoo.com/quote/${symbol}?p=${symbol}`, {
                headers: {
                  'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1'
                },
                timeout: 8000
              });
              
              const priceMatch = yahooResponse.data.match(/\\"regularMarketPrice\\":\{[^}]*\\"raw\\":(\d+\.?\d*)/);
              if (priceMatch) {
                results[key] = {
                  value: parseFloat(priceMatch[1]),
                  date: new Date().toISOString().split('T')[0],
                  seriesId: symbol,
                  source: 'yahoo_finance',
                  units: 'Percent'
                };
              }
            } catch (fallbackError) {
            }
          }
        }
      });
      
      await Promise.all(batchPromises);
      
      // Rate limiting delay between batches
      if (i + maxConcurrent < indicatorEntries.length) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    if (Object.keys(results).length > 0) {
      return results;
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Convert economic data to standardized rows
 */
function toEconomicRows(economicData) {
  if (!economicData) {
    return [];
  }

  const currentDate = new Date().toISOString().split('T')[0];
  const rows = [];

  Object.entries(economicData).forEach(([indicator, data]) => {
    rows.push({
      indicator: indicator,
      indicator_name: getIndicatorName(indicator),
      value: data.value,
      unit: getIndicatorUnit(indicator),
      date: data.date,
      series_id: data.seriesId,
      source: data.source || 'FRED',
      report_date: currentDate
    });
  });

  return rows;
}

/**
 * Get human-readable indicator names
 */
function getIndicatorName(indicator) {
  const names = {
    // GDP & Growth
    gdp: 'Gross Domestic Product',
    realGdp: 'Real GDP',
    gdpGrowth: 'Real GDP Growth Rate',
    
    // Labor Market
    unemployment: 'Unemployment Rate',
    employment: 'Nonfarm Payrolls',
    laborForce: 'Labor Force Participation Rate',
    jobsOpenings: 'Job Openings',
    
    // Inflation & Prices
    inflation: 'Consumer Price Index',
    coreCpi: 'Core CPI (ex food & energy)',
    pce: 'PCE Price Index',
    corePce: 'Core PCE Price Index',
    producerPrices: 'Producer Price Index',
    
    // Monetary Policy & Rates
    federalFunds: 'Federal Funds Rate',
    treasury1m: '1-Month Treasury Rate',
    treasury3m: '3-Month Treasury Rate',
    treasury6m: '6-Month Treasury Rate',
    treasury1y: '1-Year Treasury Rate',
    treasury2y: '2-Year Treasury Rate',
    treasury5y: '5-Year Treasury Rate',
    treasury10y: '10-Year Treasury Rate',
    treasury30y: '30-Year Treasury Rate',
    
    // Money Supply
    m1Money: 'M1 Money Supply',
    m2Money: 'M2 Money Supply',
    
    // Consumer & Business
    retailSales: 'Retail Sales',
    consumerSentiment: 'Consumer Sentiment',
    industrialProduction: 'Industrial Production Index',
    
    // Housing
    housingStarts: 'Housing Starts',
    newHomeSales: 'New Home Sales',
    existingHomeSales: 'Existing Home Sales',
    
    // Financial Markets
    vix: 'VIX Volatility Index',
    sp500: 'S&P 500 Index',
    
    // International Trade
    tradeBalance: 'Trade Balance',
    
    // Government Debt
    federalDebt: 'Federal Debt Total',
    debtToGdp: 'Federal Debt to GDP Ratio'
  };
  return names[indicator] || indicator;
}

/**
 * Get units for indicators
 */
function getIndicatorUnit(indicator) {
  const units = {
    // GDP & Growth
    gdp: 'Billions of Dollars',
    realGdp: 'Billions of Chained 2017 Dollars',
    gdpGrowth: 'Percent',
    
    // Labor Market
    unemployment: 'Percent',
    employment: 'Thousands of Persons',
    laborForce: 'Percent',
    jobsOpenings: 'Thousands',
    
    // Inflation & Prices
    inflation: 'Index 1982-1984=100',
    coreCpi: 'Index 1982-1984=100',
    pce: 'Index 2012=100',
    corePce: 'Index 2012=100',
    producerPrices: 'Index 1982=100',
    
    // Monetary Policy & Rates
    federalFunds: 'Percent',
    treasury1m: 'Percent',
    treasury3m: 'Percent',
    treasury6m: 'Percent',
    treasury1y: 'Percent',
    treasury2y: 'Percent',
    treasury5y: 'Percent',
    treasury10y: 'Percent',
    treasury30y: 'Percent',
    
    // Money Supply
    m1Money: 'Billions of Dollars',
    m2Money: 'Billions of Dollars',
    
    // Consumer & Business
    retailSales: 'Millions of Dollars',
    consumerSentiment: 'Index 1966:Q1=100',
    industrialProduction: 'Index 2017=100',
    
    // Housing
    housingStarts: 'Thousands of Units',
    newHomeSales: 'Thousands of Units',
    existingHomeSales: 'Millions',
    
    // Financial Markets
    vix: 'Index',
    sp500: 'Index',
    
    // International Trade
    tradeBalance: 'Millions of Dollars',
    
    // Government Debt
    federalDebt: 'Millions of Dollars',
    debtToGdp: 'Percent'
  };
  return units[indicator] || 'Value';
}

/**
 * Convert economic indicators to markdown
 */
function economicAsMarkdown(rows) {
  if (!rows || rows.length === 0) {
    return '# Economic Indicators Dashboard\n\nNo economic data available.';
  }

  const parts = [
    '# 📊 Economic Indicators Dashboard',
    '',
    `**Last Updated:** ${new Date().toLocaleDateString()}`,
    `**Data Sources:** FRED API${rows.some(r => r.source === 'yahoo_finance') ? ' + Yahoo Finance' : ''}`,
    `**Total Indicators:** ${rows.length}`,
    ''
  ];

  // Group indicators by category
  const categories = {
    'GDP & Growth': ['gdp', 'realGdp', 'gdpGrowth'],
    'Labor Market': ['unemployment', 'employment', 'laborForce', 'jobsOpenings'],
    'Inflation & Prices': ['inflation', 'coreCpi', 'pce', 'corePce', 'producerPrices'],
    'Interest Rates': ['federalFunds', 'treasury1m', 'treasury3m', 'treasury6m', 'treasury1y', 'treasury2y', 'treasury5y', 'treasury10y', 'treasury30y'],
    'Money Supply': ['m1Money', 'm2Money'],
    'Consumer & Business': ['retailSales', 'consumerSentiment', 'industrialProduction'],
    'Housing Market': ['housingStarts', 'newHomeSales', 'existingHomeSales'],
    'Financial Markets': ['vix', 'sp500'],
    'Trade & Debt': ['tradeBalance', 'federalDebt', 'debtToGdp']
  };

  Object.entries(categories).forEach(([category, indicators]) => {
    const categoryRows = rows.filter(row => indicators.includes(row.indicator));
    
    if (categoryRows.length > 0) {
      parts.push(`## ${category}`);
      parts.push('');
      parts.push('| Indicator | Value | Unit | Date |');
      parts.push('|-----------|-------|------|------|');
      
      categoryRows.forEach(row => {
        const formattedValue = typeof row.value === 'number' ? 
          (row.value > 1000 ? row.value.toLocaleString() : row.value.toFixed(2)) : 
          row.value;
        parts.push(`| ${row.indicator_name} | **${formattedValue}** | ${row.unit} | ${row.date} |`);
      });
      
      parts.push('');
    }
  });

  // Add comprehensive economic analysis
  parts.push('## 📈 Economic Analysis');
  parts.push('');

  // Labor Market Analysis
  const unemployment = rows.find(r => r.indicator === 'unemployment');
  const employment = rows.find(r => r.indicator === 'employment');
  const laborForce = rows.find(r => r.indicator === 'laborForce');
  
  if (unemployment || employment) {
    parts.push('### 👥 Labor Market');
    
    if (unemployment) {
      let unemploymentAssessment = '';
      if (unemployment.value < 3.5) unemploymentAssessment = '🟢 Very Low (Extremely Strong)';
      else if (unemployment.value < 5) unemploymentAssessment = '🟢 Low (Strong)';
      else if (unemployment.value < 7) unemploymentAssessment = '🟡 Moderate';
      else if (unemployment.value < 9) unemploymentAssessment = '🔴 Elevated (Weak)';
      else unemploymentAssessment = '🔴 High (Very Weak)';
      
      parts.push(`- **Unemployment:** ${unemploymentAssessment} at ${unemployment.value}%`);
    }
    
    if (laborForce) {
      const lfprAssessment = laborForce.value > 63 ? 'High' : laborForce.value > 62 ? 'Moderate' : 'Low';
      parts.push(`- **Labor Force Participation:** ${lfprAssessment} at ${laborForce.value}%`);
    }
    parts.push('');
  }

  // Monetary Policy Analysis
  const federalFunds = rows.find(r => r.indicator === 'federalFunds');
  const treasury2y = rows.find(r => r.indicator === 'treasury2y');
  const treasury10y = rows.find(r => r.indicator === 'treasury10y');
  const treasury30y = rows.find(r => r.indicator === 'treasury30y');

  if (federalFunds || treasury10y) {
    parts.push('### 💰 Monetary Policy & Yield Curve');
    
    if (federalFunds) {
      const fedAssessment = federalFunds.value > 4 ? 'Restrictive' : federalFunds.value > 2 ? 'Neutral' : 'Accommodative';
      parts.push(`- **Fed Funds Rate:** ${fedAssessment} policy at ${federalFunds.value}%`);
    }
    
    if (treasury2y && treasury10y) {
      const yieldCurve = treasury10y.value - treasury2y.value;
      const curveStatus = yieldCurve > 1 ? '🟢 Normal (steep)' : 
                         yieldCurve > 0 ? '🟡 Normal (flat)' : 
                         '🔴 Inverted (recession signal)';
      parts.push(`- **2Y-10Y Yield Curve:** ${curveStatus} (${yieldCurve > 0 ? '+' : ''}${yieldCurve.toFixed(2)}% spread)`);
    }
    
    if (treasury10y && treasury30y) {
      const longSpread = treasury30y.value - treasury10y.value;
      parts.push(`- **10Y-30Y Spread:** ${longSpread > 0 ? '+' : ''}${longSpread.toFixed(2)}% (long-end slope)`);
    }
    parts.push('');
  }

  // Inflation Analysis
  const inflation = rows.find(r => r.indicator === 'inflation');
  const coreCpi = rows.find(r => r.indicator === 'coreCpi');
  const pce = rows.find(r => r.indicator === 'pce');

  if (inflation || pce) {
    parts.push('### 📊 Inflation Environment');
    
    if (inflation) {
      // Note: For actual inflation rate, would need YoY calculation
      parts.push(`- **CPI Level:** ${inflation.value.toFixed(1)} (index, latest reading)`);
    }
    
    if (coreCpi) {
      parts.push(`- **Core CPI:** ${coreCpi.value.toFixed(1)} (ex food & energy)`);
    }
    
    if (pce) {
      parts.push(`- **PCE Index:** ${pce.value.toFixed(1)} (Fed's preferred measure)`);
    }
    parts.push('');
  }

  // Market Stress Indicators
  const vix = rows.find(r => r.indicator === 'vix');
  const sp500 = rows.find(r => r.indicator === 'sp500');

  if (vix || sp500) {
    parts.push('### 📈 Market Conditions');
    
    if (vix) {
      const vixAssessment = vix.value < 15 ? '🟢 Low Fear (Complacent)' : 
                           vix.value < 25 ? '🟡 Moderate Fear' : 
                           vix.value < 35 ? '🔴 High Fear' : 
                           '🔴 Extreme Fear (Panic)';
      parts.push(`- **VIX Volatility:** ${vixAssessment} at ${vix.value.toFixed(1)}`);
    }
    
    if (sp500) {
      parts.push(`- **S&P 500 Level:** ${sp500.value.toLocaleString()}`);
    }
    parts.push('');
  }

  // Economic Health Summary
  parts.push('### 🎯 Economic Health Summary');
  
  let healthScore = 0;
  let totalMetrics = 0;
  
  if (unemployment) {
    totalMetrics++;
    if (unemployment.value < 5) healthScore++;
  }
  
  if (treasury2y && treasury10y) {
    totalMetrics++;
    if (treasury10y.value > treasury2y.value) healthScore++;
  }
  
  if (vix) {
    totalMetrics++;
    if (vix.value < 25) healthScore++;
  }
  
  if (totalMetrics > 0) {
    const healthPercentage = (healthScore / totalMetrics) * 100;
    const overallHealth = healthPercentage > 75 ? '🟢 Strong' : 
                         healthPercentage > 50 ? '🟡 Moderate' : 
                         '🔴 Weak';
    parts.push(`**Overall Economic Health:** ${overallHealth} (${healthScore}/${totalMetrics} positive indicators)`);
  }

  parts.push('');
  parts.push('---');
  parts.push('*Data from Federal Reserve Economic Data (FRED) API*');

  return parts.join('\n');
}

async function fetchEconomicIndicators() {
  try {
    
    const economicData = await extractEconomicData();
    
    if (!economicData) {
      // Return some basic fallback data
      const fallbackData = {
        treasury10y: { value: 'N/A', date: new Date().toISOString().split('T')[0], seriesId: 'N/A' }
      };
      const rows = toEconomicRows(fallbackData);
      const markdown = economicAsMarkdown(rows);
      return { rows, markdown };
    }
    
    const rows = toEconomicRows(economicData);
    const markdown = economicAsMarkdown(rows);
    
    return { rows, markdown };
    
  } catch (error) {
    throw error;
  }
}

/**
 * Search FRED economic data series by keywords using enhanced sitesearch API
 * @param {Object} params - Search parameters
 * @returns {Promise<Object>} Search results
 */
async function extractFredSeriesSearch({ searchTerms = '', limit = 10 }) {
  try {
    
    // Use the superior FRED sitesearch API endpoint (no API key required)
    const baseUrl = 'https://fred.stlouisfed.org/graph/api/series/sitesearch';
    const encodedTerms = encodeURIComponent(searchTerms.toLowerCase().replace(/\s+/g, ''));
    const url = `${baseUrl}/${encodedTerms}`;
    
    
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Yahoo-Finance-MCP/1.0)',
        'Accept': 'application/json'
      }
    });
    
    if (response.data && response.data.status === 'true' && response.data.items && response.data.items.length > 0) {
      
      // Take only the requested limit
      const limitedResults = response.data.items.slice(0, limit);
      
      const results = limitedResults.map(series => ({
        id: series.series_id,
        title: series.title || series.label,
        units: series.units || 'Unknown',
        frequency: series.frequency || 'Unknown',
        seasonal_adjustment: series.season || 'Unknown',
        start_date: series.start,
        end_date: series.end,
        popularity: series.popularity || 'N/A',
        description: series.value || series.label || 'No description available'
      }));
      
      return {
        searchTerms,
        totalResults: parseInt(response.data.total_count) || results.length,
        series: results,
        apiEndpoint: 'sitesearch'
      };
    }
    
    
    // Fallback to standard FRED API if sitesearch fails
    const apiKey = process.env.FRED_API_KEY || 'demo';
    const fallbackUrl = `https://api.stlouisfed.org/fred/series/search?search_text=${encodeURIComponent(searchTerms)}&api_key=${apiKey}&file_type=json&limit=${limit}&sort_order=popularity&order_by=popularity`;
    
    const fallbackResponse = await axios.get(fallbackUrl, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Yahoo-Finance-MCP/1.0)'
      }
    });
    
    if (fallbackResponse.data && fallbackResponse.data.seriess && fallbackResponse.data.seriess.length > 0) {
      
      const results = fallbackResponse.data.seriess.map(series => ({
        id: series.id,
        title: series.title,
        units: series.units || 'Unknown',
        frequency: series.frequency || 'Unknown',
        seasonal_adjustment: series.seasonal_adjustment || 'Unknown',
        start_date: 'Unknown',
        end_date: 'Unknown',
        popularity: series.popularity || 0,
        description: series.notes ? series.notes.substring(0, 200) + '...' : 'No description available'
      }));
      
      return {
        searchTerms,
        totalResults: fallbackResponse.data.count || results.length,
        series: results,
        apiEndpoint: 'standard'
      };
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Convert FRED search results to standardized rows
 */
function toFredSearchRows(searchData) {
  if (!searchData || !searchData.series) {
    return [];
  }

  return searchData.series.map(series => ({
    series_id: series.id,
    title: series.title,
    units: series.units,
    frequency: series.frequency,
    seasonal_adjustment: series.seasonal_adjustment,
    start_date: series.start_date,
    end_date: series.end_date,
    popularity: series.popularity,
    description: series.description,
    search_terms: searchData.searchTerms,
    search_date: new Date().toISOString().split('T')[0],
    api_endpoint: searchData.apiEndpoint
  }));
}

/**
 * Convert FRED search results to markdown
 */
function fredSearchAsMarkdown(rows, searchData) {
  if (!rows || rows.length === 0) {
    return `# FRED Series Search\n\nNo economic data series found for "${searchData?.searchTerms || 'search'}".`;
  }

  const parts = [
    '# 🔍 FRED Economic Data Series Search',
    '',
    `**Search Terms:** "${searchData.searchTerms}"`,
    `**Results Found:** ${searchData.totalResults}`,
    `**Showing:** Top ${rows.length} series`,
    `**Search Method:** ${searchData.apiEndpoint === 'sitesearch' ? '⚡ Enhanced Sitesearch' : '📊 Standard API'}`,
    `**Search Date:** ${new Date().toLocaleDateString()}`,
    '',
    '## Search Results',
    ''
  ];

  rows.forEach((series, index) => {
    parts.push(`### ${index + 1}. ${series.title}`);
    parts.push(`**Series ID:** \`${series.series_id}\``);
    parts.push(`**Units:** ${series.units}`);
    parts.push(`**Frequency:** ${series.frequency}`);
    parts.push(`**Seasonal Adjustment:** ${series.seasonal_adjustment}`);
    
    // Enhanced data from sitesearch API
    if (series.start_date && series.start_date !== 'Unknown') {
      parts.push(`**Data Range:** ${series.start_date} to ${series.end_date}`);
    }
    
    if (series.popularity && series.popularity !== 'N/A') {
      parts.push(`**Popularity Rank:** ${series.popularity}`);
    }
    
    if (series.description && series.description !== 'No description available') {
      parts.push(`**Description:** ${series.description}`);
    }
    
    parts.push('');
  });

  parts.push('## 💡 Enhanced Features');
  parts.push('');
  
  if (searchData.apiEndpoint === 'sitesearch') {
    parts.push('✅ **Using Enhanced Sitesearch API:**');
    parts.push('- No API key required for **search/discovery**');
    parts.push('- Rich metadata including data ranges');
    parts.push('- More targeted search results');
    parts.push('- Faster response times');
    parts.push('');
    parts.push('🔑 **Note:** API key required for actual data retrieval');
    parts.push('');
  }
  
  parts.push('## 🚀 Usage Tips');
  parts.push('');
  parts.push('- **Copy Series ID** to use with FRED data tools');
  parts.push('- **Data Range** shows historical availability');
  parts.push('- **Frequency** indicates release schedule (Daily, Monthly, Quarterly, Annual)');
  parts.push('- **Seasonal Adjustment** shows if data accounts for seasonal patterns');
  parts.push('- Try different keywords like: "unemployment", "inflation", "housing", "gdp"');
  parts.push('');
  parts.push('---');
  parts.push(`*Powered by Federal Reserve Economic Data (FRED) ${searchData.apiEndpoint === 'sitesearch' ? 'Sitesearch' : 'Standard'} API*`);

  return parts.join('\n');
}

async function fetchFredSeriesSearch({ searchTerms = '', limit = 10 }) {
  try {
    
    if (!searchTerms.trim()) {
      throw new Error('Search terms are required for FRED series search');
    }
    
    const searchData = await extractFredSeriesSearch({ searchTerms, limit });
    
    if (!searchData) {
      // Return empty results
      const rows = [];
      const markdown = fredSearchAsMarkdown(rows, { searchTerms });
      return { rows, markdown };
    }
    
    const rows = toFredSearchRows(searchData);
    const markdown = fredSearchAsMarkdown(rows, searchData);
    
    return { rows, markdown };
    
  } catch (error) {
    throw error;
  }
}

/**
 * Fetch specific FRED series data by series ID (requires API key)
 * @param {Object} params - Parameters with series ID
 * @returns {Promise<Object>} Series data
 */
async function extractFredSeriesData({ seriesId = '', limit = 10 }) {
  try {
    
    const apiKey = process.env.FRED_API_KEY;
    if (!apiKey || apiKey === 'demo') {
      throw new Error('Valid FRED API key required for series data retrieval. Please set FRED_API_KEY environment variable.');
    }
    
    const baseUrl = 'https://api.stlouisfed.org/fred/series/observations';
    const url = `${baseUrl}?series_id=${seriesId}&api_key=${apiKey}&file_type=json&limit=${limit}&sort_order=desc`;
    
    
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Yahoo-Finance-MCP/1.0)'
      }
    });
    
    if (response.data && response.data.observations && response.data.observations.length > 0) {
      
      // Get series info as well
      const seriesInfoUrl = `https://api.stlouisfed.org/fred/series?series_id=${seriesId}&api_key=${apiKey}&file_type=json`;
      let seriesInfo = null;
      
      try {
        const infoResponse = await axios.get(seriesInfoUrl, {
          timeout: 10000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; Yahoo-Finance-MCP/1.0)'
          }
        });
        
        if (infoResponse.data && infoResponse.data.seriess && infoResponse.data.seriess.length > 0) {
          seriesInfo = infoResponse.data.seriess[0];
        }
      } catch (infoError) {
      }
      
      const validObservations = response.data.observations
        .filter(obs => obs.value !== '.' && obs.value !== null)
        .slice(0, limit);
      
      return {
        seriesId,
        seriesInfo,
        observations: validObservations,
        totalObservations: response.data.count || validObservations.length,
        realtime_start: response.data.realtime_start,
        realtime_end: response.data.realtime_end
      };
    }
    
    return null;
  } catch (error) {
    throw error;
  }
}

/**
 * Convert FRED series data to standardized rows
 */
function toFredSeriesRows(seriesData) {
  if (!seriesData || !seriesData.observations) {
    return [];
  }

  return seriesData.observations.map(obs => ({
    series_id: seriesData.seriesId,
    date: obs.date,
    value: parseFloat(obs.value),
    realtime_start: obs.realtime_start,
    realtime_end: obs.realtime_end,
    series_title: seriesData.seriesInfo?.title || seriesData.seriesId,
    units: seriesData.seriesInfo?.units || 'Unknown',
    frequency: seriesData.seriesInfo?.frequency || 'Unknown',
    seasonal_adjustment: seriesData.seriesInfo?.seasonal_adjustment || 'Unknown',
    last_updated: seriesData.seriesInfo?.last_updated,
    fetch_date: new Date().toISOString().split('T')[0]
  }));
}

/**
 * Convert FRED series data to markdown
 */
function fredSeriesAsMarkdown(rows, seriesData) {
  if (!rows || rows.length === 0) {
    return `# FRED Series Data\n\nNo data available for series "${seriesData?.seriesId || 'unknown'}".`;
  }

  const seriesInfo = seriesData.seriesInfo;
  const latest = rows[0]; // Most recent observation (sorted desc)
  
  const parts = [
    '# 📊 FRED Economic Data Series',
    '',
    `**Series ID:** \`${seriesData.seriesId}\``,
    `**Title:** ${seriesInfo?.title || seriesData.seriesId}`,
    `**Units:** ${seriesInfo?.units || 'Unknown'}`,
    `**Frequency:** ${seriesInfo?.frequency || 'Unknown'}`,
    `**Seasonal Adjustment:** ${seriesInfo?.seasonal_adjustment || 'Unknown'}`,
    `**Last Updated:** ${seriesInfo?.last_updated || 'Unknown'}`,
    '',
    `**Latest Value:** **${latest.value.toLocaleString()}** (${latest.date})`,
    `**Observations Shown:** ${rows.length} most recent`,
    `**Total Available:** ${seriesData.totalObservations || 'Unknown'}`,
    '',
    '## Recent Data',
    '',
    '| Date | Value | Real-time Period |',
    '|------|-------|------------------|'
  ];

  rows.forEach(obs => {
    const formattedValue = obs.value > 1000 ? obs.value.toLocaleString() : obs.value.toFixed(2);
    parts.push(`| ${obs.date} | **${formattedValue}** | ${obs.realtime_start} to ${obs.realtime_end} |`);
  });

  parts.push('');
  parts.push('## 📈 Data Analysis');
  
  if (rows.length >= 2) {
    const current = rows[0];
    const previous = rows[1];
    const change = current.value - previous.value;
    const changePercent = (change / previous.value) * 100;
    
    const trend = change > 0 ? '📈 Increasing' : change < 0 ? '📉 Decreasing' : '➡️ Unchanged';
    const changeIcon = change > 0 ? '🟢' : change < 0 ? '🔴' : '🟡';
    
    parts.push(`**Latest Trend:** ${trend}`);
    parts.push(`**Change from Previous:** ${changeIcon} ${change > 0 ? '+' : ''}${change.toFixed(2)} (${changePercent > 0 ? '+' : ''}${changePercent.toFixed(2)}%)`);
    parts.push(`**Period:** ${previous.date} → ${current.date}`);
  }

  if (rows.length >= 5) {
    const values = rows.slice(0, 5).map(r => r.value);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);
    
    parts.push('');
    parts.push('**5-Period Statistics:**');
    parts.push(`- Average: ${avg.toFixed(2)}`);
    parts.push(`- Range: ${min.toFixed(2)} - ${max.toFixed(2)}`);
  }

  parts.push('');
  parts.push('## 🔍 Series Information');
  if (seriesInfo?.notes) {
    parts.push(`**Description:** ${seriesInfo.notes.substring(0, 300)}${seriesInfo.notes.length > 300 ? '...' : ''}`);
  }
  
  parts.push('');
  parts.push('---');
  parts.push('*Data from Federal Reserve Economic Data (FRED) API*');
  parts.push(`*Real-time data as of: ${seriesData.realtime_start} to ${seriesData.realtime_end}*`);

  return parts.join('\n');
}

async function fetchFredSeriesData({ seriesId = '', limit = 10 }) {
  try {
    
    if (!seriesId.trim()) {
      throw new Error('Series ID is required for FRED data retrieval');
    }
    
    const seriesData = await extractFredSeriesData({ seriesId, limit });
    
    if (!seriesData) {
      throw new Error(`No data found for FRED series: ${seriesId}`);
    }
    
    const rows = toFredSeriesRows(seriesData);
    const markdown = fredSeriesAsMarkdown(rows, seriesData);
    
    return { rows, markdown };
    
  } catch (error) {
    throw error;
  }
}

/**
 * Extract FRED categories for economic data organization
 * @param {Object} params - Parameters
 * @returns {Promise<Object>} Categories data
 */
async function extractFredCategories({ categoryId = null, limit = 20 }) {
  try {
    
    const apiKey = process.env.FRED_API_KEY;
    if (!apiKey || apiKey === 'demo') {
      throw new Error('Valid FRED API key required for categories data. Please set FRED_API_KEY environment variable.');
    }
    
    // Get categories endpoint - if categoryId provided, get children, otherwise get root categories
    const baseUrl = categoryId ? 
      'https://api.stlouisfed.org/fred/category/children' :
      'https://api.stlouisfed.org/fred/categories';
    
    const params = new URLSearchParams({
      api_key: apiKey,
      file_type: 'json'
    });
    
    if (categoryId) {
      params.append('category_id', categoryId);
    }
    
    const url = `${baseUrl}?${params.toString()}`;
    
    
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Yahoo-Finance-MCP/1.0)'
      }
    });
    
    if (response.data && response.data.categories && response.data.categories.length > 0) {
      
      const categories = response.data.categories.slice(0, limit).map(cat => ({
        id: cat.id,
        name: cat.name,
        parent_id: cat.parent_id,
        notes: cat.notes || 'No description available'
      }));
      
      // For each category, try to get some popular series
      const categoriesWithSeries = await Promise.all(
        categories.map(async (category) => {
          try {
            const seriesUrl = `https://api.stlouisfed.org/fred/category/series?category_id=${category.id}&api_key=${apiKey}&file_type=json&limit=5&sort_order=popularity&order_by=popularity`;
            
            const seriesResponse = await axios.get(seriesUrl, {
              timeout: 10000,
              headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; Yahoo-Finance-MCP/1.0)'
              }
            });
            
            if (seriesResponse.data && seriesResponse.data.seriess) {
              category.sample_series = seriesResponse.data.seriess.slice(0, 3).map(s => ({
                id: s.id,
                title: s.title,
                units: s.units
              }));
            }
            
            await new Promise(resolve => setTimeout(resolve, 200)); // Rate limiting
            
          } catch (seriesError) {
            category.sample_series = [];
          }
          
          return category;
        })
      );
      
      return {
        categoryId,
        categories: categoriesWithSeries,
        totalCategories: response.data.categories.length
      };
    }
    
    return null;
  } catch (error) {
    throw error;
  }
}

/**
 * Extract FRED releases for economic calendar
 * @param {Object} params - Parameters
 * @returns {Promise<Object>} Releases data
 */
async function extractFredReleases({ limit = 20, includeReleases = true }) {
  try {
    
    const apiKey = process.env.FRED_API_KEY;
    if (!apiKey || apiKey === 'demo') {
      throw new Error('Valid FRED API key required for releases data. Please set FRED_API_KEY environment variable.');
    }
    
    const baseUrl = 'https://api.stlouisfed.org/fred/releases';
    const url = `${baseUrl}?api_key=${apiKey}&file_type=json&limit=${limit}&sort_order=desc&order_by=last_updated`;
    
    
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Yahoo-Finance-MCP/1.0)'
      }
    });
    
    if (response.data && response.data.releases && response.data.releases.length > 0) {
      
      const releases = response.data.releases.map(release => ({
        id: release.id,
        name: release.name,
        press_release: release.press_release === 'true',
        link: release.link,
        notes: release.notes || 'No description available',
        realtime_start: release.realtime_start,
        realtime_end: release.realtime_end
      }));
      
      // Get release dates for the most important releases
      const releasesWithDates = await Promise.all(
        releases.slice(0, 10).map(async (release) => {
          try {
            const datesUrl = `https://api.stlouisfed.org/fred/release/dates?release_id=${release.id}&api_key=${apiKey}&file_type=json&limit=5&sort_order=desc`;
            
            const datesResponse = await axios.get(datesUrl, {
              timeout: 8000,
              headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; Yahoo-Finance-MCP/1.0)'
              }
            });
            
            if (datesResponse.data && datesResponse.data.release_dates) {
              release.recent_dates = datesResponse.data.release_dates.slice(0, 3).map(d => d.date);
            }
            
            await new Promise(resolve => setTimeout(resolve, 200)); // Rate limiting
            
          } catch (datesError) {
            release.recent_dates = [];
          }
          
          return release;
        })
      );
      
      return {
        releases: includeReleases ? releasesWithDates : releases,
        totalReleases: response.data.releases.length
      };
    }
    
    return null;
  } catch (error) {
    throw error;
  }
}

/**
 * Convert FRED categories to standardized rows
 */
function toFredCategoriesRows(categoriesData) {
  if (!categoriesData || !categoriesData.categories) {
    return [];
  }

  return categoriesData.categories.map(category => ({
    category_id: category.id,
    category_name: category.name,
    parent_id: category.parent_id,
    description: category.notes,
    sample_series_count: category.sample_series ? category.sample_series.length : 0,
    sample_series: category.sample_series ? category.sample_series.map(s => s.id).join(', ') : '',
    fetch_date: new Date().toISOString().split('T')[0]
  }));
}

/**
 * Convert FRED categories to markdown
 */
function fredCategoriesAsMarkdown(rows, categoriesData) {
  if (!rows || rows.length === 0) {
    return '# FRED Categories\n\nNo economic data categories available.';
  }

  const parts = [
    '# 📂 FRED Economic Data Categories',
    '',
    `**Category Level:** ${categoriesData.categoryId ? `Children of Category ${categoriesData.categoryId}` : 'Root Categories'}`,
    `**Categories Found:** ${categoriesData.totalCategories}`,
    `**Showing:** ${rows.length} categories`,
    `**Fetch Date:** ${new Date().toLocaleDateString()}`,
    '',
    '## Categories Overview',
    ''
  ];

  rows.forEach((category, index) => {
    parts.push(`### ${index + 1}. ${category.category_name}`);
    parts.push(`**Category ID:** \`${category.category_id}\``);
    parts.push(`**Parent ID:** ${category.parent_id}`);
    
    if (category.description && category.description !== 'No description available') {
      parts.push(`**Description:** ${category.description}`);
    }
    
    if (category.sample_series_count > 0) {
      parts.push(`**Sample Series (${category.sample_series_count}):** ${category.sample_series}`);
    }
    
    parts.push('');
  });

  parts.push('## 🚀 Usage Tips');
  parts.push('');
  parts.push('- **Use Category ID** to explore specific economic data areas');
  parts.push('- **Browse hierarchically** from general to specific categories');
  parts.push('- **Sample series** show the most popular data in each category');
  parts.push('- **Root categories** include: National Accounts, Employment, Prices, Interest Rates, etc.');
  parts.push('');
  parts.push('---');
  parts.push('*Powered by Federal Reserve Economic Data (FRED) API*');

  return parts.join('\n');
}

/**
 * Convert FRED releases to standardized rows
 */
function toFredReleasesRows(releasesData) {
  if (!releasesData || !releasesData.releases) {
    return [];
  }

  return releasesData.releases.map(release => ({
    release_id: release.id,
    release_name: release.name,
    has_press_release: release.press_release,
    link: release.link,
    description: release.notes,
    realtime_start: release.realtime_start,
    realtime_end: release.realtime_end,
    recent_dates: release.recent_dates ? release.recent_dates.join(', ') : '',
    fetch_date: new Date().toISOString().split('T')[0]
  }));
}

/**
 * Convert FRED releases to markdown
 */
function fredReleasesAsMarkdown(rows, releasesData) {
  if (!rows || rows.length === 0) {
    return '# FRED Economic Releases\n\nNo economic releases available.';
  }

  const parts = [
    '# 📅 FRED Economic Releases Calendar',
    '',
    `**Total Releases:** ${releasesData.totalReleases}`,
    `**Showing:** ${rows.length} most recent releases`,
    `**Fetch Date:** ${new Date().toLocaleDateString()}`,
    '',
    '## Recent Economic Releases',
    ''
  ];

  // Group releases by importance
  const pressReleases = rows.filter(r => r.has_press_release);
  const otherReleases = rows.filter(r => !r.has_press_release);

  if (pressReleases.length > 0) {
    parts.push('### 🚨 Major Press Releases');
    parts.push('');
    
    pressReleases.forEach((release, index) => {
      parts.push(`#### ${index + 1}. ${release.release_name}`);
      parts.push(`**Release ID:** \`${release.release_id}\``);
      parts.push(`**Type:** 📰 Press Release`);
      
      if (release.recent_dates) {
        parts.push(`**Recent Dates:** ${release.recent_dates}`);
      }
      
      if (release.link) {
        parts.push(`**Link:** [${release.link}](${release.link})`);
      }
      
      if (release.description && release.description !== 'No description available') {
        const shortDesc = release.description.length > 150 ? 
          release.description.substring(0, 150) + '...' : 
          release.description;
        parts.push(`**Description:** ${shortDesc}`);
      }
      
      parts.push('');
    });
  }

  if (otherReleases.length > 0) {
    parts.push('### 📊 Other Economic Releases');
    parts.push('');
    
    otherReleases.slice(0, 10).forEach((release, index) => {
      parts.push(`#### ${index + 1}. ${release.release_name}`);
      parts.push(`**Release ID:** \`${release.release_id}\``);
      
      if (release.recent_dates) {
        parts.push(`**Recent Dates:** ${release.recent_dates}`);
      }
      
      parts.push('');
    });
  }

  parts.push('## 📈 Economic Calendar Features');
  parts.push('');
  parts.push('- **Real-time Updates**: Latest economic data releases');
  parts.push('- **Press Releases**: Major announcements from Federal Reserve');
  parts.push('- **Release Dates**: Historical and upcoming release schedules');
  parts.push('- **Direct Links**: Access to original source documents');
  parts.push('');
  parts.push('## 💡 Usage Tips');
  parts.push('');
  parts.push('- **Press releases** typically contain the most market-moving information');
  parts.push('- **Release IDs** can be used to get detailed series data');
  parts.push('- **Recent dates** show the publication schedule');
  parts.push('- **Monitor regularly** for the latest economic updates');
  parts.push('');
  parts.push('---');
  parts.push('*Powered by Federal Reserve Economic Data (FRED) API*');

  return parts.join('\n');
}

async function fetchFredCategories({ categoryId = null, limit = 20 }) {
  try {
    
    const categoriesData = await extractFredCategories({ categoryId, limit });
    
    if (!categoriesData) {
      // Return empty results
      const rows = [];
      const markdown = fredCategoriesAsMarkdown(rows, { categoryId, totalCategories: 0 });
      return { rows, markdown };
    }
    
    const rows = toFredCategoriesRows(categoriesData);
    const markdown = fredCategoriesAsMarkdown(rows, categoriesData);
    
    return { rows, markdown };
    
  } catch (error) {
    throw error;
  }
}

async function fetchFredReleases({ limit = 20 }) {
  try {
    
    const releasesData = await extractFredReleases({ limit, includeReleases: true });
    
    if (!releasesData) {
      // Return empty results
      const rows = [];
      const markdown = fredReleasesAsMarkdown(rows, { totalReleases: 0 });
      return { rows, markdown };
    }
    
    const rows = toFredReleasesRows(releasesData);
    const markdown = fredReleasesAsMarkdown(rows, releasesData);
    
    return { rows, markdown };
    
  } catch (error) {
    throw error;
  }
}

/**
 * Extract FRED vintage data for historical analysis
 * @param {Object} params - Parameters with series ID
 * @returns {Promise<Object>} Vintage data analysis
 */
async function extractFredVintageData({ seriesId = '', analysisType = 'revisions' }) {
  try {
    
    const apiKey = process.env.FRED_API_KEY;
    if (!apiKey || apiKey === 'demo') {
      throw new Error('Valid FRED API key required for vintage data analysis. Please set FRED_API_KEY environment variable.');
    }
    
    // Get vintage dates first
    const vintageDatesUrl = `https://api.stlouisfed.org/fred/series/vintagedates?series_id=${seriesId}&api_key=${apiKey}&file_type=json&limit=20&sort_order=desc`;
    
    
    const vintageDatesResponse = await axios.get(vintageDatesUrl, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Yahoo-Finance-MCP/1.0)'
      }
    });
    
    if (!vintageDatesResponse.data || !vintageDatesResponse.data.vintage_dates || vintageDatesResponse.data.vintage_dates.length === 0) {
      throw new Error(`No vintage dates available for series ${seriesId}`);
    }
    
    const vintageDates = vintageDatesResponse.data.vintage_dates.slice(0, 5); // Get last 5 vintage dates
    
    // Get data for each vintage date
    const vintageAnalysis = await Promise.all(
      vintageDates.map(async (vintageDate) => {
        try {
          const dataUrl = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${apiKey}&file_type=json&vintage_dates=${vintageDate}&limit=10&sort_order=desc`;
          
          const dataResponse = await axios.get(dataUrl, {
            timeout: 10000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; Yahoo-Finance-MCP/1.0)'
            }
          });
          
          if (dataResponse.data && dataResponse.data.observations) {
            const validObs = dataResponse.data.observations
              .filter(obs => obs.value !== '.' && obs.value !== null)
              .slice(0, 3); // Get latest 3 observations for this vintage
            
            return {
              vintageDate,
              observations: validObs.map(obs => ({
                date: obs.date,
                value: parseFloat(obs.value),
                realtime_start: obs.realtime_start,
                realtime_end: obs.realtime_end
              }))
            };
          }
          
          await new Promise(resolve => setTimeout(resolve, 300)); // Rate limiting
          
        } catch (error) {
          return {
            vintageDate,
            observations: []
          };
        }
      })
    );
    
    // Analyze revisions
    const revisionAnalysis = analyzeRevisions(vintageAnalysis);
    
    return {
      seriesId,
      analysisType,
      vintageData: vintageAnalysis.filter(v => v.observations.length > 0),
      revisionAnalysis,
      totalVintages: vintageDates.length
    };
    
  } catch (error) {
    throw error;
  }
}

/**
 * Analyze revisions in vintage data
 */
function analyzeRevisions(vintageData) {
  if (!vintageData || vintageData.length < 2) {
    return { hasRevisions: false, analysis: 'Insufficient data for revision analysis' };
  }
  
  const revisions = [];
  const latestVintage = vintageData[0];
  const previousVintage = vintageData[1];
  
  // Find common dates between vintages
  if (latestVintage.observations.length > 0 && previousVintage.observations.length > 0) {
    const latestData = latestVintage.observations[0];
    const matchingPrevious = previousVintage.observations.find(obs => obs.date === latestData.date);
    
    if (matchingPrevious) {
      const revision = latestData.value - matchingPrevious.value;
      const revisionPercent = (revision / matchingPrevious.value) * 100;
      
      revisions.push({
        date: latestData.date,
        latestValue: latestData.value,
        previousValue: matchingPrevious.value,
        revision: revision,
        revisionPercent: revisionPercent,
        vintageComparison: `${previousVintage.vintageDate} → ${latestVintage.vintageDate}`
      });
    }
  }
  
  return {
    hasRevisions: revisions.length > 0,
    revisions,
    analysis: revisions.length > 0 ? 
      `Latest revision: ${revisions[0].revision > 0 ? '+' : ''}${revisions[0].revision.toFixed(3)} (${revisions[0].revisionPercent > 0 ? '+' : ''}${revisions[0].revisionPercent.toFixed(2)}%)` :
      'No revisions detected in recent data'
  };
}

/**
 * Convert FRED vintage data to standardized rows
 */
function toFredVintageRows(vintageData) {
  if (!vintageData || !vintageData.vintageData) {
    return [];
  }

  const rows = [];
  vintageData.vintageData.forEach(vintage => {
    vintage.observations.forEach(obs => {
      rows.push({
        series_id: vintageData.seriesId,
        vintage_date: vintage.vintageDate,
        observation_date: obs.date,
        value: obs.value,
        realtime_start: obs.realtime_start,
        realtime_end: obs.realtime_end,
        analysis_type: vintageData.analysisType,
        fetch_date: new Date().toISOString().split('T')[0]
      });
    });
  });
  
  return rows;
}

/**
 * Convert FRED vintage data to markdown
 */
function fredVintageAsMarkdown(rows, vintageData) {
  if (!rows || rows.length === 0) {
    return `# FRED Vintage Data Analysis\n\nNo vintage data available for series "${vintageData?.seriesId || 'unknown'}".`;
  }

  const parts = [
    '# 🕐 FRED Vintage Data Analysis',
    '',
    `**Series ID:** \`${vintageData.seriesId}\``,
    `**Analysis Type:** ${vintageData.analysisType}`,
    `**Vintage Periods:** ${vintageData.totalVintages}`,
    `**Data Points:** ${rows.length}`,
    `**Analysis Date:** ${new Date().toLocaleDateString()}`,
    '',
    '## 📊 Revision Analysis',
    ''
  ];

  const revision = vintageData.revisionAnalysis;
  if (revision.hasRevisions) {
    parts.push('### 🔍 Latest Revisions');
    parts.push('');
    
    revision.revisions.forEach((rev, index) => {
      const revisionIcon = rev.revision > 0 ? '📈' : rev.revision < 0 ? '📉' : '➡️';
      const significanceIcon = Math.abs(rev.revisionPercent) > 5 ? '🚨' : Math.abs(rev.revisionPercent) > 1 ? '⚠️' : '✅';
      
      parts.push(`**${index + 1}. ${rev.date}**`);
      parts.push(`- **Latest Value:** ${rev.latestValue.toLocaleString()}`);
      parts.push(`- **Previous Value:** ${rev.previousValue.toLocaleString()}`);
      parts.push(`- **Revision:** ${revisionIcon} ${rev.revision > 0 ? '+' : ''}${rev.revision.toFixed(3)} (${rev.revisionPercent > 0 ? '+' : ''}${rev.revisionPercent.toFixed(2)}%) ${significanceIcon}`);
      parts.push(`- **Vintage Period:** ${rev.vintageComparison}`);
      parts.push('');
    });
    
    parts.push('### 📈 Revision Impact');
    const avgRevision = revision.revisions.reduce((sum, r) => sum + Math.abs(r.revisionPercent), 0) / revision.revisions.length;
    const impactLevel = avgRevision > 5 ? 'High' : avgRevision > 1 ? 'Moderate' : 'Low';
    parts.push(`**Average Revision Magnitude:** ${avgRevision.toFixed(2)}% (${impactLevel} impact)`);
    
  } else {
    parts.push('**Status:** ✅ No significant revisions detected');
    parts.push(`**Analysis:** ${revision.analysis}`);
  }

  parts.push('');
  parts.push('## 🗓️ Vintage Data Timeline');
  parts.push('');
  parts.push('| Vintage Date | Observation Date | Value | Real-time Period |');
  parts.push('|--------------|------------------|-------|------------------|');

  rows.slice(0, 15).forEach(row => {
    const formattedValue = row.value > 1000 ? row.value.toLocaleString() : row.value.toFixed(2);
    parts.push(`| ${row.vintage_date} | ${row.observation_date} | **${formattedValue}** | ${row.realtime_start} to ${row.realtime_end} |`);
  });

  parts.push('');
  parts.push('## 📚 Understanding Vintage Data');
  parts.push('');
  parts.push('**Vintage data** shows how economic statistics change as they are revised over time:');
  parts.push('');
  parts.push('- **Initial Release**: First published estimate');
  parts.push('- **Revisions**: Updates as more complete data becomes available');
  parts.push('- **Benchmark Revisions**: Major methodological updates');
  parts.push('- **Real-time Analysis**: How data looked at specific points in history');
  parts.push('');
  parts.push('### 💡 Applications');
  parts.push('- **Policy Analysis**: How decisions looked with data available at the time');
  parts.push('- **Forecast Evaluation**: Account for data revisions in model assessment');
  parts.push('- **Market Impact**: Understand revision patterns for trading strategies');
  parts.push('- **Research**: Use real-time data for historical analysis');
  parts.push('');
  parts.push('---');
  parts.push('*Powered by Federal Reserve Economic Data (FRED) Vintage API*');

  return parts.join('\n');
}

async function fetchFredVintageData({ seriesId = '', analysisType = 'revisions' }) {
  try {
    
    if (!seriesId.trim()) {
      throw new Error('Series ID is required for FRED vintage data analysis');
    }
    
    const vintageData = await extractFredVintageData({ seriesId, analysisType });
    
    if (!vintageData) {
      throw new Error(`No vintage data found for FRED series: ${seriesId}`);
    }
    
    const rows = toFredVintageRows(vintageData);
    const markdown = fredVintageAsMarkdown(rows, vintageData);
    
    return { rows, markdown };
    
  } catch (error) {
    throw error;
  }
}

/**
 * Extract FRED tags for economic data discovery
 * @param {Object} params - Parameters for tag search
 * @returns {Promise<Object>} Tags data
 */
async function extractFredTags({ searchText = '', tagNames = '', limit = 20 }) {
  try {
    
    const apiKey = process.env.FRED_API_KEY;
    if (!apiKey || apiKey === 'demo') {
      throw new Error('Valid FRED API key required for tags data. Please set FRED_API_KEY environment variable.');
    }
    
    const baseUrl = 'https://api.stlouisfed.org/fred/tags';
    const params = new URLSearchParams({
      api_key: apiKey,
      file_type: 'json',
      limit: limit.toString(),
      order_by: 'popularity',
      sort_order: 'desc'
    });
    
    if (searchText) {
      params.append('search_text', searchText);
    }
    
    if (tagNames) {
      params.append('tag_names', tagNames);
    }
    
    const url = `${baseUrl}?${params.toString()}`;
    
    
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Yahoo-Finance-MCP/1.0)'
      }
    });
    
    if (response.data && response.data.tags && response.data.tags.length > 0) {
      
      const tags = response.data.tags.map(tag => ({
        name: tag.name,
        group_id: tag.group_id,
        notes: tag.notes || 'No description available',
        created: tag.created,
        popularity: tag.popularity || 0,
        series_count: tag.series_count || 0
      }));
      
      // For each popular tag, get some related tags
      const tagsWithRelated = await Promise.all(
        tags.slice(0, 5).map(async (tag) => {
          try {
            const relatedUrl = `https://api.stlouisfed.org/fred/related_tags?tag_names=${encodeURIComponent(tag.name)}&api_key=${apiKey}&file_type=json&limit=5`;
            
            const relatedResponse = await axios.get(relatedUrl, {
              timeout: 8000,
              headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; Yahoo-Finance-MCP/1.0)'
              }
            });
            
            if (relatedResponse.data && relatedResponse.data.tags) {
              tag.related_tags = relatedResponse.data.tags.slice(0, 3).map(rt => rt.name);
            }
            
            await new Promise(resolve => setTimeout(resolve, 200)); // Rate limiting
            
          } catch (relatedError) {
            tag.related_tags = [];
          }
          
          return tag;
        })
      );
      
      return {
        searchText,
        tagNames,
        tags: tagsWithRelated.concat(tags.slice(5)), // Add enhanced tags + remaining tags
        totalTags: response.data.count || tags.length
      };
    }
    
    return null;
  } catch (error) {
    throw error;
  }
}

/**
 * Extract FRED regional/geographic data
 * @param {Object} params - Parameters for regional data
 * @returns {Promise<Object>} Regional data
 */
async function extractFredRegionalData({ tagNames = 'regional', limit = 20 }) {
  try {
    
    const apiKey = process.env.FRED_API_KEY;
    if (!apiKey || apiKey === 'demo') {
      throw new Error('Valid FRED API key required for regional data. Please set FRED_API_KEY environment variable.');
    }
    
    // Get series with regional tags
    const seriesUrl = `https://api.stlouisfed.org/fred/tags/series?tag_names=${encodeURIComponent(tagNames)}&api_key=${apiKey}&file_type=json&limit=${limit}&order_by=popularity&sort_order=desc`;
    
    
    const response = await axios.get(seriesUrl, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Yahoo-Finance-MCP/1.0)'
      }
    });
    
    if (response.data && response.data.seriess && response.data.seriess.length > 0) {
      
      const regionalSeries = response.data.seriess.map(series => ({
        id: series.id,
        title: series.title,
        units: series.units || 'Unknown',
        frequency: series.frequency || 'Unknown',
        seasonal_adjustment: series.seasonal_adjustment || 'Unknown',
        last_updated: series.last_updated,
        popularity: series.popularity || 0,
        notes: series.notes ? series.notes.substring(0, 200) + '...' : 'No description available'
      }));
      
      // Try to get latest data for top regional series
      const seriesWithData = await Promise.all(
        regionalSeries.slice(0, 5).map(async (series) => {
          try {
            const dataUrl = `https://api.stlouisfed.org/fred/series/observations?series_id=${series.id}&api_key=${apiKey}&file_type=json&limit=1&sort_order=desc`;
            
            const dataResponse = await axios.get(dataUrl, {
              timeout: 8000,
              headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; Yahoo-Finance-MCP/1.0)'
              }
            });
            
            if (dataResponse.data && dataResponse.data.observations && dataResponse.data.observations.length > 0) {
              const latestObs = dataResponse.data.observations.find(obs => obs.value !== '.' && obs.value !== null);
              if (latestObs) {
                series.latest_value = parseFloat(latestObs.value);
                series.latest_date = latestObs.date;
              }
            }
            
            await new Promise(resolve => setTimeout(resolve, 300)); // Rate limiting
            
          } catch (dataError) {
          }
          
          return series;
        })
      );
      
      return {
        tagNames,
        regionalSeries: seriesWithData.concat(regionalSeries.slice(5)),
        totalSeries: response.data.count || regionalSeries.length
      };
    }
    
    return null;
  } catch (error) {
    throw error;
  }
}

/**
 * Convert FRED tags to standardized rows
 */
function toFredTagsRows(tagsData) {
  if (!tagsData || !tagsData.tags) {
    return [];
  }

  return tagsData.tags.map(tag => ({
    tag_name: tag.name,
    group_id: tag.group_id,
    description: tag.notes,
    created_date: tag.created,
    popularity: tag.popularity,
    series_count: tag.series_count,
    related_tags: tag.related_tags ? tag.related_tags.join(', ') : '',
    search_text: tagsData.searchText || '',
    fetch_date: new Date().toISOString().split('T')[0]
  }));
}

/**
 * Convert FRED tags to markdown
 */
function fredTagsAsMarkdown(rows, tagsData) {
  if (!rows || rows.length === 0) {
    return '# FRED Tags\n\nNo economic data tags available.';
  }

  const parts = [
    '# 🏷️ FRED Economic Data Tags',
    '',
    `**Search:** ${tagsData.searchText || tagsData.tagNames || 'Popular Tags'}`,
    `**Total Tags:** ${tagsData.totalTags}`,
    `**Showing:** ${rows.length} tags`,
    `**Discovery Date:** ${new Date().toLocaleDateString()}`,
    '',
    '## 📊 Popular Economic Tags',
    ''
  ];

  // Group tags by popularity
  const highPopTags = rows.filter(t => t.popularity > 80);
  const medPopTags = rows.filter(t => t.popularity > 50 && t.popularity <= 80);
  const otherTags = rows.filter(t => t.popularity <= 50);

  if (highPopTags.length > 0) {
    parts.push('### 🔥 Most Popular Tags');
    parts.push('');
    
    highPopTags.forEach((tag, index) => {
      parts.push(`#### ${index + 1}. \`${tag.tag_name}\``);
      parts.push(`**Popularity:** ${tag.popularity} | **Series:** ${tag.series_count.toLocaleString()}`);
      
      if (tag.related_tags) {
        parts.push(`**Related:** ${tag.related_tags}`);
      }
      
      if (tag.description && tag.description !== 'No description available') {
        parts.push(`**Description:** ${tag.description}`);
      }
      
      parts.push('');
    });
  }

  if (medPopTags.length > 0) {
    parts.push('### 📈 Commonly Used Tags');
    parts.push('');
    
    medPopTags.slice(0, 8).forEach((tag, index) => {
      parts.push(`**${index + 1}. \`${tag.tag_name}\`** (${tag.series_count.toLocaleString()} series)`);
      if (tag.related_tags) {
        parts.push(`   *Related:* ${tag.related_tags}`);
      }
      parts.push('');
    });
  }

  if (otherTags.length > 0) {
    parts.push('### 📋 Additional Tags');
    parts.push('');
    
    const tagsList = otherTags.slice(0, 15).map(t => `\`${t.tag_name}\``).join(', ');
    parts.push(tagsList);
    parts.push('');
  }

  parts.push('## 🎯 Tag-Based Discovery');
  parts.push('');
  parts.push('**Popular Economic Concepts:**');
  parts.push('- **Frequency:** `annual`, `quarterly`, `monthly`, `weekly`, `daily`');
  parts.push('- **Geography:** `usa`, `state`, `county`, `msa`, `regional`');
  parts.push('- **Adjustment:** `sa` (seasonally adjusted), `nsa` (not seasonally adjusted)');
  parts.push('- **Topics:** `gdp`, `employment`, `inflation`, `housing`, `trade`');
  parts.push('- **Demographics:** `population`, `income`, `education`, `health`');
  parts.push('');
  parts.push('## 💡 Usage Tips');
  parts.push('');
  parts.push('- **Combine tags** to narrow down search results');
  parts.push('- **Use geographic tags** for regional analysis');
  parts.push('- **Filter by frequency** for specific reporting periods');
  parts.push('- **Popular tags** indicate widely-used economic indicators');
  parts.push('');
  parts.push('---');
  parts.push('*Powered by Federal Reserve Economic Data (FRED) Tags API*');

  return parts.join('\n');
}

/**
 * Convert FRED regional data to standardized rows
 */
function toFredRegionalRows(regionalData) {
  if (!regionalData || !regionalData.regionalSeries) {
    return [];
  }

  return regionalData.regionalSeries.map(series => ({
    series_id: series.id,
    title: series.title,
    units: series.units,
    frequency: series.frequency,
    seasonal_adjustment: series.seasonal_adjustment,
    last_updated: series.last_updated,
    popularity: series.popularity,
    latest_value: series.latest_value || null,
    latest_date: series.latest_date || null,
    description: series.notes,
    tag_filter: regionalData.tagNames,
    fetch_date: new Date().toISOString().split('T')[0]
  }));
}

/**
 * Convert FRED regional data to markdown
 */
function fredRegionalAsMarkdown(rows, regionalData) {
  if (!rows || rows.length === 0) {
    return '# FRED Regional Data\n\nNo regional economic data available.';
  }

  const parts = [
    '# 🗺️ FRED Regional Economic Data',
    '',
    `**Regional Filter:** \`${regionalData.tagNames}\``,
    `**Total Series:** ${regionalData.totalSeries}`,
    `**Showing:** ${rows.length} regional indicators`,
    `**Analysis Date:** ${new Date().toLocaleDateString()}`,
    '',
    '## 🏛️ Regional Economic Indicators',
    ''
  ];

  // Group by data availability
  const withData = rows.filter(r => r.latest_value !== null);
  const withoutData = rows.filter(r => r.latest_value === null);

  if (withData.length > 0) {
    parts.push('### 📊 Current Regional Data');
    parts.push('');
    parts.push('| Series | Latest Value | Date | Frequency |');
    parts.push('|--------|--------------|------|-----------|');
    
    withData.slice(0, 10).forEach(series => {
      const formattedValue = series.latest_value > 1000 ? 
        series.latest_value.toLocaleString() : 
        series.latest_value.toFixed(2);
      const shortTitle = series.title.length > 50 ? 
        series.title.substring(0, 50) + '...' : 
        series.title;
      
      parts.push(`| ${shortTitle} | **${formattedValue}** ${series.units} | ${series.latest_date} | ${series.frequency} |`);
    });
    
    parts.push('');
  }

  if (withoutData.length > 0) {
    parts.push('### 📋 Additional Regional Series');
    parts.push('');
    
    withoutData.slice(0, 8).forEach((series, index) => {
      parts.push(`#### ${index + 1}. ${series.title}`);
      parts.push(`**Series ID:** \`${series.series_id}\``);
      parts.push(`**Units:** ${series.units} | **Frequency:** ${series.frequency}`);
      parts.push(`**Popularity:** ${series.popularity}`);
      
      if (series.description && series.description !== 'No description available') {
        const shortDesc = series.description.length > 150 ? 
          series.description.substring(0, 150) + '...' : 
          series.description;
        parts.push(`**Description:** ${shortDesc}`);
      }
      
      parts.push('');
    });
  }

  parts.push('## 🗺️ Regional Analysis Features');
  parts.push('');
  parts.push('- **State-Level Data**: Economic indicators by U.S. state');
  parts.push('- **Metro Areas**: MSA (Metropolitan Statistical Area) data');
  parts.push('- **County-Level**: Local economic conditions');
  parts.push('- **Regional Comparisons**: Cross-geography analysis');
  parts.push('');
  parts.push('## 💡 Popular Regional Tags');
  parts.push('');
  parts.push('- **\`state\`** - State-level economic data');
  parts.push('- **\`msa\`** - Metropolitan Statistical Areas');
  parts.push('- **\`county\`** - County-level indicators');
  parts.push('- **\`regional\`** - Multi-state regions');
  parts.push('- **\`california\`, \`texas\`, \`new york\`** - Specific states');
  parts.push('');
  parts.push('---');
  parts.push('*Powered by Federal Reserve Economic Data (FRED) Regional API*');

  return parts.join('\n');
}

async function fetchFredTags({ searchText = '', tagNames = '', limit = 20 }) {
  try {
    
    const tagsData = await extractFredTags({ searchText, tagNames, limit });
    
    if (!tagsData) {
      // Return empty results
      const rows = [];
      const markdown = fredTagsAsMarkdown(rows, { searchText, tagNames, totalTags: 0 });
      return { rows, markdown };
    }
    
    const rows = toFredTagsRows(tagsData);
    const markdown = fredTagsAsMarkdown(rows, tagsData);
    
    return { rows, markdown };
    
  } catch (error) {
    throw error;
  }
}

async function fetchFredRegionalData({ tagNames = 'regional', limit = 20 }) {
  try {
    
    const regionalData = await extractFredRegionalData({ tagNames, limit });
    
    if (!regionalData) {
      // Return empty results
      const rows = [];
      const markdown = fredRegionalAsMarkdown(rows, { tagNames, totalSeries: 0 });
      return { rows, markdown };
    }
    
    const rows = toFredRegionalRows(regionalData);
    const markdown = fredRegionalAsMarkdown(rows, regionalData);
    
    return { rows, markdown };
    
  } catch (error) {
    throw error;
  }
}

/**
 * Extract market indices data from Yahoo Finance
 * @returns {Promise<Object|null>} Market indices data
 */
async function extractMarketIndicesData() {
  try {
    
    // Major market indices and sector ETFs
    const indices = {
      'SP500': '^GSPC',      // S&P 500
      'NASDAQ': '^IXIC',     // NASDAQ Composite
      'DOW': '^DJI',         // Dow Jones Industrial Average
      'VIX': '^VIX',         // Volatility Index
      'RUSSELL2000': '^RUT', // Russell 2000
      'TECH': 'XLK',         // Technology Sector ETF
      'FINANCIALS': 'XLF',   // Financial Sector ETF
      'HEALTHCARE': 'XLV',   // Healthcare Sector ETF
      'ENERGY': 'XLE',       // Energy Sector ETF
      'CONSUMER': 'XLY'      // Consumer Discretionary Sector ETF
    };
    
    const results = {};
    
    for (const [name, symbol] of Object.entries(indices)) {
      try {
        
        const response = await axios.get(`https://finance.yahoo.com/quote/${symbol}?p=${symbol}`, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1'
          },
          timeout: 8000
        });
        
        const html = response.data;
        
        // Extract key metrics
        const metrics = {};
        const patterns = {
          price: /\\"regularMarketPrice\\":\{[^}]*\\"raw\\":(\d+\.?\d*)/,
          change: /\\"regularMarketChange\\":\{[^}]*\\"raw\\":(-?\d+\.?\d*)/,
          changePercent: /\\"regularMarketChangePercent\\":\{[^}]*\\"raw\\":(-?\d+\.?\d*)/,
          volume: /\\"regularMarketVolume\\":\{[^}]*\\"raw\\":(\d+)/,
          marketCap: /\\"marketCap\\":\{[^}]*\\"raw\\":(\d+)/
        };
        
        for (const [metric, pattern] of Object.entries(patterns)) {
          const match = html.match(pattern);
          if (match) {
            metrics[metric] = metric === 'volume' || metric === 'marketCap' ? 
              parseInt(match[1]) : parseFloat(match[1]);
          }
        }
        
        if (Object.keys(metrics).length > 0) {
          results[name] = {
            symbol: symbol,
            name: getIndexName(name),
            ...metrics,
            lastUpdated: new Date().toISOString().split('T')[0]
          };
        }
        
        // Small delay to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 300));
        
      } catch (error) {
      }
    }
    
    if (Object.keys(results).length > 0) {
      return results;
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Get human-readable index names
 */
function getIndexName(index) {
  const names = {
    'SP500': 'S&P 500',
    'NASDAQ': 'NASDAQ Composite',
    'DOW': 'Dow Jones Industrial Average',
    'VIX': 'CBOE Volatility Index',
    'RUSSELL2000': 'Russell 2000',
    'TECH': 'Technology Sector SPDR',
    'FINANCIALS': 'Financial Sector SPDR',
    'HEALTHCARE': 'Healthcare Sector SPDR',
    'ENERGY': 'Energy Sector SPDR',
    'CONSUMER': 'Consumer Discretionary SPDR'
  };
  return names[index] || index;
}

/**
 * Convert market indices to standardized rows
 */
function toMarketIndicesRows(indicesData) {
  if (!indicesData) {
    return [];
  }

  const rows = [];
  Object.entries(indicesData).forEach(([key, data]) => {
    rows.push({
      index_key: key,
      symbol: data.symbol,
      index_name: data.name,
      price: data.price || null,
      change: data.change || null,
      change_percent: data.changePercent || null,
      volume: data.volume || null,
      market_cap: data.marketCap || null,
      last_updated: data.lastUpdated,
      report_date: new Date().toISOString().split('T')[0]
    });
  });

  return rows;
}

/**
 * Convert market indices to markdown
 */
function marketIndicesAsMarkdown(rows) {
  if (!rows || rows.length === 0) {
    return '# Market Indices\n\nNo market data available.';
  }

  const parts = [
    '# Market Indices & Sector Performance',
    '',
    `**Last Updated:** ${new Date().toLocaleString()}`,
    '',
    '## Major Indices',
    '',
    '| Index | Price | Change | Change % | Volume |',
    '|-------|-------|--------|----------|--------|'
  ];

  // Add major indices first
  const majorIndices = ['SP500', 'NASDAQ', 'DOW', 'VIX', 'RUSSELL2000'];
  rows.filter(row => majorIndices.includes(row.index_key)).forEach(row => {
    const changeColor = row.change >= 0 ? '🟢' : '🔴';
    const formattedPrice = row.price ? `$${row.price.toLocaleString()}` : 'N/A';
    const formattedChange = row.change ? `${row.change > 0 ? '+' : ''}${row.change.toFixed(2)}` : 'N/A';
    const formattedPercent = row.change_percent ? `${row.change_percent > 0 ? '+' : ''}${row.change_percent.toFixed(2)}%` : 'N/A';
    const formattedVolume = row.volume ? row.volume.toLocaleString() : 'N/A';
    
    parts.push(`| ${changeColor} ${row.index_name} | ${formattedPrice} | ${formattedChange} | ${formattedPercent} | ${formattedVolume} |`);
  });

  parts.push('');
  parts.push('## Sector Performance');
  parts.push('');
  parts.push('| Sector | Price | Change % |');
  parts.push('|--------|-------|----------|');

  // Add sector ETFs
  const sectorIndices = ['TECH', 'FINANCIALS', 'HEALTHCARE', 'ENERGY', 'CONSUMER'];
  rows.filter(row => sectorIndices.includes(row.index_key)).forEach(row => {
    const changeColor = row.change_percent >= 0 ? '🟢' : '🔴';
    const formattedPrice = row.price ? `$${row.price.toFixed(2)}` : 'N/A';
    const formattedPercent = row.change_percent ? `${row.change_percent > 0 ? '+' : ''}${row.change_percent.toFixed(2)}%` : 'N/A';
    
    parts.push(`| ${changeColor} ${row.index_name} | ${formattedPrice} | ${formattedPercent} |`);
  });

  // Add market analysis
  parts.push('');
  parts.push('## Market Analysis');
  
  const sp500 = rows.find(r => r.index_key === 'SP500');
  const vix = rows.find(r => r.index_key === 'VIX');
  
  if (sp500) {
    const marketDirection = sp500.change_percent > 0 ? 'up' : sp500.change_percent < 0 ? 'down' : 'flat';
    parts.push(`**S&P 500:** Market is ${marketDirection} ${Math.abs(sp500.change_percent || 0).toFixed(2)}%`);
  }
  
  if (vix) {
    const fearGreed = vix.price < 20 ? 'Low Fear (Complacent)' : 
                     vix.price < 30 ? 'Moderate Fear' : 'High Fear (Panic)';
    parts.push(`**Volatility:** VIX at ${vix.price.toFixed(2)} - ${fearGreed}`);
  }

  return parts.join('\n');
}

async function fetchMarketIndices() {
  try {
    
    const indicesData = await extractMarketIndicesData();
    
    if (!indicesData) {
      throw new Error('Could not extract market indices data');
    }
    
    const rows = toMarketIndicesRows(indicesData);
    const markdown = marketIndicesAsMarkdown(rows);
    
    return { rows, markdown };
    
  } catch (error) {
    throw error;
  }
}

/**
 * Stock screener for multi-criteria discovery
 * @param {Object} criteria - Screening criteria
 * @returns {Promise<Object>} Screened stocks
 */
async function extractStockScreenerData(criteria = {}) {
  try {
    
    // Define a universe of popular stocks to screen
    const stockUniverse = [
      // Mega caps
      'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'BRK-B', 'LLY', 'AVGO',
      // Large caps
      'JPM', 'V', 'UNH', 'JNJ', 'WMT', 'XOM', 'MA', 'PG', 'HD', 'CVX',
      // Tech growth
      'NFLX', 'ADBE', 'CRM', 'ORCL', 'INTC', 'AMD', 'QCOM', 'CSCO', 'TXN', 'AMAT',
      // Finance
      'BAC', 'WFC', 'GS', 'MS', 'C', 'AXP', 'SCHW', 'BLK', 'SPGI', 'CME',
      // Healthcare
      'PFE', 'ABBV', 'TMO', 'ABT', 'DHR', 'MRK', 'BMY', 'MDT', 'AMGN', 'GILD',
      // Consumer
      'KO', 'PEP', 'NKE', 'MCD', 'SBUX', 'TGT', 'COST', 'LOW', 'DIS', 'PYPL',
      // Industrial
      'BA', 'CAT', 'MMM', 'HON', 'RTX', 'UPS', 'FDX', 'GE', 'DE', 'LMT'
    ];
    
    const results = [];
    const maxStocks = Math.min(stockUniverse.length, criteria.maxResults || 20);
    
    
    for (let i = 0; i < maxStocks; i++) {
      const symbol = stockUniverse[i];
      
      try {
        
        const response = await axios.get(`https://finance.yahoo.com/quote/${symbol}?p=${symbol}`, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1'
          },
          timeout: 8000
        });
        
        const html = response.data;
        
        // Extract key metrics for screening
        const metrics = {};
        const patterns = {
          price: /\\"regularMarketPrice\\":\{[^}]*\\"raw\\":(\d+\.?\d*)/,
          marketCap: /\\"marketCap\\":\{[^}]*\\"raw\\":(\d+)/,
          trailingPE: /\\"trailingPE\\":\{[^}]*\\"raw\\":(\d+\.?\d*)/,
          forwardPE: /\\"forwardPE\\":\{[^}]*\\"raw\\":(\d+\.?\d*)/,
          pegRatio: /\\"pegRatio\\":\{[^}]*\\"raw\\":(\d+\.?\d*)/,
          priceToBook: /\\"priceToBook\\":\{[^}]*\\"raw\\":(\d+\.?\d*)/,
          dividendYield: /\\"dividendYield\\":\{[^}]*\\"raw\\":(\d+\.?\d*)/,
          revenueGrowth: /\\"revenueGrowth\\":\{[^}]*\\"raw\\":(\d+\.?\d*)/,
          earningsGrowth: /\\"earningsGrowth\\":\{[^}]*\\"raw\\":(-?\d+\.?\d*)/,
          profitMargins: /\\"profitMargins\\":\{[^}]*\\"raw\\":(\d+\.?\d*)/,
          returnOnEquity: /\\"returnOnEquity\\":\{[^}]*\\"raw\\":(\d+\.?\d*)/,
          debtToEquity: /\\"debtToEquity\\":\{[^}]*\\"raw\\":(\d+\.?\d*)/,
          beta: /\\"beta\\":\{[^}]*\\"raw\\":(\d+\.?\d*)/,
          volume: /\\"regularMarketVolume\\":\{[^}]*\\"raw\\":(\d+)/,
          averageVolume: /\\"averageVolume\\":\{[^}]*\\"raw\\":(\d+)/
        };
        
        for (const [metric, pattern] of Object.entries(patterns)) {
          const match = html.match(pattern);
          if (match) {
            metrics[metric] = metric === 'volume' || metric === 'averageVolume' || metric === 'marketCap' ? 
              parseInt(match[1]) : parseFloat(match[1]);
          }
        }
        
        // Apply screening criteria
        const passesScreen = applyScreeningCriteria(metrics, criteria);
        
        if (passesScreen) {
          // Extract company name and sector
          const nameMatch = html.match(/\\"longName\\":\\"([^"]+)\\"/);
          const sectorMatch = html.match(/\\"sector\\":\\"([^"]+)\\"/);
          
          results.push({
            symbol: symbol,
            name: nameMatch ? nameMatch[1] : symbol,
            sector: sectorMatch ? sectorMatch[1] : 'Unknown',
            ...metrics,
            screenDate: new Date().toISOString().split('T')[0]
          });
          
        } else {
        }
        
        // Small delay to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 400));
        
      } catch (error) {
      }
    }
    
    if (results.length > 0) {
      return results;
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Apply screening criteria to stock metrics
 */
function applyScreeningCriteria(metrics, criteria) {
  // Default criteria if none provided
  const defaultCriteria = {
    minMarketCap: 1e9,        // $1B minimum
    maxPE: 50,                // P/E ratio under 50
    minDividendYield: null,   // No minimum dividend yield
    maxDebtToEquity: null,    // No debt limit
    minROE: null,             // No minimum ROE
    minRevenueGrowth: null,   // No minimum growth
    sectors: []               // No sector filter
  };
  
  const finalCriteria = { ...defaultCriteria, ...criteria };
  
  // Market cap filter
  if (finalCriteria.minMarketCap && metrics.marketCap && metrics.marketCap < finalCriteria.minMarketCap) {
    return false;
  }
  
  if (finalCriteria.maxMarketCap && metrics.marketCap && metrics.marketCap > finalCriteria.maxMarketCap) {
    return false;
  }
  
  // P/E ratio filter
  if (finalCriteria.maxPE && metrics.trailingPE && metrics.trailingPE > finalCriteria.maxPE) {
    return false;
  }
  
  if (finalCriteria.minPE && metrics.trailingPE && metrics.trailingPE < finalCriteria.minPE) {
    return false;
  }
  
  // Dividend yield filter
  if (finalCriteria.minDividendYield && (!metrics.dividendYield || metrics.dividendYield < finalCriteria.minDividendYield)) {
    return false;
  }
  
  // Debt to equity filter
  if (finalCriteria.maxDebtToEquity && metrics.debtToEquity && metrics.debtToEquity > finalCriteria.maxDebtToEquity) {
    return false;
  }
  
  // ROE filter
  if (finalCriteria.minROE && (!metrics.returnOnEquity || metrics.returnOnEquity < finalCriteria.minROE)) {
    return false;
  }
  
  // Revenue growth filter
  if (finalCriteria.minRevenueGrowth && (!metrics.revenueGrowth || metrics.revenueGrowth < finalCriteria.minRevenueGrowth)) {
    return false;
  }
  
  // Beta filter
  if (finalCriteria.maxBeta && metrics.beta && metrics.beta > finalCriteria.maxBeta) {
    return false;
  }
  
  if (finalCriteria.minBeta && metrics.beta && metrics.beta < finalCriteria.minBeta) {
    return false;
  }
  
  return true;
}

/**
 * Convert screener results to standardized rows
 */
function toScreenerRows(screenerData, criteria) {
  if (!screenerData || !Array.isArray(screenerData)) {
    return [];
  }

  return screenerData.map(stock => ({
    symbol: stock.symbol,
    name: stock.name,
    sector: stock.sector,
    price: stock.price || null,
    market_cap: stock.marketCap || null,
    trailing_pe: stock.trailingPE || null,
    forward_pe: stock.forwardPE || null,
    peg_ratio: stock.pegRatio || null,
    price_to_book: stock.priceToBook || null,
    dividend_yield: stock.dividendYield || null,
    revenue_growth: stock.revenueGrowth || null,
    earnings_growth: stock.earningsGrowth || null,
    profit_margins: stock.profitMargins || null,
    return_on_equity: stock.returnOnEquity || null,
    debt_to_equity: stock.debtToEquity || null,
    beta: stock.beta || null,
    volume: stock.volume || null,
    average_volume: stock.averageVolume || null,
    screen_date: stock.screenDate,
    criteria_used: JSON.stringify(criteria)
  }));
}

/**
 * Convert screener results to markdown
 */
function screenerAsMarkdown(rows, criteria) {
  if (!rows || rows.length === 0) {
    return '# Stock Screener Results\n\nNo stocks found matching the specified criteria.';
  }

  const parts = [
    '# Stock Screener Results',
    '',
    `**Found ${rows.length} stocks matching criteria**`,
    `**Screen Date:** ${new Date().toLocaleDateString()}`,
    ''
  ];

  // Add criteria summary
  parts.push('## Screening Criteria');
  if (criteria.minMarketCap) parts.push(`- **Min Market Cap:** $${(criteria.minMarketCap / 1e9).toFixed(1)}B`);
  if (criteria.maxMarketCap) parts.push(`- **Max Market Cap:** $${(criteria.maxMarketCap / 1e9).toFixed(1)}B`);
  if (criteria.maxPE) parts.push(`- **Max P/E Ratio:** ${criteria.maxPE}`);
  if (criteria.minPE) parts.push(`- **Min P/E Ratio:** ${criteria.minPE}`);
  if (criteria.minDividendYield) parts.push(`- **Min Dividend Yield:** ${(criteria.minDividendYield * 100).toFixed(1)}%`);
  if (criteria.maxDebtToEquity) parts.push(`- **Max Debt/Equity:** ${criteria.maxDebtToEquity}`);
  if (criteria.minROE) parts.push(`- **Min ROE:** ${(criteria.minROE * 100).toFixed(1)}%`);
  if (criteria.minRevenueGrowth) parts.push(`- **Min Revenue Growth:** ${(criteria.minRevenueGrowth * 100).toFixed(1)}%`);
  if (criteria.maxBeta) parts.push(`- **Max Beta:** ${criteria.maxBeta}`);
  parts.push('');

  // Add results table
  parts.push('## Results');
  parts.push('');
  parts.push('| Symbol | Company | Sector | Price | Market Cap | P/E | Div Yield | Rev Growth |');
  parts.push('|--------|---------|--------|-------|------------|-----|-----------|------------|');

  rows.forEach(stock => {
    const marketCap = stock.market_cap ? `$${(stock.market_cap / 1e9).toFixed(1)}B` : 'N/A';
    const pe = stock.trailing_pe ? stock.trailing_pe.toFixed(1) : 'N/A';
    const divYield = stock.dividend_yield ? `${(stock.dividend_yield * 100).toFixed(1)}%` : 'N/A';
    const revGrowth = stock.revenue_growth ? `${(stock.revenue_growth * 100).toFixed(1)}%` : 'N/A';
    const price = stock.price ? `$${stock.price.toFixed(2)}` : 'N/A';
    
    parts.push(`| **${stock.symbol}** | ${stock.name} | ${stock.sector} | ${price} | ${marketCap} | ${pe} | ${divYield} | ${revGrowth} |`);
  });

  // Add top picks analysis
  parts.push('');
  parts.push('## Top Picks Analysis');
  
  // Sort by different criteria for insights
  const lowPE = [...rows].filter(s => s.trailing_pe).sort((a, b) => a.trailing_pe - b.trailing_pe).slice(0, 3);
  const highGrowth = [...rows].filter(s => s.revenue_growth).sort((a, b) => b.revenue_growth - a.revenue_growth).slice(0, 3);
  const highDividend = [...rows].filter(s => s.dividend_yield).sort((a, b) => b.dividend_yield - a.dividend_yield).slice(0, 3);

  if (lowPE.length > 0) {
    parts.push(`**Value Picks (Low P/E):** ${lowPE.map(s => `${s.symbol} (${s.trailing_pe.toFixed(1)})`).join(', ')}`);
  }
  
  if (highGrowth.length > 0) {
    parts.push(`**Growth Picks (High Rev Growth):** ${highGrowth.map(s => `${s.symbol} (${(s.revenue_growth * 100).toFixed(1)}%)`).join(', ')}`);
  }
  
  if (highDividend.length > 0) {
    parts.push(`**Income Picks (High Div Yield):** ${highDividend.map(s => `${s.symbol} (${(s.dividend_yield * 100).toFixed(1)}%)`).join(', ')}`);
  }

  return parts.join('\n');
}

async function fetchStockScreener({ criteria = {} }) {
  try {
    
    const screenerData = await extractStockScreenerData(criteria);
    
    if (!screenerData) {
      // Return empty results
      const rows = [];
      const markdown = screenerAsMarkdown(rows, criteria);
      return { rows, markdown };
    }
    
    const rows = toScreenerRows(screenerData, criteria);
    const markdown = screenerAsMarkdown(rows, criteria);
    
    return { rows, markdown };
    
  } catch (error) {
    throw error;
  }
}

/**
 * Stock correlation analysis for portfolio optimization
 * @param {Object} params - Parameters with symbols array
 * @returns {Promise<Object>} Correlation matrix and analysis
 */
async function extractStockCorrelationData({ symbols = [] }) {
  try {
    
    if (symbols.length < 2) {
      throw new Error('Need at least 2 symbols for correlation analysis');
    }
    
    const priceData = {};
    const correlationMatrix = {};
    
    // Get historical price data for each symbol (simplified approach)
    for (const symbol of symbols) {
      try {
        
        const response = await axios.get(`https://finance.yahoo.com/quote/${symbol}?p=${symbol}`, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1'
          },
          timeout: 8000
        });
        
        const html = response.data;
        
        // Extract current metrics for basic correlation estimation
        const metrics = {};
        const patterns = {
          price: /\\"regularMarketPrice\\":\{[^}]*\\"raw\\":(\d+\.?\d*)/,
          change: /\\"regularMarketChange\\":\{[^}]*\\"raw\\":(-?\d+\.?\d*)/,
          changePercent: /\\"regularMarketChangePercent\\":\{[^}]*\\"raw\\":(-?\d+\.?\d*)/,
          beta: /\\"beta\\":\{[^}]*\\"raw\\":(\d+\.?\d*)/,
          fiftyTwoWeekHigh: /\\"fiftyTwoWeekHigh\\":\{[^}]*\\"raw\\":(\d+\.?\d*)/,
          fiftyTwoWeekLow: /\\"fiftyTwoWeekLow\\":\{[^}]*\\"raw\\":(\d+\.?\d*)/,
          volume: /\\"regularMarketVolume\\":\{[^}]*\\"raw\\":(\d+)/
        };
        
        for (const [metric, pattern] of Object.entries(patterns)) {
          const match = html.match(pattern);
          if (match) {
            metrics[metric] = metric === 'volume' ? parseInt(match[1]) : parseFloat(match[1]);
          }
        }
        
        // Calculate relative position in 52-week range as a proxy for trend
        if (metrics.price && metrics.fiftyTwoWeekHigh && metrics.fiftyTwoWeekLow) {
          metrics.relativePosition = (metrics.price - metrics.fiftyTwoWeekLow) / 
                                   (metrics.fiftyTwoWeekHigh - metrics.fiftyTwoWeekLow);
        }
        
        priceData[symbol] = metrics;
        
        await new Promise(resolve => setTimeout(resolve, 300));
        
      } catch (error) {
      }
    }
    
    // Calculate simplified correlations based on available metrics
    const validSymbols = Object.keys(priceData);
    
    for (let i = 0; i < validSymbols.length; i++) {
      const symbol1 = validSymbols[i];
      correlationMatrix[symbol1] = {};
      
      for (let j = 0; j < validSymbols.length; j++) {
        const symbol2 = validSymbols[j];
        
        if (i === j) {
          correlationMatrix[symbol1][symbol2] = 1.0; // Perfect correlation with itself
        } else {
          // Simplified correlation based on beta, sector similarity, and relative positioning
          const data1 = priceData[symbol1];
          const data2 = priceData[symbol2];
          
          let correlation = 0.1; // Base correlation
          
          // Beta similarity contributes to correlation
          if (data1.beta && data2.beta) {
            const betaDiff = Math.abs(data1.beta - data2.beta);
            correlation += Math.max(0, (2 - betaDiff) / 2) * 0.3;
          }
          
          // Performance similarity (change percent)
          if (data1.changePercent !== undefined && data2.changePercent !== undefined) {
            const perfDiff = Math.abs(data1.changePercent - data2.changePercent);
            correlation += Math.max(0, (10 - perfDiff) / 10) * 0.3;
          }
          
          // Position in range similarity
          if (data1.relativePosition && data2.relativePosition) {
            const posDiff = Math.abs(data1.relativePosition - data2.relativePosition);
            correlation += Math.max(0, (1 - posDiff)) * 0.2;
          }
          
          // Cap correlation between -0.5 and 0.95
          correlation = Math.min(0.95, Math.max(-0.5, correlation));
          correlationMatrix[symbol1][symbol2] = Math.round(correlation * 1000) / 1000;
        }
      }
    }
    
    if (Object.keys(correlationMatrix).length > 0) {
      return {
        symbols: validSymbols,
        priceData,
        correlationMatrix,
        analysisDate: new Date().toISOString().split('T')[0]
      };
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Convert correlation data to standardized rows
 */
function toCorrelationRows(correlationData) {
  if (!correlationData || !correlationData.correlationMatrix) {
    return [];
  }

  const rows = [];
  const symbols = correlationData.symbols;

  symbols.forEach(symbol1 => {
    symbols.forEach(symbol2 => {
      if (symbol1 !== symbol2) { // Skip self-correlation
        rows.push({
          symbol_1: symbol1,
          symbol_2: symbol2,
          correlation: correlationData.correlationMatrix[symbol1][symbol2],
          symbol_1_price: correlationData.priceData[symbol1]?.price || null,
          symbol_2_price: correlationData.priceData[symbol2]?.price || null,
          symbol_1_change_percent: correlationData.priceData[symbol1]?.changePercent || null,
          symbol_2_change_percent: correlationData.priceData[symbol2]?.changePercent || null,
          analysis_date: correlationData.analysisDate
        });
      }
    });
  });

  return rows;
}

/**
 * Convert correlation analysis to markdown
 */
function correlationAsMarkdown(rows, correlationData) {
  if (!rows || rows.length === 0) {
    return '# Stock Correlation Analysis\n\nNo correlation data available.';
  }

  const symbols = correlationData.symbols;
  const matrix = correlationData.correlationMatrix;

  const parts = [
    '# Stock Correlation Analysis',
    '',
    `**Symbols Analyzed:** ${symbols.join(', ')}`,
    `**Analysis Date:** ${new Date().toLocaleDateString()}`,
    '',
    '## Correlation Matrix',
    ''
  ];

  // Create correlation matrix table
  const headerRow = ['Symbol', ...symbols].join(' | ');
  const separatorRow = Array(symbols.length + 1).fill('---').join(' | ');
  
  parts.push(`| ${headerRow} |`);
  parts.push(`| ${separatorRow} |`);

  symbols.forEach(symbol1 => {
    const row = [symbol1];
    symbols.forEach(symbol2 => {
      const corr = matrix[symbol1][symbol2];
      const coloredCorr = corr > 0.7 ? `🔴 ${corr.toFixed(3)}` : 
                         corr > 0.3 ? `🟡 ${corr.toFixed(3)}` :
                         `🟢 ${corr.toFixed(3)}`;
      row.push(coloredCorr);
    });
    parts.push(`| ${row.join(' | ')} |`);
  });

  parts.push('');
  parts.push('## Current Performance');
  parts.push('');
  parts.push('| Symbol | Price | Daily Change | Beta | Position in 52W Range |');
  parts.push('|--------|-------|--------------|------|----------------------|');

  symbols.forEach(symbol => {
    const data = correlationData.priceData[symbol];
    const price = data?.price ? `$${data.price.toFixed(2)}` : 'N/A';
    const change = data?.changePercent ? `${data.changePercent > 0 ? '+' : ''}${data.changePercent.toFixed(2)}%` : 'N/A';
    const beta = data?.beta ? data.beta.toFixed(2) : 'N/A';
    const position = data?.relativePosition ? `${(data.relativePosition * 100).toFixed(1)}%` : 'N/A';
    
    parts.push(`| **${symbol}** | ${price} | ${change} | ${beta} | ${position} |`);
  });

  // Add correlation insights
  parts.push('');
  parts.push('## Portfolio Insights');
  
  // Find highest and lowest correlations
  const correlations = [];
  symbols.forEach(s1 => {
    symbols.forEach(s2 => {
      if (s1 < s2) { // Avoid duplicates
        correlations.push({
          pair: `${s1}-${s2}`,
          correlation: matrix[s1][s2]
        });
      }
    });
  });

  correlations.sort((a, b) => b.correlation - a.correlation);
  
  if (correlations.length > 0) {
    const highest = correlations[0];
    const lowest = correlations[correlations.length - 1];
    
    parts.push(`**Highest Correlation:** ${highest.pair} (${highest.correlation.toFixed(3)})`);
    parts.push(`**Lowest Correlation:** ${lowest.pair} (${lowest.correlation.toFixed(3)})`);
    
    const avgCorrelation = correlations.reduce((sum, c) => sum + c.correlation, 0) / correlations.length;
    parts.push(`**Average Correlation:** ${avgCorrelation.toFixed(3)}`);
    
    if (avgCorrelation > 0.7) {
      parts.push('');
      parts.push('⚠️ **High Portfolio Correlation** - Consider diversifying into uncorrelated assets');
    } else if (avgCorrelation < 0.3) {
      parts.push('');
      parts.push('✅ **Well Diversified Portfolio** - Low correlation between holdings');
    }
  }

  parts.push('');
  parts.push('---');
  parts.push('*Correlation ranges from -1 (perfect negative) to +1 (perfect positive)*');
  parts.push('*🟢 Low correlation (<0.3) | 🟡 Moderate (0.3-0.7) | 🔴 High (>0.7)*');

  return parts.join('\n');
}

async function fetchStockCorrelation({ symbols = [] }) {
  try {
    
    if (symbols.length < 2) {
      throw new Error('Need at least 2 symbols for correlation analysis');
    }
    
    const correlationData = await extractStockCorrelationData({ symbols });
    
    if (!correlationData) {
      throw new Error('Could not extract correlation data');
    }
    
    const rows = toCorrelationRows(correlationData);
    const markdown = correlationAsMarkdown(rows, correlationData);
    
    return { rows, markdown };
    
  } catch (error) {
    throw error;
  }
}

/**
 * Extract FRED data sources for transparency and quality assessment
 * @param {Object} params - Parameters for source data
 * @returns {Promise<Object>} Sources data
 */
async function extractFredSources({ sourceId = null, limit = 20 }) {
  try {
    const apiKey = process.env.FRED_API_KEY;
    if (!apiKey || apiKey === 'demo') {
      throw new Error('Valid FRED API key required for sources data. Please set FRED_API_KEY environment variable.');
    }

    const baseUrl = sourceId ? 
      'https://api.stlouisfed.org/fred/source' :
      'https://api.stlouisfed.org/fred/sources';
    
    const params = new URLSearchParams({
      api_key: apiKey,
      file_type: 'json',
      sort_order: 'asc',
      order_by: 'name'
    });

    if (sourceId) {
      params.append('source_id', sourceId);
    } else {
      params.append('limit', limit.toString());
    }

    const url = `${baseUrl}?${params.toString()}`;

    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Yahoo-Finance-MCP/1.0)'
      }
    });

    if (response.data && response.data.sources && response.data.sources.length > 0) {
      const sources = response.data.sources.map(source => ({
        id: source.id,
        name: source.name,
        realtime_start: source.realtime_start,
        realtime_end: source.realtime_end,
        link: source.link || 'N/A',
        notes: source.notes ? source.notes.substring(0, 300) + '...' : 'No description available'
      }));

      // For each source, try to get sample releases
      const sourcesWithReleases = await Promise.all(
        sources.slice(0, 5).map(async (source) => {
          try {
            const releasesUrl = `https://api.stlouisfed.org/fred/source/releases?source_id=${source.id}&api_key=${apiKey}&file_type=json&limit=3`;

            const releasesResponse = await axios.get(releasesUrl, {
              timeout: 8000,
              headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; Yahoo-Finance-MCP/1.0)'
              }
            });

            if (releasesResponse.data && releasesResponse.data.releases) {
              source.sample_releases = releasesResponse.data.releases.slice(0, 3).map(rel => ({
                id: rel.id,
                name: rel.name,
                press_release: rel.press_release
              }));
            }

            await new Promise(resolve => setTimeout(resolve, 200)); // Rate limiting

          } catch (releasesError) {
            source.sample_releases = [];
          }

          return source;
        })
      );

      return {
        sourceId,
        sources: sourcesWithReleases.concat(sources.slice(5)),
        totalSources: response.data.count || sources.length
      };
    }

    return null;
  } catch (error) {
    throw error;
  }
}

/**
 * Convert FRED sources data to structured rows
 */
function toFredSourcesRows(sourcesData) {
  if (!sourcesData || !sourcesData.sources) return [];

  return sourcesData.sources.map(source => ({
    source_id: source.id,
    source_name: source.name,
    website_link: source.link,
    description: source.notes,
    realtime_start: source.realtime_start,
    realtime_end: source.realtime_end,
    sample_releases: source.sample_releases || [],
    total_releases: source.sample_releases ? source.sample_releases.length : 0,
    search_date: new Date().toISOString().split('T')[0]
  }));
}

/**
 * Convert FRED sources to markdown format
 */
function fredSourcesAsMarkdown(rows) {
  if (!rows || rows.length === 0) {
    return '# FRED Economic Data Sources\n\nNo sources data available.';
  }

  const parts = [
    '# FRED Economic Data Sources',
    '',
    '## Data Quality & Transparency',
    'Understanding data sources is crucial for economic analysis reliability and credibility.',
    ''
  ];

  // Add summary table
  parts.push('| Source | Description | Sample Releases | Website |');
  parts.push('|--------|-------------|-----------------|---------|');

  rows.forEach(source => {
    const releases = source.sample_releases.length > 0 ? 
      source.sample_releases.map(r => r.name).join(', ') : 'No recent releases';
    const link = source.website_link !== 'N/A' ? `[Visit](${source.website_link})` : 'N/A';
    
    parts.push(`| **${source.source_name}** | ${source.description.substring(0, 100)}... | ${releases.substring(0, 80)}... | ${link} |`);
  });

  parts.push('');
  parts.push('## Source Details');
  parts.push('');

  rows.forEach((source, index) => {
    parts.push(`### ${index + 1}. ${source.source_name}`);
    parts.push(`**Source ID:** ${source.source_id}`);
    parts.push(`**Description:** ${source.description}`);
    
    if (source.website_link !== 'N/A') {
      parts.push(`**Website:** [${source.website_link}](${source.website_link})`);
    }
    
    if (source.sample_releases && source.sample_releases.length > 0) {
      parts.push('**Recent Releases:**');
      source.sample_releases.forEach(release => {
        const pressIcon = release.press_release ? '📰' : '📊';
        parts.push(`• ${pressIcon} ${release.name} (ID: ${release.id})`);
      });
    }
    
    parts.push('');
  });

  parts.push('---');
  parts.push(`*Data quality transparency from ${rows.length} economic data sources*`);

  return parts.join('\n');
}

/**
 * Fetch FRED sources data
 */
async function fetchFredSources({ sourceId = null, limit = 20 }) {
  try {
    const sourcesData = await extractFredSources({ sourceId, limit });

    if (!sourcesData) {
      throw new Error('No FRED sources data available');
    }

    const rows = toFredSourcesRows(sourcesData);
    const markdown = fredSourcesAsMarkdown(rows);

    return {
      rows,
      markdown,
      summary: {
        totalSources: sourcesData.totalSources,
        sourceId: sourcesData.sourceId,
        searchDate: new Date().toISOString().split('T')[0]
      }
    };
  } catch (error) {
    throw new Error(`FRED sources fetch failed: ${error.message}`);
  }
}

/**
 * Extract FRED series updates for real-time monitoring
 * @param {Object} params - Parameters for series updates
 * @returns {Promise<Object>} Series updates data
 */
async function extractFredSeriesUpdates({ limit = 20, startTime = null, endTime = null }) {
  try {
    const apiKey = process.env.FRED_API_KEY;
    if (!apiKey || apiKey === 'demo') {
      throw new Error('Valid FRED API key required for series updates. Please set FRED_API_KEY environment variable.');
    }

    const baseUrl = 'https://api.stlouisfed.org/fred/series/updates';
    const params = new URLSearchParams({
      api_key: apiKey,
      file_type: 'json',
      limit: limit.toString(),
      sort_order: 'desc'
    });

    if (startTime) {
      params.append('start_time', startTime);
    }
    if (endTime) {
      params.append('end_time', endTime);
    }

    const url = `${baseUrl}?${params.toString()}`;

    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Yahoo-Finance-MCP/1.0)'
      }
    });

    if (response.data && response.data.seriess && response.data.seriess.length > 0) {
      const updates = response.data.seriess.map(series => ({
        id: series.id,
        title: series.title,
        units: series.units || 'Unknown',
        frequency: series.frequency || 'Unknown',
        seasonal_adjustment: series.seasonal_adjustment || 'Unknown',
        last_updated: series.last_updated,
        observation_start: series.observation_start,
        observation_end: series.observation_end,
        notes: series.notes ? series.notes.substring(0, 200) + '...' : 'No description available',
        popularity: series.popularity || 0
      }));

      // Get latest data points for top updated series
      const updatesWithData = await Promise.all(
        updates.slice(0, 5).map(async (series) => {
          try {
            const dataUrl = `https://api.stlouisfed.org/fred/series/observations?series_id=${series.id}&api_key=${apiKey}&file_type=json&limit=3&sort_order=desc`;

            const dataResponse = await axios.get(dataUrl, {
              timeout: 8000,
              headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; Yahoo-Finance-MCP/1.0)'
              }
            });

            if (dataResponse.data && dataResponse.data.observations && dataResponse.data.observations.length > 0) {
              const validObs = dataResponse.data.observations.filter(obs => obs.value !== '.' && obs.value !== null);
              if (validObs.length > 0) {
                const latest = validObs[0];
                series.latest_value = parseFloat(latest.value);
                series.latest_date = latest.date;
                
                // Calculate change if we have multiple observations
                if (validObs.length > 1) {
                  const previous = validObs[1];
                  const previousValue = parseFloat(previous.value);
                  if (!isNaN(previousValue) && previousValue !== 0) {
                    series.change_percent = ((series.latest_value - previousValue) / previousValue) * 100;
                  }
                }
              }
            }

            await new Promise(resolve => setTimeout(resolve, 200)); // Rate limiting

          } catch (dataError) {
            // Data fetch failed - continue without latest values
          }

          return series;
        })
      );

      return {
        updates: updatesWithData.concat(updates.slice(5)),
        totalUpdates: response.data.count || updates.length,
        timeRange: {
          startTime: startTime || 'Not specified',
          endTime: endTime || 'Not specified'
        }
      };
    }

    return null;
  } catch (error) {
    throw error;
  }
}

/**
 * Convert FRED series updates to structured rows
 */
function toFredUpdatesRows(updatesData) {
  if (!updatesData || !updatesData.updates) return [];

  return updatesData.updates.map(series => ({
    series_id: series.id,
    series_title: series.title,
    frequency: series.frequency,
    units: series.units,
    last_updated: series.last_updated,
    latest_value: series.latest_value || null,
    latest_date: series.latest_date || null,
    change_percent: series.change_percent || null,
    observation_start: series.observation_start,
    observation_end: series.observation_end,
    seasonal_adjustment: series.seasonal_adjustment,
    popularity: series.popularity,
    description: series.notes,
    update_date: new Date().toISOString().split('T')[0]
  }));
}

/**
 * Convert FRED updates to markdown format
 */
function fredUpdatesAsMarkdown(rows) {
  if (!rows || rows.length === 0) {
    return '# FRED Economic Data Updates\n\nNo recent updates available.';
  }

  const parts = [
    '# FRED Economic Data Updates',
    '',
    '## Real-Time Economic Monitoring',
    'Recently updated economic indicators for timely analysis and decision-making.',
    ''
  ];

  // Add summary of update activity
  const totalUpdates = rows.length;
  const withData = rows.filter(r => r.latest_value !== null).length;
  const frequencies = {};
  rows.forEach(r => {
    frequencies[r.frequency] = (frequencies[r.frequency] || 0) + 1;
  });

  parts.push('## Update Summary');
  parts.push(`**Total Series Updated:** ${totalUpdates}`);
  parts.push(`**With Latest Data:** ${withData}`);
  parts.push(`**Update Frequencies:** ${Object.entries(frequencies).map(([freq, count]) => `${freq} (${count})`).join(', ')}`);
  parts.push('');

  // Add updates table
  parts.push('| Series | Latest Value | Change | Last Updated | Frequency |');
  parts.push('|--------|-------------|---------|--------------|-----------|');

  rows.forEach(series => {
    const value = series.latest_value !== null ? 
      `${series.latest_value.toLocaleString()} ${series.units}` : 'N/A';
    const change = series.change_percent !== null ? 
      `${series.change_percent > 0 ? '+' : ''}${series.change_percent.toFixed(2)}%` : 'N/A';
    const changeColor = series.change_percent > 0 ? '📈' : series.change_percent < 0 ? '📉' : '';
    
    parts.push(`| **${series.series_title}** | ${value} | ${changeColor} ${change} | ${series.last_updated} | ${series.frequency} |`);
  });

  parts.push('');
  parts.push('## Recent Updates Details');
  parts.push('');

  rows.slice(0, 10).forEach((series, index) => {
    parts.push(`### ${index + 1}. ${series.series_title}`);
    parts.push(`**Series ID:** ${series.series_id}`);
    parts.push(`**Description:** ${series.description}`);
    parts.push(`**Frequency:** ${series.frequency} | **Units:** ${series.units}`);
    
    if (series.latest_value !== null) {
      parts.push(`**Latest Value:** ${series.latest_value.toLocaleString()} (${series.latest_date})`);
      
      if (series.change_percent !== null) {
        const trend = series.change_percent > 0 ? 'increasing' : 'decreasing';
        parts.push(`**Recent Change:** ${Math.abs(series.change_percent).toFixed(2)}% ${trend}`);
      }
    }
    
    parts.push(`**Data Range:** ${series.observation_start} to ${series.observation_end}`);
    parts.push(`**Last Updated:** ${series.last_updated}`);
    parts.push('');
  });

  parts.push('---');
  parts.push(`*Real-time monitoring of ${totalUpdates} recently updated economic indicators*`);

  return parts.join('\n');
}

/**
 * Fetch FRED series updates
 */
async function fetchFredSeriesUpdates({ limit = 20, startTime = null, endTime = null }) {
  try {
    const updatesData = await extractFredSeriesUpdates({ limit, startTime, endTime });

    if (!updatesData) {
      throw new Error('No FRED series updates data available');
    }

    const rows = toFredUpdatesRows(updatesData);
    const markdown = fredUpdatesAsMarkdown(rows);

    return {
      rows,
      markdown,
      summary: {
        totalUpdates: updatesData.totalUpdates,
        timeRange: updatesData.timeRange,
        updateDate: new Date().toISOString().split('T')[0]
      }
    };
  } catch (error) {
    throw new Error(`FRED series updates fetch failed: ${error.message}`);
  }
}

/**
 * Extract FRED series relationships and metadata
 * @param {Object} params - Parameters for series relationships
 * @returns {Promise<Object>} Series relationships data
 */
async function extractFredSeriesRelationships({ seriesId }) {
  try {
    const apiKey = process.env.FRED_API_KEY;
    if (!apiKey || apiKey === 'demo') {
      throw new Error('Valid FRED API key required for series relationships. Please set FRED_API_KEY environment variable.');
    }

    // Get series basic info
    const seriesUrl = `https://api.stlouisfed.org/fred/series?series_id=${seriesId}&api_key=${apiKey}&file_type=json`;
    
    const seriesResponse = await axios.get(seriesUrl, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Yahoo-Finance-MCP/1.0)'
      }
    });

    if (!seriesResponse.data || !seriesResponse.data.seriess || seriesResponse.data.seriess.length === 0) {
      throw new Error(`Series ${seriesId} not found`);
    }

    const series = seriesResponse.data.seriess[0];
    const relationships = {
      series: {
        id: series.id,
        title: series.title,
        units: series.units || 'Unknown',
        frequency: series.frequency || 'Unknown',
        seasonal_adjustment: series.seasonal_adjustment || 'Unknown',
        observation_start: series.observation_start,
        observation_end: series.observation_end,
        last_updated: series.last_updated,
        notes: series.notes || 'No description available'
      },
      categories: [],
      release: null,
      tags: [],
      source: null
    };

    // Get series categories
    try {
      const categoriesUrl = `https://api.stlouisfed.org/fred/series/categories?series_id=${seriesId}&api_key=${apiKey}&file_type=json`;
      const categoriesResponse = await axios.get(categoriesUrl, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Yahoo-Finance-MCP/1.0)'
        }
      });

      if (categoriesResponse.data && categoriesResponse.data.categories) {
        relationships.categories = categoriesResponse.data.categories.map(cat => ({
          id: cat.id,
          name: cat.name,
          parent_id: cat.parent_id
        }));
      }
    } catch (catError) {
      // Categories fetch failed - continue
    }

    await new Promise(resolve => setTimeout(resolve, 200));

    // Get series release
    try {
      const releaseUrl = `https://api.stlouisfed.org/fred/series/release?series_id=${seriesId}&api_key=${apiKey}&file_type=json`;
      const releaseResponse = await axios.get(releaseUrl, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Yahoo-Finance-MCP/1.0)'
        }
      });

      if (releaseResponse.data && releaseResponse.data.releases && releaseResponse.data.releases.length > 0) {
        const release = releaseResponse.data.releases[0];
        relationships.release = {
          id: release.id,
          name: release.name,
          press_release: release.press_release,
          link: release.link
        };
      }
    } catch (relError) {
      // Release fetch failed - continue
    }

    await new Promise(resolve => setTimeout(resolve, 200));

    // Get series tags
    try {
      const tagsUrl = `https://api.stlouisfed.org/fred/series/tags?series_id=${seriesId}&api_key=${apiKey}&file_type=json&limit=20`;
      const tagsResponse = await axios.get(tagsUrl, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Yahoo-Finance-MCP/1.0)'
        }
      });

      if (tagsResponse.data && tagsResponse.data.tags) {
        relationships.tags = tagsResponse.data.tags.map(tag => ({
          name: tag.name,
          group_id: tag.group_id,
          notes: tag.notes || '',
          created: tag.created,
          popularity: tag.popularity || 0
        }));
      }
    } catch (tagsError) {
      // Tags fetch failed - continue
    }

    return relationships;
  } catch (error) {
    throw error;
  }
}

/**
 * Convert FRED series relationships to structured rows
 */
function toFredRelationshipsRows(relationshipsData) {
  if (!relationshipsData) return [];

  const series = relationshipsData.series;
  const baseRow = {
    series_id: series.id,
    series_title: series.title,
    units: series.units,
    frequency: series.frequency,
    seasonal_adjustment: series.seasonal_adjustment,
    observation_start: series.observation_start,
    observation_end: series.observation_end,
    last_updated: series.last_updated,
    description: series.notes,
    analysis_date: new Date().toISOString().split('T')[0]
  };

  // Add relationship data
  baseRow.categories = relationshipsData.categories.map(cat => ({
    id: cat.id,
    name: cat.name,
    parent_id: cat.parent_id
  }));

  baseRow.release_info = relationshipsData.release ? {
    id: relationshipsData.release.id,
    name: relationshipsData.release.name,
    press_release: relationshipsData.release.press_release,
    link: relationshipsData.release.link
  } : null;

  baseRow.tags = relationshipsData.tags.map(tag => ({
    name: tag.name,
    group_id: tag.group_id,
    popularity: tag.popularity,
    notes: tag.notes
  }));

  baseRow.total_categories = relationshipsData.categories.length;
  baseRow.total_tags = relationshipsData.tags.length;
  baseRow.has_release = !!relationshipsData.release;

  return [baseRow];
}

/**
 * Convert FRED relationships to markdown format
 */
function fredRelationshipsAsMarkdown(rows) {
  if (!rows || rows.length === 0) {
    return '# FRED Series Relationships\n\nNo relationship data available.';
  }

  const series = rows[0];
  const parts = [
    `# ${series.series_title}`,
    `**Series ID:** ${series.series_id}`,
    '',
    '## Series Overview',
    `**Description:** ${series.description}`,
    `**Units:** ${series.units}`,
    `**Frequency:** ${series.frequency}`,
    `**Seasonal Adjustment:** ${series.seasonal_adjustment}`,
    `**Data Range:** ${series.observation_start} to ${series.observation_end}`,
    `**Last Updated:** ${series.last_updated}`,
    ''
  ];

  // Add release information
  if (series.release_info) {
    parts.push('## Release Information');
    parts.push(`**Release:** ${series.release_info.name}`);
    parts.push(`**Release ID:** ${series.release_info.id}`);
    parts.push(`**Type:** ${series.release_info.press_release ? 'Press Release' : 'Data Release'}`);
    if (series.release_info.link) {
      parts.push(`**Link:** [View Release](${series.release_info.link})`);
    }
    parts.push('');
  }

  // Add categories
  if (series.categories && series.categories.length > 0) {
    parts.push('## Economic Categories');
    parts.push(`**Total Categories:** ${series.total_categories}`);
    parts.push('');
    parts.push('| Category | ID | Parent |');
    parts.push('|----------|----| -------|');
    
    series.categories.forEach(cat => {
      const parent = cat.parent_id ? cat.parent_id : 'Root';
      parts.push(`| ${cat.name} | ${cat.id} | ${parent} |`);
    });
    parts.push('');
  }

  // Add tags
  if (series.tags && series.tags.length > 0) {
    parts.push('## Economic Concept Tags');
    parts.push(`**Total Tags:** ${series.total_tags}`);
    parts.push('');
    
    // Group tags by popularity
    const popularTags = series.tags.filter(t => t.popularity > 50).sort((a, b) => b.popularity - a.popularity);
    const regularTags = series.tags.filter(t => t.popularity <= 50);
    
    if (popularTags.length > 0) {
      parts.push('### Popular Tags');
      popularTags.forEach(tag => {
        parts.push(`• **${tag.name}** (popularity: ${tag.popularity})`);
        if (tag.notes) {
          parts.push(`  *${tag.notes}*`);
        }
      });
      parts.push('');
    }
    
    if (regularTags.length > 0) {
      parts.push('### Additional Tags');
      const tagNames = regularTags.map(t => t.name).join(', ');
      parts.push(tagNames);
      parts.push('');
    }
  }

  // Add analysis summary
  parts.push('## Relationship Analysis');
  parts.push(`**Data Classification:** ${series.frequency} ${series.units} data`);
  parts.push(`**Category Coverage:** ${series.total_categories} economic categories`);
  parts.push(`**Tag Richness:** ${series.total_tags} concept tags`);
  parts.push(`**Release Integration:** ${series.has_release ? 'Official release available' : 'No specific release'}`);
  
  parts.push('');
  parts.push('---');
  parts.push(`*Deep metadata analysis for series ${series.series_id}*`);

  return parts.join('\n');
}

/**
 * Fetch FRED series relationships
 */
async function fetchFredSeriesRelationships({ seriesId }) {
  try {
    const relationshipsData = await extractFredSeriesRelationships({ seriesId });

    if (!relationshipsData) {
      throw new Error('No FRED series relationships data available');
    }

    const rows = toFredRelationshipsRows(relationshipsData);
    const markdown = fredRelationshipsAsMarkdown(rows);

    return {
      rows,
      markdown,
      summary: {
        seriesId: relationshipsData.series.id,
        totalCategories: relationshipsData.categories.length,
        totalTags: relationshipsData.tags.length,
        hasRelease: !!relationshipsData.release,
        analysisDate: new Date().toISOString().split('T')[0]
      }
    };
  } catch (error) {
    throw new Error(`FRED series relationships fetch failed: ${error.message}`);
  }
}

/**
 * Extract FRED Maps geographic data for visualization
 * @param {Object} params - Parameters for maps data
 * @returns {Promise<Object>} Geographic data
 */
async function extractFredMapsData({ seriesGroup = null, region = 'state', date = null }) {
  try {
    const apiKey = process.env.FRED_API_KEY;
    if (!apiKey || apiKey === 'demo') {
      throw new Error('Valid FRED API key required for maps data. Please set FRED_API_KEY environment variable.');
    }

    // FRED Maps API has limited public access, so we'll use regular API with geographic tags
    // to build geographic economic datasets
    
    let searchTags = '';
    if (region === 'state') {
      searchTags = 'state;regional';
    } else if (region === 'msa') {
      searchTags = 'msa;regional';
    } else if (region === 'county') {
      searchTags = 'county;regional';
    } else {
      searchTags = 'regional';
    }

    // Search for geographic series
    const seriesUrl = `https://api.stlouisfed.org/fred/tags/series?tag_names=${encodeURIComponent(searchTags)}&api_key=${apiKey}&file_type=json&limit=50&order_by=popularity&sort_order=desc`;

    const response = await axios.get(seriesUrl, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Yahoo-Finance-MCP/1.0)'
      }
    });

    if (response.data && response.data.seriess && response.data.seriess.length > 0) {
      const geoSeries = response.data.seriess
        .filter(series => {
          const title = series.title.toLowerCase();
          return title.includes(region) || 
                 (region === 'state' && (title.includes(' in ') || title.includes('state'))) ||
                 (region === 'msa' && title.includes('msa')) ||
                 (region === 'county' && title.includes('county'));
        })
        .slice(0, 20)
        .map(series => ({
          id: series.id,
          title: series.title,
          units: series.units || 'Unknown',
          frequency: series.frequency || 'Unknown',
          observation_start: series.observation_start,
          observation_end: series.observation_end,
          last_updated: series.last_updated,
          popularity: series.popularity || 0,
          notes: series.notes ? series.notes.substring(0, 200) + '...' : 'No description available'
        }));

      // Get latest data for top geographic series
      const seriesWithData = await Promise.all(
        geoSeries.slice(0, 10).map(async (series) => {
          try {
            const dataUrl = `https://api.stlouisfed.org/fred/series/observations?series_id=${series.id}&api_key=${apiKey}&file_type=json&limit=1&sort_order=desc`;

            const dataResponse = await axios.get(dataUrl, {
              timeout: 8000,
              headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; Yahoo-Finance-MCP/1.0)'
              }
            });

            if (dataResponse.data && dataResponse.data.observations && dataResponse.data.observations.length > 0) {
              const validObs = dataResponse.data.observations.filter(obs => obs.value !== '.' && obs.value !== null);
              if (validObs.length > 0) {
                const latest = validObs[0];
                series.latest_value = parseFloat(latest.value);
                series.latest_date = latest.date;
                
                // Extract geographic identifier from title
                series.geographic_area = extractGeographicArea(series.title, region);
              }
            }

            await new Promise(resolve => setTimeout(resolve, 300)); // Rate limiting

          } catch (dataError) {
            // Data fetch failed - continue without latest values
          }

          return series;
        })
      );

      return {
        region: region,
        seriesGroup: seriesGroup,
        series: seriesWithData.concat(geoSeries.slice(10)),
        totalSeries: geoSeries.length,
        requestedDate: date
      };
    }

    return null;
  } catch (error) {
    throw error;
  }
}

/**
 * Extract geographic area from series title
 */
function extractGeographicArea(title, region) {
  if (region === 'state') {
    // Extract state name from patterns like "Unemployment Rate in California"
    const stateMatch = title.match(/\bin\s+([A-Z][a-zA-Z\s]+)$/);
    if (stateMatch) return stateMatch[1].trim();
    
    // Extract from patterns like "California Unemployment Rate"
    const statePrefix = title.match(/^([A-Z][a-zA-Z\s]+?)\s+/);
    if (statePrefix) return statePrefix[1].trim();
  }
  
  if (region === 'msa') {
    // Extract MSA name
    const msaMatch = title.match(/([^,]+),?\s*[A-Z]{2}(-[A-Z]{2})?(\s*MSA)?/);
    if (msaMatch) return msaMatch[1].trim();
  }
  
  return 'Unknown';
}

/**
 * Convert FRED maps data to structured rows
 */
function toFredMapsRows(mapsData) {
  if (!mapsData || !mapsData.series) return [];

  return mapsData.series.map(series => ({
    series_id: series.id,
    series_title: series.title,
    geographic_area: series.geographic_area || 'Unknown',
    region_type: mapsData.region,
    latest_value: series.latest_value || null,
    latest_date: series.latest_date || null,
    units: series.units,
    frequency: series.frequency,
    observation_start: series.observation_start,
    observation_end: series.observation_end,
    last_updated: series.last_updated,
    popularity: series.popularity,
    description: series.notes,
    map_date: new Date().toISOString().split('T')[0]
  }));
}

/**
 * Convert FRED maps to markdown format
 */
function fredMapsAsMarkdown(rows) {
  if (!rows || rows.length === 0) {
    return '# FRED Geographic Economic Data\n\nNo geographic data available.';
  }

  const regionType = rows[0].region_type;
  const parts = [
    `# FRED Geographic Economic Data - ${regionType.toUpperCase()} Level`,
    '',
    '## Geographic Economic Analysis',
    `Analysis of economic indicators across ${regionType} boundaries for spatial economic insights.`,
    ''
  ];

  // Add data summary
  const totalAreas = new Set(rows.map(r => r.geographic_area)).size;
  const withData = rows.filter(r => r.latest_value !== null).length;
  const dataTypes = new Set(rows.map(r => r.series_title.split(' ')[0])).size;

  parts.push('## Geographic Coverage Summary');
  parts.push(`**Region Type:** ${regionType.charAt(0).toUpperCase() + regionType.slice(1)}`);
  parts.push(`**Geographic Areas:** ${totalAreas}`);
  parts.push(`**Series with Data:** ${withData}/${rows.length}`);
  parts.push(`**Data Categories:** ~${dataTypes} types`);
  parts.push('');

  // Add geographic data table
  parts.push('| Geographic Area | Indicator | Latest Value | Date | Frequency |');
  parts.push('|-----------------|-----------|--------------|------|-----------|');

  rows.filter(r => r.latest_value !== null).slice(0, 20).forEach(series => {
    const indicator = series.series_title.length > 40 ? 
      series.series_title.substring(0, 37) + '...' : series.series_title;
    const value = `${series.latest_value.toLocaleString()} ${series.units}`;
    
    parts.push(`| **${series.geographic_area}** | ${indicator} | ${value} | ${series.latest_date} | ${series.frequency} |`);
  });

  parts.push('');
  parts.push('## Available Geographic Series');
  parts.push('');

  // Group by geographic area
  const byArea = {};
  rows.forEach(series => {
    const area = series.geographic_area;
    if (!byArea[area]) byArea[area] = [];
    byArea[area].push(series);
  });

  Object.entries(byArea).slice(0, 10).forEach(([area, seriesList]) => {
    parts.push(`### ${area}`);
    parts.push(`**Available Indicators:** ${seriesList.length}`);
    
    const withDataCount = seriesList.filter(s => s.latest_value !== null).length;
    parts.push(`**With Current Data:** ${withDataCount}/${seriesList.length}`);
    
    if (withDataCount > 0) {
      const latest = seriesList.filter(s => s.latest_value !== null)[0];
      parts.push(`**Sample Data:** ${latest.series_title} = ${latest.latest_value.toLocaleString()} ${latest.units} (${latest.latest_date})`);
    }
    
    parts.push('');
  });

  parts.push('## Data Source Information');
  parts.push('**Geographic Scope:** Federal Reserve Economic Data (FRED)');
  parts.push('**Coverage:** Official statistical boundaries and administrative regions');
  parts.push('**Update Frequency:** Varies by indicator (Monthly, Quarterly, Annual)');
  parts.push('**Data Quality:** Government and institutional sources');
  
  parts.push('');
  parts.push('---');
  parts.push(`*Geographic economic analysis across ${totalAreas} ${regionType} areas*`);

  return parts.join('\n');
}

/**
 * Fetch FRED maps data
 */
async function fetchFredMapsData({ seriesGroup = null, region = 'state', date = null }) {
  try {
    const mapsData = await extractFredMapsData({ seriesGroup, region, date });

    if (!mapsData) {
      throw new Error('No FRED maps data available');
    }

    const rows = toFredMapsRows(mapsData);
    const markdown = fredMapsAsMarkdown(rows);

    return {
      rows,
      markdown,
      summary: {
        region: mapsData.region,
        totalSeries: mapsData.totalSeries,
        seriesGroup: mapsData.seriesGroup,
        requestedDate: mapsData.requestedDate,
        mapDate: new Date().toISOString().split('T')[0]
      }
    };
  } catch (error) {
    throw new Error(`FRED maps data fetch failed: ${error.message}`);
  }
}

module.exports = {
  fetchYahooProfile,
  // fetchYahooOfficers removed - officers data not reliably available
  // fetchYahooOwnership removed - ownership data not available in Yahoo Finance
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
  fetchFredSources, // NEW
  fetchFredSeriesUpdates, // NEW
  fetchFredSeriesRelationships, // NEW
  fetchFredMapsData, // NEW
  fetchMarketIndices,
  fetchStockScreener,
  fetchStockCorrelation,
  fetchYahooEarningsHistory,
  fetchYahooRecommendations,
  fetchYahooESG,
  fetchStockDividends,
  fetchStockTechnicals,
  extractAssetProfile,
  toStockProfileRow,
  rowAsMarkdown
};

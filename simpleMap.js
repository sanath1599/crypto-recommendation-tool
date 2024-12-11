export const symbolToCoinGeckoId = (symbol, name) => {
    const lowerName = name.toLowerCase().replace(/\s+/g, '-');
    if (lowerName.includes('bitcoin')) return 'bitcoin';
    if (lowerName.includes('ethereum')) return 'ethereum';
    if (lowerName.includes('cardano')) return 'cardano';
    if (lowerName.includes('dogecoin')) return 'dogecoin';
    if (lowerName.includes('tron')) return 'tron';
    if (lowerName.includes('solana')) return 'solana';
    if (lowerName.includes('bnb')) return 'binancecoin';
    if (lowerName.includes('xrp')) return 'ripple';
    if (lowerName.includes('usd coin')) return 'usd-coin';
    if (lowerName.includes('tether')) return 'tether';
    
    return lowerName;
  };
  
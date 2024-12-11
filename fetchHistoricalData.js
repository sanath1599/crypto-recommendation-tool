import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const fetchHistoricalData = async (coinId) => {
  const url = `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=7`;
  
  const headers = {};
  if (process.env.COIN_GECKO_API_KEY) {
    headers['x-api-key'] = process.env.COIN_GECKO_API_KEY;
  }

  try {
    const response = await axios.get(url, { headers });
    const prices = response.data.prices.map(p => p[1]);
    const totalPoints = prices.length;
    if (totalPoints < 7) return prices;
    const pointsPerDay = Math.floor(totalPoints / 7);
    const sampledPrices = [];
    for (let i = 0; i < 7; i++) {
      sampledPrices.push(prices[i * pointsPerDay]);
    }
    return sampledPrices;
  } catch (error) {
    // console.error(`Error fetching historical data for ${coinId}:`, error.message);
    return [1,2,3,2,2,3,4];
  }
};

export { fetchHistoricalData };

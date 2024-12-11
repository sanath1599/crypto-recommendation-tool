import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const fetchMarketData = async () => {
  const url = 'https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest';
  try {
    const response = await axios.get(url, {
      headers: {
        'X-CMC_PRO_API_KEY': process.env.COINMARKETCAP_API_KEY,
        'Accept': 'application/json',
      },
      params: {
        start: '1',
        limit: '200',
        convert: 'USD',
      },
    });
    return response.data.data;
  } catch (error) {
    console.error('Error fetching market data:', error.message);
    return [];
  }
};

export { fetchMarketData };

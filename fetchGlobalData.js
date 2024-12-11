import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

export const fetchGlobalData = async () => {
  const url = 'https://api.coingecko.com/api/v3/global';
  const headers = {};
  if (process.env.COIN_GECKO_API_KEY) {
    headers['x-api-key'] = process.env.COIN_GECKO_API_KEY;
  }

  try {
    const res = await axios.get(url, { headers });
    return res.data.data;
  } catch (error) {
    // console.error('Error fetching global market data:', error.message);
    return null;
  }
};

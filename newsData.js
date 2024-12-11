import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const fetchNews = async () => {
  const url = 'https://cryptonews-api.com/api/v1/category';
  try {
    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${process.env.CRYPTO_NEWS_API_KEY}`,
      },
      params: {
        section: 'general',
        sort: 'published',
        items: 50,
      },
    });
    return response.data.data.map((article) => ({
      title: article.title,
      url: article.news_url,
      source: article.source_name,
      published: article.date,
    }));
  } catch (error) {
    // console.error('Error fetching crypto news:', error.message);
    return [];
  }
};

export { fetchNews };

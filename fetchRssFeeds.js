import axios from 'axios';
import { parseStringPromise } from 'xml2js';

const rssFeeds = [
  'https://cointelegraph.com/rss/tag/altcoin',
  'https://cointelegraph.com/rss/category/weekly-overview',
  'https://cointelegraph.com/rss/tag/regulation',
  'https://cointelegraph.com/rss/tag/blockchain',
  'https://cointelegraph.com/rss/category/market-analysis',
  'https://cointelegraph.com/rss/category/top-10-cryptocurrencies'
];

/**
 * Fetches articles from the given RSS feeds.
 * @returns {Promise<Array>} Returns an array of articles {title, link, source, published}.
 */
export async function fetchRssArticles() {
  const articles = [];
  for (let feed of rssFeeds) {
    try {
      const { data } = await axios.get(feed, { headers: { 'User-Agent': 'Mozilla/5.0' }});
      const result = await parseStringPromise(data);
      // Result structure depends on feed, typically result.rss.channel[0].item
      const items = result?.rss?.channel?.[0]?.item || [];
      for (let item of items) {
        const title = item.title?.[0] || 'No title';
        const link = item.link?.[0] || '';
        const source = 'Cointelegraph (RSS)';
        const published = item.pubDate?.[0] || '';
        articles.push({ title, url: link, source, published });
      }
    } catch (error) {
      // Ignore individual feed errors
      console.error(`Error fetching RSS feed ${feed}:`, error.message);
    }
  }
  return articles;
}

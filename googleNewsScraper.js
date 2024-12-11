import axios from 'axios';
import * as cheerio from 'cheerio';

const fetchGoogleNews = async (query) => {
  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query + ' cryptocurrency news')}&tbm=nws`;
  
  try {
    const { data } = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
      },
    });

    const $ = cheerio.load(data);
    const articles = [];
    // Adjust selectors as needed if structure changes
    $('div.dBsHwf > div.Gx5Zad.fP1Qef.xpd.EtOod.pkphOe > div > a').each((i, el) => {
      const title = $(el).find('div.mCBkyc.JQe2Ld.nDgy9d').text();
      const link = $(el).attr('href');
      const source = $(el).find('div.CEMjEf.NUnG9d span.xQ82C.e8fRJf').first().text() || 'Unknown';
      if (title) {
        articles.push({ title, link, source });
      }
    });

    return articles;
  } catch (error) {
    console.error(`Error scraping Google news for ${query}:`, error.message);
    return [];
  }
};

export { fetchGoogleNews };

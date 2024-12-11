import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

/**
 * Analyzes sentiment of each article's title by sending a prompt to the Llama API.
 * Returns an array of {title, sentiment}.
 */
export async function analyzeSentiment(articles) {
  const results = [];

  for (let article of articles) {
    const prompt = `Classify the sentiment of the following news title as Positive, Negative, or Neutral:\n"${article.title}"\nAnswer with one word: Positive, Negative, or Neutral.`;

    try {
      const response = await axios.post('http://localhost:11434/api/generate', {
        model: process.env.LLAMA_MODEL,
        prompt,
        stream: false
      }, {
        headers: { 'Content-Type': 'application/json' }
      });

      const data = response.data;
      if (data?.response) {
        const sentimentResponse = data.response.trim().toLowerCase();
        let sentiment = 'Neutral';
        if (sentimentResponse.includes('positive')) sentiment = 'Positive';
        else if (sentimentResponse.includes('negative')) sentiment = 'Negative';
        results.push({ title: article.title, sentiment });
      } else {
        // fallback if response not as expected
        results.push({ title: article.title, sentiment: 'Neutral' });
      }

    } catch (error) {
      console.error('Error analyzing sentiment:', error.message);
      // If error occurs, just push Neutral as fallback
      results.push({ title: article.title, sentiment: 'Neutral' });
    }
  }

  return results;
}

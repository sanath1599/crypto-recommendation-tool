import { llamaApiCall } from './llamaApi.js';

const predictWithLlama = async (inputData) => {
  const { name, symbol, price, change24h, historicalData, sentimentSummary, newsSummary, globalContext } = inputData;

  const prompt = `
    You are a comprehensive cryptocurrency trading assistant tasked with providing detailed recommendations. 
    Consider all provided data: market conditions, sentiment, historical prices, macro factors, user risk tolerance, and summarized news.

    Data Provided:
    - Cryptocurrency Name: ${name} (${symbol})
    - Current Price: $${price.toFixed(2)}
    - 24h Price Change: ${change24h.toFixed(2)}%
    - Historical Data: ${JSON.stringify(historicalData)}
    - Sentiment Summary: ${sentimentSummary}
    - Aggregated News Summary: ${newsSummary}
    - Additional Context: ${globalContext}

    Weigh short-term sentiment, 7-day price trends, macro conditions, and the user's risk tolerance.
    Provide a well-justified reasoning.

    Respond in JSON:
    {
      "recommendation": "Buy | Sell | Hold",
      "reasoning": "Detailed explanation",
      "confidence": 0.0 to 1.0
    }
  `;

  const format = {
    type: 'object',
    properties: {
      recommendation: { type: 'string' },
      reasoning: { type: 'string' },
      confidence: { type: 'number' },
    },
    required: ['recommendation', 'reasoning', 'confidence'],
  };

  return await llamaApiCall(prompt, format);
};

export { predictWithLlama };

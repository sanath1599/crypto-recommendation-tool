import { fetchMarketData } from './marketData.js';
import { fetchNews } from './newsData.js';
import { fetchGoogleNews } from './googleNewsScraper.js';
import { fetchRssArticles } from './fetchRssFeeds.js';
import { analyzeSentiment } from './sentimentAnalysis.js';
import { predictWithLlama } from './predictWithLlama.js';
import { fetchHistoricalData } from './fetchHistoricalData.js';
import { symbolToCoinGeckoId } from './simpleMap.js';
import { fetchGlobalData } from './fetchGlobalData.js';
import { llamaApiCall } from './llamaApi.js';

import dotenv from 'dotenv';
import inquirer from 'inquirer';
import axios from 'axios';
import * as cheerio from 'cheerio';
import asciichart from 'asciichart';
import chalk from 'chalk';
import fs from 'fs';
import blessed from 'blessed';

dotenv.config();

const RESULTS_FILE = './results.json';
const ERROR_LOG_FILE = './error.log';
const ARTICLES_FILE = './articles.json';
const MAX_COINS = 5;
let userSelectedTokens = [];
let userRiskTolerance = 'Medium';
const spinnerChars = ['|', '/', '-', '\\'];

if (!fs.existsSync(ARTICLES_FILE)) {
  fs.writeFileSync(ARTICLES_FILE, '[]');
}

async function askUserForInputsInCLI() {
  const { tokens } = await inquirer.prompt([
    {
      type: 'input',
      name: 'tokens',
      message: 'Enter comma-separated tokens to follow (e.g., BTC,ETH). Leave blank for top 50 by market cap:',
      default: '',
    },
  ]);

  userSelectedTokens = tokens
    .split(',')
    .map(t => t.trim().toUpperCase())
    .filter(t => t.length > 0);

  const { risk } = await inquirer.prompt([
    {
      type: 'list',
      name: 'risk',
      message: 'Select your risk tolerance:',
      choices: ['Low', 'Medium', 'High'],
      default: 'Medium',
    },
  ]);

  userRiskTolerance = risk;
}

async function fetchArticleContent(url) {
  if (!url || !url.startsWith('http')) return null;
  try {
    const { data } = await axios.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const $ = cheerio.load(data);
    let paragraphs = $('p').map((i, el) => $(el).text().trim()).get();
    paragraphs = paragraphs.filter(p => p.length > 30).slice(0, 50);
    const fullText = paragraphs.join('\n\n');
    return fullText.length > 0 ? fullText : null;
  } catch {
    return null;
  }
}

async function summarizeArticle(article) {
  const fullContent = await fetchArticleContent(article.url || article.link);
  let contentToSummarize = fullContent 
    ? `Full Article Text:\n${fullContent}`
    : `Title: ${article.title}\nSource: ${article.source || 'Unknown'}\nNo full article text available.`;

  const prompt = `
  You are a skilled analyst. Summarize the following crypto-related news article in 2-3 sentences.
  Focus on key points that might impact cryptocurrency markets.

  ${contentToSummarize}

  Respond in JSON:
  {
    "summary": "string"
  }
  `;
  
  const format = { type: 'object', properties: { summary: { type: 'string' } }, required: ['summary'] };
  const summaryResponse = await llamaApiCall(prompt, format);
  const summary = summaryResponse.summary || 'No significant summary provided.';

  // Store article content and summary
  const existing = JSON.parse(fs.readFileSync(ARTICLES_FILE, 'utf-8'));
  existing.push({
    title: article.title,
    url: article.url || article.link,
    fullContent: fullContent || 'No full article text available',
    summary
  });
  fs.writeFileSync(ARTICLES_FILE, JSON.stringify(existing, null, 2));

  return summary;
}

async function combineSummaries(summaries) {
  if (summaries.length === 0) return "No significant news found.";
  if (summaries.length === 1) return summaries[0];

  const prompt = `
  Combine the following news article summaries into one coherent, concise summary focusing on key market impacts:
  ${summaries.map((s,i) => `Article ${i+1}: ${s}`).join('\n')}

  Respond in JSON:
  {
    "aggregated_summary": "string"
  }
  `;
  const format = { type: 'object', properties: { aggregated_summary: { type: 'string' } }, required: ['aggregated_summary'] };
  const combinedResponse = await llamaApiCall(prompt, format);
  return combinedResponse.aggregated_summary || "No significant news found.";
}

function highlightImportantWords(text) {
  return text.replace(/\b(important|critical)\b/gi, match => chalk.bold(match));
}

function getAnalyzedCoins(marketData) {
  const topMarket = marketData.slice(0, 200);
  const tokenSet = new Set(userSelectedTokens);
  let selected = [];

  if (userSelectedTokens.length > 0) {
    for (let coin of topMarket) {
      if (selected.length >= MAX_COINS) break;
      if (tokenSet.has(coin.symbol.toUpperCase())) selected.push(coin);
    }
    if (selected.length < MAX_COINS) {
      for (let coin of topMarket) {
        if (selected.length >= MAX_COINS) break;
        if (!tokenSet.has(coin.symbol.toUpperCase())) {
          selected.push(coin);
        }
      }
    }
  } else {
    selected = topMarket.slice(0, MAX_COINS);
  }

  return selected;
}

async function analyzeCoinsWithUI(coins, allSources, globalData, loadingBox, screen) {
  const { cryptoNews, rssArticles } = allSources;
  let results = [];

  let spinnerIndex = 0;
  let processedCoins = 0;
  const totalCoins = coins.length;
  const progressBarWidth = 20; // textual progress bar length

  // Timers
  let totalArticlesProcessed = 0;
  let totalCoinTime = 0;

  const updateLoading = (msg, coinStart) => {
    spinnerIndex = (spinnerIndex + 1) % spinnerChars.length;
    // Show a progress bar: processedCoins/totalCoins
    const progress = processedCoins / totalCoins;
    const filled = Math.floor(progress * progressBarWidth);
    const bar = '[' + '#'.repeat(filled) + '-'.repeat(progressBarWidth - filled) + ']';
    if (coinStart) {
      loadingBox.setContent(`${spinnerChars[spinnerIndex]} ${msg}\n${bar} ${processedCoins}/${totalCoins} coins`);
    } else {
      loadingBox.setContent(`${spinnerChars[spinnerIndex]} ${msg}\n${bar} ${processedCoins}/${totalCoins} coins`);
    }
    screen.render();
  };

  const totalStart = Date.now();

  for (let i = 0; i < coins.length; i++) {
    const coin = coins[i];
    const coinStart = Date.now();
    updateLoading(`Analyzing ${coin.name} (${coin.symbol})...`, true);

    const googleNews = await fetchGoogleNews(coin.name);
    const combinedNews = [...cryptoNews, ...rssArticles, ...googleNews];
    const topArticles = combinedNews.slice(0, 10);

    totalArticlesProcessed += topArticles.length;

    const sentimentResults = topArticles.length > 0 ? await analyzeSentiment(topArticles) : [];
    const positiveCount = sentimentResults.filter(r => r.sentiment === 'Positive').length;
    const negativeCount = sentimentResults.filter(r => r.sentiment === 'Negative').length;
    const sentimentSummary = `Positive Articles: ${positiveCount}, Negative Articles: ${negativeCount}`;

    let aggregatedNewsSummary = "No significant news found.";
    if (topArticles.length > 0) {
      updateLoading(`Summarizing news for ${coin.symbol}...`);
      const individualSummaries = [];
      for (let article of topArticles) {
        const summary = await summarizeArticle(article);
        individualSummaries.push(summary);
      }
      aggregatedNewsSummary = await combineSummaries(individualSummaries);
    }

    updateLoading(`Fetching historical data for ${coin.symbol}...`);
    const geckoId = symbolToCoinGeckoId(coin.symbol, coin.name);
    const historicalPrices = await fetchHistoricalData(geckoId);

    const globalContext = globalData ? `
    Global Market Cap (USD): ${globalData.total_market_cap.usd}
    Bitcoin Dominance: ${globalData.market_cap_percentage.btc.toFixed(2)}%
    Current Risk Tolerance: ${userRiskTolerance}
    ` : `Global Data Unavailable. Assume average market conditions.
    Current Risk Tolerance: ${userRiskTolerance}`;

    const historicalData = { "1w": "3.5%", "1m": "-2.1%" };

    updateLoading(`Predicting recommendation for ${coin.symbol}...`);
    const prediction = await predictWithLlama({
      name: coin.name,
      symbol: coin.symbol,
      price: coin.quote.USD.price,
      change24h: coin.quote.USD.percent_change_24h,
      historicalData,
      sentimentSummary,
      newsSummary: aggregatedNewsSummary,
      globalContext,
    });

    prediction.reasoning = highlightImportantWords(prediction.reasoning);

    results.push({
      name: coin.name,
      symbol: coin.symbol,
      price: coin.quote.USD.price,
      change24h: coin.quote.USD.percent_change_24h,
      sentimentSummary,
      newsSummary: aggregatedNewsSummary,
      prediction,
      historicalPrices
    });

    processedCoins++;
    const coinEnd = Date.now();
    const coinTime = (coinEnd - coinStart) / 1000;
    totalCoinTime += coinTime;
    updateLoading(`Completed ${coin.name} (${coin.symbol}) in ${coinTime.toFixed(2)}s`);

  }

  const totalEnd = Date.now();
  const totalTime = (totalEnd - totalStart) / 1000;
  const avgCoinTime = totalCoinTime / coins.length;

  // Add final timing and article stats to results for display at the end
  return { results, totalTime, avgCoinTime, totalArticles: totalArticlesProcessed };
}

function showErrorBox(screen, errorMsg) {
  const oldErrorBox = screen.children.find(ch => ch.errorBox);
  if (oldErrorBox) screen.remove(oldErrorBox);

  const errorBox = blessed.box({
    bottom: 0,
    left: '0',
    width: '100%',
    height: 'shrink',
    content: chalk.red(`Error: ${errorMsg}`),
    tags: true,
    border: {
      type: 'line'
    },
    style: {
      border: { fg: 'red' }
    }
  });
  errorBox.errorBox = true;
  screen.append(errorBox);
  screen.render();
}

function hideErrorBox(screen) {
  const oldErrorBox = screen.children.find(ch => ch.errorBox);
  if (oldErrorBox) {
    screen.remove(oldErrorBox);
    screen.render();
  }
}

function showNoResultsUI(screen) {
  screen.children.forEach(ch => screen.remove(ch));
  const msgBox = blessed.box({
    top: 'center',
    left: 'center',
    width: '50%',
    height: '20%',
    content: 'No results found.\nPress "r" to re-run analysis or "q" to quit.',
    align: 'center',
    valign: 'middle',
    border: {
      type: 'line'
    },
    style: {
      border: { fg: 'yellow' }
    }
  });
  screen.append(msgBox);
  screen.render();
}

function showTopRecommendations(box, allResults) {
  const buyRecs = allResults.filter(c => c.prediction.recommendation.toLowerCase() === 'buy');
  const sellRecs = allResults.filter(c => c.prediction.recommendation.toLowerCase() === 'sell');

  buyRecs.sort((a,b) => b.prediction.confidence - a.prediction.confidence);
  sellRecs.sort((a,b) => b.prediction.confidence - a.prediction.confidence);

  box.pushLine(chalk.bold('\nTop 10 Buy Recommendations:'));
  buyRecs.slice(0,10).forEach((c, i) => {
    box.pushLine(`${i+1}. ${c.name} (${c.symbol}) - Conf: ${c.prediction.confidence.toFixed(2)}`);
  });

  box.pushLine(chalk.bold('\nTop 10 Sell Recommendations:'));
  sellRecs.slice(0,10).forEach((c, i) => {
    box.pushLine(`${i+1}. ${c.name} (${c.symbol}) - Conf: ${c.prediction.confidence.toFixed(2)}`);
  });
}

function showResultsUI(screen, analysisData) {
  const { results, totalTime, avgCoinTime, totalArticles } = analysisData;
  const allResults = results;
  hideErrorBox(screen);
  screen.children.forEach(ch => screen.remove(ch));

  const box = blessed.box({
    top: '0',
    left: '0',
    width: '75%',
    height: '100%',
    keys: true,
    mouse: true,
    alwaysScroll: true,
    scrollable: true,
    border: {
      type: 'line'
    },
    style: {
      border: { fg: 'cyan' }
    }
  });
  screen.append(box);

  const chartBox = blessed.box({
    top: '0',
    left: '75%',
    width: '25%',
    height: '100%',
    label: ' 24h Change Chart ',
    border: {
      type: 'line'
    },
    style: {
      border: { fg: 'magenta' }
    }
  });
  screen.append(chartBox);

  allResults.forEach((coin, index) => {
    box.pushLine(chalk.green(`${index + 1}. ${coin.name} (${coin.symbol})`));
    box.pushLine(chalk.yellow(`   Price: $${coin.price.toFixed(2)}`));
    box.pushLine(chalk.magenta(`   24h Change: ${coin.change24h.toFixed(2)}%`));
    box.pushLine(chalk.cyan(`   Sentiment: ${coin.sentimentSummary}`));
    box.pushLine(chalk.white(`   News Summary: ${coin.newsSummary}`));
    box.pushLine(chalk.bold(`   Recommendation: ${coin.prediction.recommendation}`));
    box.pushLine(chalk.white(`   Reasoning: ${coin.prediction.reasoning}`));

    const hp = coin.historicalPrices;
    if (hp && hp.length === 7) {
      const color = hp[6] > hp[0] ? asciichart.green : asciichart.red;
      const conf = { height: 3, colors: [color] };
      const smallChart = asciichart.plot(hp, conf);
      box.pushLine(`   7-day Chart:\n${smallChart}`);
    }

    box.pushLine('');
  });

  // Show overall chart
  const changes = allResults.map(c => c.change24h);
  if (changes.length > 0) {
    let sum = changes.reduce((a,b) => a+b,0);
    let avg = sum / changes.length;
    let lineColor = avg >= 0 ? asciichart.green : asciichart.red;
    const config = { height: 10, colors: [lineColor] };
    const chart = asciichart.plot(changes, config);
    chartBox.setContent(chart + '\n(24h Change Chart)');
  } else {
    chartBox.setContent('No data for chart.');
  }

  showTopRecommendations(box, allResults);

  // Show timing and articles info
  box.pushLine(chalk.bold('\nAnalysis Summary:'));
  box.pushLine(`   Total Coins Analyzed: ${allResults.length}`);
  box.pushLine(`   Total Articles Processed: ${totalArticles}`);
  box.pushLine(`   Total Time: ${totalTime.toFixed(2)}s`);
  box.pushLine(`   Average Time per Coin: ${avgCoinTime.toFixed(2)}s`);

  box.pushLine(chalk.yellow('\nPress "r" to re-run analysis or "q" to quit.'));
  box.focus();
  screen.render();
}

async function runAnalysis(loadingBox, screen) {
  let spinnerIndex = 0;
  const setLoadingText = (text) => {
    spinnerIndex = (spinnerIndex + 1) % spinnerChars.length;
    loadingBox.setContent(`${spinnerChars[spinnerIndex]} ${text}`);
    screen.render();
  };

  try {
    setLoadingText('Fetching global market data...');
    const globalData = await fetchGlobalData();

    setLoadingText('Fetching market data...');
    const marketData = await fetchMarketData();
    if (marketData.length === 0) {
      setLoadingText('No market data found.');
      return [];
    }

    setLoadingText('Fetching crypto news (API)...');
    const cryptoNews = await fetchNews();

    setLoadingText('Fetching RSS articles...');
    const rssArticles = await fetchRssArticles();

    setLoadingText('Determining tokens...');
    const analyzedCoins = getAnalyzedCoins(marketData);

    setLoadingText('Analyzing selected coins...');
    const analysisData = await analyzeCoinsWithUI(analyzedCoins, { cryptoNews, rssArticles }, globalData, loadingBox, screen);

    const { results } = analysisData;
    fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
    return analysisData;
  } catch (error) {
    fs.appendFileSync(ERROR_LOG_FILE, `${new Date().toISOString()} - ${error.message}\n`);
    showErrorBox(screen, error.message);
    return [];
  }
}

function runAnalysisUI(screen) {
  screen.children.forEach(ch => screen.remove(ch));
  const loadingBox = blessed.box({
    top: 'center',
    left: 'center',
    width: '70%',
    height: '15%',
    content: 'Loading...',
    align: 'center',
    valign: 'middle',
    border: {
      type: 'line'
    },
    style: {
      border: { fg: 'yellow' }
    }
  });
  screen.append(loadingBox);
  screen.render();

  runAnalysis(loadingBox, screen).then(analysisData => {
    if (Array.isArray(analysisData) && analysisData.length === 0) {
      showNoResultsUI(screen);
    } else if (analysisData.results && analysisData.results.length > 0) {
      showResultsUI(screen, analysisData);
    } else {
      showNoResultsUI(screen);
    }
  }).catch(err => {
    fs.appendFileSync(ERROR_LOG_FILE, `${new Date().toISOString()} - ${err.message}\n`);
    showErrorBox(screen, err.message);
    showNoResultsUI(screen);
  });
}

(async function main() {
  await askUserForInputsInCLI();

  const screen = blessed.screen({
    smartCSR: true,
    title: 'Crypto Analysis Tool'
  });

  screen.key(['q', 'C-c'], () => process.exit(0));
  screen.key(['r'], () => runAnalysisUI(screen));

  runAnalysisUI(screen);
})();

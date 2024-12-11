// ui.js
import blessed from 'blessed';
import asciichart from 'asciichart';
import chalk from 'chalk';

/**
 * Display results in a TUI. 
 * - We show a scrollable list of coins with their recommendations and reasoning.
 * - Press 'q' to quit.
 */
export function showResultsInUI(allResults) {
  const screen = blessed.screen({
    smartCSR: true,
    title: 'Crypto Analysis Results',
  });

  // Main box with scroll
  const box = blessed.box({
    top: '0',
    left: '0',
    width: '75%',
    height: '100%',
    keys: true,
    mouse: true,
    scrollbar: {
      ch: ' ',
      track: {
        bg: 'yellow'
      },
      style: {
        bg: 'yellow'
      }
    },
    alwaysScroll: true,
    scrollable: true,
    border: {
      type: 'line'
    },
    style: {
      border: { fg: 'cyan' }
    }
  });

  const chartBox = blessed.box({
    top: '0',
    left: '75%',
    width: '25%',
    height: '100%',
    label: ' ASCII Chart ',
    border: {
      type: 'line'
    },
    style: {
      border: { fg: 'magenta' }
    },
    scrollable: true,
    alwaysScroll: true,
  });

  screen.append(box);
  screen.append(chartBox);

  // Render overall results
  allResults.forEach((coin, index) => {
    box.pushLine(chalk.green(`${index + 1}. ${coin.name} (${coin.symbol})`));
    box.pushLine(chalk.yellow(`   Price: $${coin.price.toFixed(2)}`));
    box.pushLine(chalk.magenta(`   24h Change: ${coin.change24h.toFixed(2)}%`));
    box.pushLine(chalk.cyan(`   Sentiment: ${coin.sentimentSummary}`));
    box.pushLine(chalk.white(`   News Summary: ${coin.newsSummary}`));
    box.pushLine(chalk.bold(`   Recommendation: ${coin.prediction.recommendation}`));
    box.pushLine(chalk.white(`   Reasoning: ${coin.prediction.reasoning}`));
    box.pushLine(chalk.grey(`   Confidence: ${coin.prediction.confidence}`));
    box.pushLine(''); // Blank line for spacing
  });

  // Overall market ASCII chart
  const changes = allResults.map(c => c.change24h);
  if (changes.length > 0) {
    const chart = asciichart.plot(changes, { height: 10 });
    chartBox.setContent(chart + '\n(24h Change Chart)');
  } else {
    chartBox.setContent('No data for chart.');
  }

  // Quit on 'q'
  screen.key(['q', 'C-c'], function(ch) {
    return process.exit(0);
  });

  box.focus();
  screen.render();
}

import chalk from 'chalk';

export function showHelp() {
  console.log(`
${chalk.blue.bold('Vibe CLI - Available Commands:')}

` +
    `${chalk.green('/load [path]')}    Load a folder of documents
` +
    `${chalk.green('/ask <question>')}  Ask a question about your documents
` +
    `${chalk.green('/help')}           Show this help message
` +
    `${chalk.green('/exit')}           Exit the application

` +
    `${chalk.yellow('Examples:')}
` +
    `  /load ~/projects/my-app
` +
    `  /ask How do I use the main function?
`
  );
}

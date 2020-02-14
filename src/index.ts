import chalk from 'chalk';

import { probeCli } from './api/cli';
import { startServer } from './api/server';
import { parse as parseArgs } from './cli';
import { load as loadConfig } from './config';
import { probe } from './probe';

export function bin() {
  return Promise.resolve().then(exports.run).catch(err => {
    console.error(chalk.red(err.stack));
    process.exit(1);
  });
}

export async function run() {

  const options = parseArgs();
  const config = await loadConfig(options);

  if (options.target) {
    await probeCli(options.target, config);
  } else {
    await startServer(config);
  }
}

export { loadConfig, parseArgs, probe, probeCli, startServer };

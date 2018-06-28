const { red } = require('chalk');

const { probe: probeCli } = require('./api/cli');
const { start: startServer } = require('./api/server');
const { parse: parseArgs } = require('./cli');
const { load: loadConfig } = require('./config');

exports.bin = function() {
  return Promise.resolve().then(exports.run).catch(err => console.error(red(err.stack)));
};

exports.loadConfig = loadConfig;
exports.parseArgs = parseArgs;

exports.run = async function() {

  const args = parseArgs();
  if (args._.length >= 2) {
    throw new Error('This program only accepts zero or one argument');
  }

  const config = await loadConfig(args);

  if (args._.length === 1) {
    await probeCli(args._[0], config);
  } else {
    await startServer(config);
  }
};

exports.startServer = startServer;

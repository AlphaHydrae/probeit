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

  const options = parseArgs();
  const config = await loadConfig(options);

  if (options.target) {
    await probeCli(options.target, config);
  } else {
    await startServer(config);
  }
};

exports.startServer = startServer;

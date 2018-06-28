const { red } = require('chalk');

const { parse: parseArgs } = require('./cli');
const { load: loadConfig } = require('./config');
const { start: startServer } = require('./server');

exports.bin = function() {
  return exports.start().catch(err => console.error(red(err.stack)));
};

exports.start = async function(customArgs) {
  const args = customArgs || parseArgs();
  const config = await loadConfig(args);
  await startServer(config);
};

const yargs = require('yargs');

exports.parse = function() {

  const argv = yargs
    .option('config', {
      alias: 'c',
      describe: 'load configuration from a file'
    })
    .option('port', {
      alias: 'p',
      describe: 'listen on a specific port'
    })
    .option('presets', {
      alias: 'P',
      describe: 'load presets from a file or files'
    })
    .boolean('pretty')
    .option('pretty', {
      describe: 'produce more human-readable output'
    })
    .argv;

  return argv;
};

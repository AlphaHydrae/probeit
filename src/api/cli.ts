const { probe } = require('../probe');

exports.probe = async function(target, config) {
  const result = await probe(target, config);
  process.stdout.write(JSON.stringify(result, undefined, config.pretty ? 2 : undefined));
};

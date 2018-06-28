const { getProbe, getProbeOptions } = require('./probes');
const { buildMetric, compareMetrics } = require('./utils');

exports.probe = async function(target, config, ctx) {

  const probe = getProbe(target);
  const start = new Date().getTime();
  const options = await getProbeOptions(target, config, ctx);

  const result = await probe(target, options);

  result.metrics.push(buildMetric(
    'duration',
    'seconds',
    (new Date().getTime() - start) / 1000,
    'How long the probe took to complete in seconds'
  ));

  result.metrics.sort(compareMetrics);

  return result;
};

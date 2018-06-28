import { Context } from 'koa';

import { getProbe, getProbeOptions } from './probes';
import { buildMetric, compareMetrics } from './utils';

exports.probe = async function(target: string, config, ctx: Context) {

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

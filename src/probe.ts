import { Context } from 'koa';

import { Config } from './config';
import { buildMetric } from './metrics';
import { getProbe, getProbeOptions } from './probes';
import { compareMetrics, ProbeResult } from './utils';

export async function probe(target: string, config: Config, ctx?: Context): Promise<ProbeResult> {

  const probeFunc = getProbe(target);
  const start = new Date().getTime();
  const options = await getProbeOptions(target, config, ctx);

  const result = await probeFunc(target, options);

  result.metrics.push(buildMetric(
    'duration',
    'seconds',
    (new Date().getTime() - start) / 1000,
    'How long the probe took to complete in seconds'
  ));

  result.metrics.sort(compareMetrics);

  return result;
}

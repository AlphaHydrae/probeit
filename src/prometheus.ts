import { underscore } from 'inflection';
import { each, includes, reduce } from 'lodash';
import moment from 'moment';

import { Metric } from './metrics';
import { ProbeResult } from './types';

const SUFFIX_TYPES = [ 'bytes', 'seconds' ];

export function toPrometheusMetrics(result: ProbeResult, pretty: boolean) {

  let previousMetricName;
  let currentMetricName;
  const lines: string[] = [];

  for (const metric of result.metrics) {

    currentMetricName = metric.name;
    if (previousMetricName && currentMetricName.localeCompare(previousMetricName) < 0) {
      throw new Error('Metrics must be sorted by name');
    }

    let metricKey = [ 'probe', underscore(metric.name) ].join('_');
    if (includes(SUFFIX_TYPES, metric.type)) {
      metricKey = `${metricKey}_${metric.type}`;
    }

    if (currentMetricName !== previousMetricName) {
      if (pretty) {
        lines.push('');
      }

      lines.push(`# HELP ${metricKey} ${metric.description}`);
      lines.push(`# TYPE ${metricKey} gauge`);
    }

    const metricKeyTags = reduce(metric.tags, (memo, value, key) => [ ...memo, `${key}="${value}"` ], [] as string[]).join(',');
    if (metricKeyTags.length) {
      metricKey = `${metricKey}{${metricKeyTags}}`;
    }

    lines.push(buildValueLine(metricKey, metric));

    previousMetricName = metric.name;
  }

  if (pretty) {
    lines.push('');
  }

  lines.push('# HELP probe_failures Indicates the number of expectations that failed');
  lines.push('# TYPE probe_failures gauge');

  if (!result.failures.length) {
    lines.push('probe_failures 0');
  }

  const noCounts: { [key: string]: number } = {};
  const failureCountsByCause = result.failures.reduce((memo, failure) => ({
    ...memo,
    [failure.cause]: (memo[failure.cause] || 0) + 1
  }), noCounts);

  each(failureCountsByCause, (value, key) => {
    lines.push(`probe_failures{cause="${key}"} ${value}`);
  });

  if (pretty) {
    lines.push('');
  }

  lines.push('# HELP probe_success Indicates whether the probe was successful');
  lines.push('# TYPE probe_success gauge');
  lines.push(`probe_success ${result.success ? 1 : 0}`);

  return lines.join('\n');
}

export function buildValueLine(key: string, metric: Metric): string {
  if (metric.type === 'boolean') {
    return `${key} ${metric.value ? 1 : 0}`;
  } else if (metric.type === 'datetime') {
    return `${key} ${metric.value ? moment(metric.value).unix() : -1}`;
  } else if (includes([ 'bytes', 'quantity', 'seconds' ], metric.type)) {
    return `${key} ${metric.value ?? -1}`;
  } else if (includes([ 'number' ], metric.type)) {
    return `${key} ${metric.value ?? 'NaN'}`;
  }

  throw new Error(`Conversion to Prometheus metrics not supported for values of type "${metric.type}"`);
}

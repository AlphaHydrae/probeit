const { underscore } = require('inflection');
const { each, includes, reduce } = require('lodash');
const moment = require('moment');

const SUFFIX_TYPES = [ 'bytes', 'seconds' ];

exports.toPrometheusMetrics = function(result, pretty) {

  let previousMetricName;
  let currentMetricName;
  const lines = [];

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

    const metricKeyTags = reduce(metric.tags, (memo, value, key) => [ ...memo, `${key}="${value}"` ], []).join(',');
    if (metricKeyTags.length) {
      metricKey = `${metricKey}{${metricKeyTags}}`;
    }

    if (metric.type === 'boolean') {
      lines.push(`${metricKey} ${metric.value ? 1 : 0}`);
    } else if (metric.type === 'datetime') {
      lines.push(`${metricKey} ${metric.value ? moment(metric.value).unix() : -1}`);
    } else if (includes([ 'bytes', 'quantity', 'seconds' ], metric.type)) {
      lines.push(`${metricKey} ${metric.value !== null ? metric.value : -1}`);
    } else if (includes([ 'number' ], metric.type)) {
      lines.push(`${metricKey} ${metric.value !== null ? metric.value : 'NaN'}`);
    } else {
      throw new Error(`Conversion to Prometheus metrics not supported for values of type "${metric.type}"`);
    }

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

  const failureCountsByCause = result.failures.reduce((memo, failure) => ({ ...memo, [failure.cause]: (memo[failure.cause] || 0) + 1 }), {});
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
};

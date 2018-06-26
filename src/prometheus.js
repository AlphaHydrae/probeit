const { underscore } = require('inflection');
const { each, includes, isPlainObject, pickBy, reduce } = require('lodash');
const moment = require('moment');

const { parseBooleanQueryParam } = require('./utils');

exports.toPrometheusMetrics = function(metrics, ctx) {

  const pretty = parseBooleanQueryParam(ctx.query.pretty);

  const lines = reduce(pickBy(metrics, metric => isPlainObject(metric) && includes([ 'boolean', 'bytes', 'datetime', 'number', 'quantity', 'seconds' ], metric.type)), (memo, metric, key) => {

    if (pretty && memo.length) {
      memo.push('');
    }

    let metricKey = [ 'probe', underscore(key) ].join('_');
    memo.push(`# HELP ${metricKey} ${metric.description}`);

    if (metric.type === 'boolean') {
      memo.push(`# TYPE ${metricKey} gauge`);
      memo.push(`${metricKey} ${metric.value ? 1 : 0}`);
    } else if (metric.type === 'datetime') {
      memo.push(`# TYPE ${metricKey} gauge`);
      memo.push(`${metricKey} ${metric.value ? moment(metric.value).unix() : -1}`);
    } else if (includes([ 'bytes', 'number', 'quantity', 'seconds' ], metric.type)) {
      if (metric.type === 'seconds') {
        metricKey = `${metricKey}_seconds`;
      }

      memo.push(`# TYPE ${metricKey} gauge`);
      memo.push(`${metricKey} ${metric.value !== null ? metric.value : -1}`);
    }

    return memo;
  }, []);

  each(pickBy(metrics, metric => isPlainObject(metric) && metric.type === 'map' && includes([ 'bytes', 'number', 'quantity', 'seconds' ], metric.mapType)), (metric, key) => {

    if (pretty && lines.length) {
      lines.push('');
    }

    let metricKey = [ 'probe', underscore(key) ].join('_');
    if (metric.mapType === 'seconds') {
      metricKey = `${metricKey}_seconds`;
    }

    lines.push(`# HELP ${metricKey} ${metric.description}`);
    lines.push(`# TYPE ${metricKey} gauge`);

    each(metric.value, (mapValue, mapKey) => {
      lines.push(`${metricKey}{${metric.mapKey || 'key'}="${mapKey}"} ${mapValue}`);
    });
  });

  if (pretty) {
    lines.push('');
  }

  lines.push('# HELP probe_failures Indicates the number of expectations that failed');
  lines.push('# TYPE probe_failures gauge');

  if (!metrics.failures.length) {
    lines.push('probe_failures 0');
  }

  const failureCountsByCause = metrics.failures.reduce((memo, failure) => ({ ...memo, [failure.cause]: (memo[failure.cause] || 0) + 1 }), {});
  each(failureCountsByCause, (value, key) => {
    lines.push(`probe_failures{cause="${key}"} ${value}`);
  });

  if (pretty) {
    lines.push('');
  }

  lines.push('# HELP probe_success Indicates whether the probe was successful');
  lines.push('# TYPE probe_success gauge');
  lines.push(`probe_success ${metrics.success ? 1 : 0}`);

  return lines.join('\n');
};

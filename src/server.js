const { red } = require('chalk');
const http = require('http');
const https = require('https');
const { underscore } = require('inflection');
const moment = require('moment');
const Koa = require('koa');
const { each, get, includes, isArray, isObject, isPlainObject, last, mapValues, pick, pickBy, reduce } = require('lodash');
const url = require('url');

const app = new Koa();

app.use(async ctx => {

  const target = ctx.query.target;
  if (!target) {
    ctx.throw(400, 'Query parameter "target" is missing');
  }

  const probe = getProbe(target);
  if (!probe) {
    ctx.throw(400, `No probe found; target must be an HTTP(S) URL`);
  }

  const start = new Date().getTime();
  const result = await probe(target, ctx);
  result.duration = buildNumericMetric(
    (new Date().getTime() - start) / 1000,
    'How long the probe took to complete in seconds',
    'seconds'
  );

  if (ctx.accepts('application/json')) {
    ctx.body = result;
  } else if (ctx.accepts('text/plain')) {
    ctx.body = toPrometheusMetrics(result);
  } else {
    ctx.throw(400, 'Request must accept either application/json or text/plain');
  }
});

app.on('error', err => console.warn(red(err.stack)));

app.listen(3000);

function getProbe(target) {
  if (target.match(/^https?:/i)) {
    return probeHttp;
  }
}

function probeHttp(target, ctx, state = {}) {
  return new Promise((resolve, reject) => {

    const followRedirects = parseBooleanQueryParam(ctx.query.followRedirects, true);

    const reqOptions = {
      ...url.parse(target),
      agent: false,
      headers: parseHttpParamsQueryParam(ctx.query.header),
      rejectUnauthorized: !parseBooleanQueryParam(ctx.query.ignoreInvalidSsl)
    };

    const times = {
      start: new Date().getTime()
    };

    const req = (target.match(/^https:/i) ? https : http).request(reqOptions, (res) => {

      let body = '';

      res.on('readable', () => {
        if (state.firstByte === undefined) {
          times.firstByteAt = new Date().getTime();
          increase(state, 'firstByte', times.firstByteAt - (times.tlsHandshakeAt || times.tcpConnectionAt))
        }

        res.read();
      });

      res.on('data', chunk => {
        body += chunk;
        res.read();
      });

      res.on('end', () => {
        if (times.firstByteAt !== undefined) {
          increase(state, 'contentTransfer', new Date().getTime() - times.firstByteAt);
        }

        if (followRedirects && res.statusCode >= 301 && res.statusCode <= 302) {
          increase(state, 'redirects', 1);
          resolve(probeHttp(res.headers.location, ctx, state));
        } else {
          resolve(getHttpMetrics(req, res, state));
        }
      });
    })

    req.on('socket', (socket) => {
      socket.on('lookup', () => {
        times.dnsLookupAt = new Date().getTime();
        increase(state, 'dnsLookup', times.dnsLookupAt - times.start);
      });

      socket.on('connect', () => {
        times.tcpConnectionAt = new Date().getTime();
        increase(state, 'tcpConnection', times.tcpConnectionAt - (times.dnsLookupAt || times.start));
      });

      socket.on('secureConnect', () => {
        times.tlsHandshakeAt = new Date().getTime();
        increase(state, 'tlsHandshake', times.tlsHandshakeAt - times.tcpConnectionAt);
      });
    })

    req.on('error', err => {
      resolve(getHttpMetrics(req, undefined, state));
    });

    req.end();
  });
}

function getHttpMetrics(req, res, state) {
  return {
    httpContentLength: buildNumericMetric(
      res && res.headers['content-length'] ? parseInt(res.headers['content-length'], 10) : null,
      'Length of the HTTP response entity in bytes',
      'bytes'
    ),
    httpDuration: buildMapMetric(
      mapValues(pick(state, 'contentTransfer', 'dnsLookup', 'firstByte', 'tcpConnection', 'tlsHandshake'), value => value / 1000),
      'Duration of the HTTP request(s) by phase, summed over all redirects, in milliseconds',
      'number',
      'seconds'
    ),
    httpRedirects: buildNumericMetric(
      state.redirects || 0,
      'Number of redirects'
    ),
    httpSsl: buildBooleanMetric(
      state.tlsHandshake !== undefined,
      'Indicates whether SSL was used for the final redirect'
    ),
    httpSslExpiry: buildValueMetric(
      getHttpSslExpiry(req),
      'Expiration date of the SSL certificate in Unix time',
      'datetime'
    ),
    httpStatusCode: buildNumericMetric(
      res ? res.statusCode : null,
      'HTTP status code'
    ),
    httpVersion: buildValueMetric(
      res ? res.httpVersion : null,
      'HTTP version',
      'string'
    ),
    httpVersionMajor: buildNumericMetric(
      res ? res.httpVersionMajor : null,
      'Major number of the HTTP version'
    ),
    httpVersionMinor: buildNumericMetric(
      res ? res.httpVersionMinor : null,
      'Minor number of the HTTP version'
    ),
    success: !!res && res.statusCode >= 200 && res.statusCode < 400
  };
}

function getHttpSslExpiry(req) {
  if (!req.connection || typeof req.connection.getPeerCertificate != 'function') {
    return null;
  }

  const certificate = req.connection.getPeerCertificate();
  return certificate ? moment.utc(new Date(certificate.valid_to)).format() : null;
}

function increase(counters, key, by) {
  counters[key] = (counters[key] || 0) + by;
}

function toPrometheusMetrics(metrics) {

  const lines = reduce(pickBy(metrics, metric => isPlainObject(metric) && includes([ 'boolean', 'datetime', 'number' ], metric.type)), (memo, metric, key) => {

    let metricKey = [ 'probe', underscore(key) ].join('_');
    memo.push(`# HELP ${metricKey} ${metric.description}`);

    if (metric.type === 'boolean') {
      memo.push(`# TYPE ${metricKey} gauge`);
      memo.push(`${metricKey} ${metric.value ? 1 : 0}`);
    } else if (metric.type === 'datetime') {
      memo.push(`# TYPE ${metricKey} gauge`);
      memo.push(`${metricKey} ${moment(metric.value).unix()}`);
    } else if (metric.type === 'number') {
      if (metric.unit === 'seconds') {
        metricKey = `${metricKey}_seconds`;
      }

      memo.push(`# TYPE ${metricKey} gauge`);
      memo.push(`${metricKey} ${metric.value}`);
    }

    return memo;
  }, []);

  each(pickBy(metrics, metric => isPlainObject(metric) && metric.type === 'map' && includes([ 'boolean', 'datetime', 'number' ], metric.mapType)), (metric, key) => {

    let metricKey = [ 'probe', underscore(key) ].join('_');
    if (metric.unit === 'seconds') {
      metricKey = `${metricKey}_seconds`;
    }

    lines.push(`# HELP ${metricKey} ${metric.description}`);
    lines.push(`# TYPE ${metricKey} gauge`);

    each(metric.value, (mapValue, mapKey) => {
      lines.push(`${metricKey}{${metric.discriminant}="${mapKey}"} ${mapValue}`);
    });
  });

  lines.push('# HELP probe_success Indicates whether the probe was successful');
  lines.push('# TYPE probe_success gauge');
  lines.push(`probe_success ${metrics.success ? 1 : 0}`);

  return lines.join('\n');
}

function buildBooleanMetric(value, description) {
  return {
    description,
    type: 'boolean',
    value
  }
}

function buildNumericMetric(value, description, unit) {
  return {
    description,
    type: 'number',
    unit,
    value
  };
}

function buildMapMetric(object, description, type, unit) {
  return {
    description,
    discriminant: 'phase',
    type: 'map',
    mapType: type,
    unit,
    value: object
  };
}

function buildValueMetric(value, description, type) {
  return {
    description,
    type,
    value
  };
}

function parseBooleanQueryParam(value, defaultValue = false) {
  return typeof value === 'string' ? !!value.match(/^1|y|yes|t|true$/i) : defaultValue;
}

function parseHttpParamsQueryParam(value, defaultValue = {}) {

  const params = {};

  if (value === undefined) {
    return defaultValue;
  } else if (typeof value === 'string') {
    const [ paramName, paramValue ] = value.split('=', 2);
    appendHttpParam(params, paramName, paramValue || '');
  } else if (isArray(value)) {
    for (const singleValue of value) {
      const [ paramName, paramValue ] = String(singleValue).split('=', 2);
      appendHttpParam(params, paramName, paramValue || '');
    }
  } else {
    throw new Error('HTTP parameter must be a string or an array of strings');
  }

  return params;
}

function appendHttpParam(params, key, value) {
  params[key] = [ ...(params[key] || []), value ];
}

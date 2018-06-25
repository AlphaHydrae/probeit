const { red } = require('chalk');
const http = require('http');
const https = require('https');
const { underscore } = require('inflection');
const moment = require('moment');
const Koa = require('koa');
const { compact, each, includes, isArray, isNaN, isPlainObject, last, mapValues, pick, pickBy, reduce } = require('lodash');
const url = require('url');

const app = new Koa();

app.use(async ctx => {
  if (!includes([ '/', '/metrics' ], ctx.path)) {
    ctx.status = 404;
    return;
  }

  const target = ctx.query.target;
  if (!target) {
    ctx.throw(400, 'Query parameter "target" is missing');
  }

  const probe = getProbe(target);
  if (!probe) {
    ctx.throw(400, `No suitable probe found; target must be an HTTP(S) URL`);
  }

  const start = new Date().getTime();
  const result = await probe(target, ctx);
  result.duration = buildMetric(
    (new Date().getTime() - start) / 1000,
    'seconds',
    'How long the probe took to complete in seconds'
  );

  if (ctx.path === '/metrics') {
    ctx.body = toPrometheusMetrics(result, ctx);
    ctx.set('Content-Type', 'text/plain; version=0.0.4');
  } else {
    if (parseBooleanQueryParam(ctx.query.pretty)) {
      ctx.body = JSON.stringify(result, undefined, 2);
      ctx.set('Content-Type', 'application/json; charset=utf-8');
    } else {
      ctx.body = result;
    }
  }
});

app.on('error', err => console.warn(red(err.stack)));

app.listen(process.env.PORT || 3000);

function getProbe(target) {
  if (target.match(/^https?:/i)) {
    return probeHttp;
  }
}

function probeHttp(target, ctx, state = {}) {
  return new Promise((resolve, reject) => {

    const followRedirects = parseBooleanQueryParam(ctx.query.followRedirects, true);

    // TODO: support query parameters
    const reqOptions = {
      method: ctx.query.method || 'GET',
      ...url.parse(target),
      agent: false,
      headers: parseHttpParamsQueryParam(ctx.query.header),
      rejectUnauthorized: !parseBooleanQueryParam(ctx.query.allowUnauthorized)
    };

    const times = {
      start: new Date().getTime()
    };

    state.requests = state.requests || [];
    state.requests.push(reqOptions);

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
          resolve(getHttpMetrics(ctx, req, Object.assign(res, { body }), state));
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
    });

    req.on('error', err => {
      resolve(getHttpMetrics(ctx, req, undefined, state));
    });

    req.end();
  });
}

function getHttpMetrics(ctx, req, res, state) {

  const failures = [];

  if (res) {
    validateHttpRedirects(ctx, state, failures);
    validateHttpRedirectTarget(ctx, state, failures);
    validateHttpResponseBody(ctx, res, failures);
    validateHttpSecurity(ctx, state, failures);
    validateHttpStatusCode(ctx, res, failures);
    validateHttpVersion(ctx, res, failures);
  }

  return {
    failures,
    httpContentLength: buildMetric(
      res && res.headers['content-length'] ? parseInt(res.headers['content-length'], 10) : null,
      'bytes',
      'Length of the HTTP response entity in bytes'
    ),
    httpDuration: buildMapMetric(
      mapValues(pick(state, 'contentTransfer', 'dnsLookup', 'firstByte', 'tcpConnection', 'tlsHandshake'), value => value / 1000),
      'phase',
      'seconds',
      'Duration of the HTTP request(s) by phase, summed over all redirects, in seconds'
    ),
    httpRedirects: buildMetric(
      state.redirects || 0,
      'quantity',
      'Number of redirects'
    ),
    httpSecure: buildMetric(
      // FIXME: check whether SSL/TLS is used on final redirect (currently works at any redirect)
      state.tlsHandshake !== undefined,
      'boolean',
      'Indicates whether SSL/TLS was used for the final redirect'
    ),
    httpCertificateExpiry: buildMetric(
      getHttpCertificateExpiry(req),
      'datetime',
      'Expiration date of the SSL certificate in Unix time'
    ),
    httpStatusCode: buildMetric(
      res ? res.statusCode : null,
      'number',
      'HTTP status code'
    ),
    httpVersion: buildMetric(
      res ? res.httpVersion : null,
      'number',
      'HTTP version'
    ),
    success: !!res && !failures.length
  };
}

function validateHttpRedirects(ctx, state, failures) {
  const expectedRedirects = ctx.query.expectHttpRedirects !== undefined ? ctx.query.expectHttpRedirects : (ctx.query.expectHttpRedirectTo ? 'yes' : undefined);

  const expectedRedirectCount = Number(expectedRedirects);
  if (!isNaN(expectedRedirectCount) && state.redirects !== expectedRedirectCount) {
    return failures.push({
      actual: state.redirects,
      cause: 'invalidHttpRedirectCount',
      description: `Expected the HTTP request to be redirected exactly ${expectedRedirectCount} time${expectedRedirectCount !== 1 ? 's' : ''}`,
      expected: expectedRedirectCount
    });
  }

  const shouldRedirect = parseBooleanQueryParam(expectedRedirects, null);
  if (shouldRedirect === true && !state.redirects) {
    return failures.push({
      cause: 'missingHttpRedirect',
      description: 'Expected the server to send an HTTP redirection'
    });
  } else if (shouldRedirect === false && state.redirects) {
    return failures.push({
      cause: 'unexpectedHttpRedirect',
      description: 'Did not expect the server to send an HTTP redirection'
    });
  }
}

function validateHttpRedirectTarget(ctx, state, failures) {

  const expectedRedirect = ctx.query.expectHttpRedirectTo !== undefined ? url.parse(ctx.query.expectHttpRedirectTo) : undefined;
  if (!expectedRedirect) {
    return;
  }

  const lastRequest = last(state.requests);
  if (expectedRedirect.protocol !== lastRequest.protocol || expectedRedirect.host !== lastRequest.host || expectedRedirect.pathname !== lastRequest.pathname) {
    failures.push({
      actual: url.format(lastRequest),
      cause: 'invalidHttpRedirectLocation',
      description: `Expected the request to be redirected to ${ctx.query.expectHttpRedirectTo}`,
      expected: url.format(expectedRedirect)
    });
  }
}

function validateHttpResponseBody(ctx, res, failures) {

  const body = String(res.body);

  for (const expectedMatch of toArray(ctx.query.expectMatch)) {
    if (!body.match(new RegExp(expectedMatch))) {
      failures.push({
        cause: 'httpResponseBodyMismatch',
        description: `Expected the HTTP response body to match the following regular expression: ${expectedMatch}`,
        expected: expectedMatch
      });
    }
  }

  for (const expectedMismatch of toArray(ctx.query.expectMismatch)) {
    if (body.match(new RegExp(expectedMismatch))) {
      failures.push({
        cause: 'unexpectedHttpResponseBodyMatch',
        description: `Did not expect the HTTP response body to match the following regular expression: ${expectedMismatch}`,
        expected: expectedMismatch
      });
    }
  }
}

function validateHttpSecurity(ctx, state, failures) {
  const expectSecure = parseBooleanQueryParam(last(toArray(ctx.query.expectSecure)), null);
  if (expectSecure === true && state.tlsHandshake === undefined) {
    failures.push({
      cause: 'insecure',
      description: 'Expected the server to use SSL/TLS for the request (or final redirect)'
    });
  } else if (expectSecure === false && state.tlsHandshake !== undefined) {
    failures.push({
      cause: 'unexpectedlySecure',
      description: 'Did not expect the server to use SSL/TLS for the request (or final redirect)'
    });
  }
}

function validateHttpStatusCode(ctx, res, failures) {

  const actual = res.statusCode;
  const expected = isArray(ctx.query.expectedHttpStatusCode) ? ctx.query.expectedHttpStatusCode : compact([ ctx.query.expectedHttpStatusCode ]);
  if (!expected.length) {
    expected.push('2xx', '3xx');
  }

  for (const code of expected) {
    if (typeof code !== 'string') {
      continue;
    }

    const rangeMatch = code.match(/^([1-5])xx$/i);
    if (rangeMatch) {
      const rangeStart = parseInt(rangeMatch[1], 10) * 100;
      if (actual >= rangeStart && actual <= rangeStart + 99) {
        return;
      }
    }

    const asNumber = Number(code);
    if (!isNaN(asNumber) && asNumber === actual) {
      return;
    }
  }

  failures.push({
    actual: res.statusCode,
    cause: 'invalidHttpStatusCode',
    description: `Expected HTTP status code to match one of the following: ${expected.join(', ')}`,
    expected: toArray(ctx.query.expectedHttpStatusCode)
  });
}

function validateHttpVersion(ctx, res, failures) {
  const actual = res.httpVersion;
  const expected = ctx.query.expectedHttpVersion;
  if (expected && String(actual) !== String(expected)) {
    failures.push({
      cause: 'invalidHttpVersion',
      description: `Expected HTTP version to be "${expected}"`
    });
  }
}

function getHttpCertificateExpiry(req) {
  if (!req.connection || typeof req.connection.getPeerCertificate != 'function') {
    return null;
  }

  const certificate = req.connection.getPeerCertificate();
  return certificate ? moment.utc(new Date(certificate.valid_to)).format() : null;
}

function increase(counters, key, by) {
  counters[key] = (counters[key] || 0) + by;
}

function toPrometheusMetrics(metrics, ctx) {

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
}

function buildMetric(value, type, description) {
  return {
    description,
    type,
    value
  };
}

function buildMapMetric(value, mapKey, mapType, description) {
  return {
    description,
    mapKey,
    mapType,
    type: 'map',
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

function toArray(value) {
  return isArray(value) ? value : (value !== undefined ? [ value ] : []);
}

import { ClientRequest, IncomingMessage, request as requestHttp, RequestOptions } from 'http';
import { request as requestHttps } from 'https';
import { Context } from 'koa';
import { assign, each, isNaN, last, merge, pick } from 'lodash';
import * as moment from 'moment';
import { TLSSocket } from 'tls';
import { format as formatUrl, parse as parseUrl } from 'url';

import { getPresetOptions } from '../presets';
import { buildMetric, Failure, increase, Metric, parseBooleanParam, parseHttpParams, toArray } from '../utils';

const optionNames = [
  // Parameters
  'allowUnauthorized', 'followRedirects', 'headers', 'method',
  // Expectations
  'expectHttpRedirects', 'expectHttpRedirectTo',
  'expectHttpResponseBodyMatch', 'expectHttpResponseBodyMismatch',
  'expectHttpSecure', 'expectHttpStatusCode', 'expectHttpVersion'
];

interface HttpProbeState {
  contentTransfer?: number ;
  firstByte?: number;
  requests: RequestOptions[];
  tlsHandshake?: number;
  tcpConnection?: number;
  redirects: number;
}

export interface HttpProbeOptions {
  allowUnauthorized: boolean;
  expectHttpRedirects: boolean | number;
  expectHttpRedirectTo: string;
  expectHttpResponseBodyMatch: string[];
  expectHttpResponseBodyMismatch: string[];
  expectHttpSecure: boolean;
  expectHttpStatusCode: Array<number | string>;
  expectHttpVersion: string;
  followRedirects: boolean;
  headers: { [key: string]: string[] };
  method: string;
}

export async function getHttpProbeOptions(target: string, config, ctx: Context): Promise<HttpProbeOptions> {

  const queryOptions = {};
  if (ctx) {
    assign(queryOptions, {
      allowUnauthorized: parseBooleanParam(last(toArray(ctx.query.allowUnauthorized))),
      expectHttpRedirects: last(toArray(ctx.query.expectHttpRedirects)),
      expectHttpRedirectTo: last(toArray(ctx.query.expectHttpRedirectTo)),
      expectHttpResponseBodyMatch: toArray(ctx.query.expectHttpResponseBodyMatch),
      expectHttpResponseBodyMismatch: toArray(ctx.query.expectHttpResponseBodyMismatch),
      expectHttpSecure: parseBooleanParam(last(toArray(ctx.query.expectHttpSecure)), null),
      expectHttpStatusCode: toArray(ctx.query.expectHttpStatusCode),
      expectHttpVersion: last(toArray(ctx.query.expectHttpVersion)),
      followRedirects: parseBooleanParam(last(toArray(ctx.query.followRedirects))),
      headers: parseHttpParams(ctx.query.header),
      method: last(toArray(ctx.query.method))
    });
  }

  const selectedPresets = [];
  if (ctx) {
    selectedPresets.push(...toArray(ctx.query.preset).map(String));
  }

  const presetOptions = await getPresetOptions(config, selectedPresets);

  const configOptions = pick(config, ...optionNames);

  const defaultOptions = {
    allowUnauthorized: false,
    expectHttpRedirects: ctx && ctx.query.expectHttpRedirectTo ? 'yes' : undefined,
    expectHttpResponseBodyMatch: [],
    expectHttpResponseBodyMismatch: [],
    expectHttpStatusCode: [],
    followRedirects: true,
    headers: {},
    method: 'GET'
  };

  // TODO: validate
  return merge({}, defaultOptions, configOptions, presetOptions, queryOptions);
}

export async function probeHttp(target: string, options) {
  const probeData = await performHttpProbe(target, options);
  return getHttpMetrics(probeData.req, probeData.res, probeData.state, options);
}

function performHttpProbe(target: string, options, state: HttpProbeState = { redirects: 0, requests: [] }) {
  return new Promise(resolve => {

    // TODO: support query parameters
    const reqOptions = {
      method: options.method,
      ...parseUrl(target),
      agent: false,
      headers: options.headers,
      rejectUnauthorized: !options.allowUnauthorized
    };

    const times: { [key: string]: number } = {
      start: new Date().getTime()
    };

    state.requests.push(reqOptions);

    const req = (target.match(/^https:/i) ? requestHttps : requestHttp)(reqOptions, res => {

      let body = '';

      res.on('readable', () => {
        if (state.firstByte === undefined) {
          times.firstByteAt = new Date().getTime();
          increase(state, 'firstByte', times.firstByteAt - (times.tlsHandshakeAt || times.tcpConnectionAt));
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

        if (options.followRedirects && res.statusCode && res.statusCode >= 301 && res.statusCode <= 302 && res.headers.location) {
          increase(state, 'redirects', 1);
          resolve(performHttpProbe(res.headers.location, options, state));
        } else {
          resolve({ req, state, res: Object.assign(res, { body }) });
        }
      });
    });

    req.on('socket', socket => {
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

    req.on('error', () => {
      resolve({ req, state });
    });

    req.end();
  });
}

function getHttpMetrics(req: ClientRequest, res: IncomingMessage, state: HttpProbeState, options) {

  const failures: Failure[] = [];
  const metrics: Metric[] = [];

  if (res) {
    validateHttpRedirects(state, failures, options);
    validateHttpRedirectTarget(state, failures, options);
    validateHttpResponseBody(res, failures, options);
    validateHttpSecurity(state, failures, options);
    validateHttpStatusCode(res, failures, options);
    validateHttpVersion(res, failures, options);
  }

  const success = !!res && !failures.length;

  metrics.push(buildMetric(
    'httpCertificateExpiry',
    'datetime',
    getHttpCertificateExpiry(req),
    'Expiration date of the SSL certificate'
  ));

  metrics.push(buildMetric(
    'httpContentLength',
    'bytes',
    res && res.headers['content-length'] ? parseInt(res.headers['content-length'] || '', 10) : null,
    'Length of the HTTP response entity in bytes',
  ));

  each(pick(state, 'contentTransfer', 'dnsLookup', 'firstByte', 'tcpConnection', 'tlsHandshake'), (value: number, phase: string) => {
    metrics.push(buildMetric(
      'httpDuration',
      'seconds',
      value !== undefined ? value / 1000 : null,
      'Duration of the HTTP request(s) by phase, summed over all redirects, in seconds',
      { phase }
    ));
  });

  metrics.push(buildMetric(
    'httpRedirects',
    'quantity',
    state.redirects || 0,
    'Number of times HTTP 301 or 302 redirects were followed'
  ));

  metrics.push(buildMetric(
    'httpSecure',
    'boolean',
    // FIXME: check whether SSL/TLS is used on final redirect (currently works at any redirect)
    state.tlsHandshake !== undefined,
    'Indicates whether SSL/TLS was used for the final request'
  ));

  metrics.push(buildMetric(
    'httpStatusCode',
    'number',
    res ? res.statusCode || null : null,
    'HTTP status code of the final response'
  ));

  metrics.push(buildMetric(
    'httpVersion',
    'number',
    res ? parseFloat(res.httpVersion) : null,
    'HTTP version of the response'
  ));

  return { failures, metrics, success };
}

function validateHttpRedirects(state: HttpProbeState, failures: Failure[], options) {

  const expectedRedirects = options.expectHttpRedirects;

  const expectedRedirectCount = Number(expectedRedirects);
  if (!isNaN(expectedRedirectCount) && state.redirects !== expectedRedirectCount) {
    return failures.push({
      actual: state.redirects,
      cause: 'invalidHttpRedirectCount',
      description: `Expected the HTTP request to be redirected exactly ${expectedRedirectCount} time${expectedRedirectCount !== 1 ? 's' : ''}`,
      expected: expectedRedirectCount
    });
  }

  const shouldRedirect = parseBooleanParam(expectedRedirects, null);
  if (shouldRedirect === true && !state.redirects) {
    return failures.push({
      cause: 'missingHttpRedirect',
      description: 'Expected the server to send an HTTP redirection'
    });
  } else if (shouldRedirect === false && state.redirects) {
    return failures.push({
      actual: state.redirects,
      cause: 'unexpectedHttpRedirect',
      description: 'Did not expect the server to send an HTTP redirection',
      expected: 0
    });
  }
}

function validateHttpRedirectTarget(state: HttpProbeState, failures: Failure[], options) {

  const expectedRedirect = options.expectHttpRedirectTo !== undefined ? parseUrl(options.expectHttpRedirectTo) : undefined;
  if (!expectedRedirect) {
    return;
  }

  const lastRequest = last(state.requests);
  if (lastRequest && expectedRedirect.protocol === lastRequest.protocol && expectedRedirect.host === lastRequest.host && expectedRedirect.pathname === lastRequest.pathname) {
    return;
  }

  failures.push({
    actual: formatUrl(lastRequest),
    cause: 'invalidHttpRedirectLocation',
    description: `Expected the request to be redirected to ${options.expectHttpRedirectTo}`,
    expected: formatUrl(expectedRedirect)
  });
}

function validateHttpResponseBody(res: IncomingMessage, failures: Failure[], options) {

  const body = String(res.body);

  for (const expectedMatch of options.expectHttpResponseBodyMatch) {
    if (body.match(new RegExp(expectedMatch))) {
      continue;
    }

    failures.push({
      cause: 'httpResponseBodyMismatch',
      description: `Expected the HTTP response body to match the following regular expression: ${expectedMatch}`,
      expected: expectedMatch
    });
  }

  for (const expectedMismatch of options.expectHttpResponseBodyMismatch) {

    const match = body.match(new RegExp(expectedMismatch));
    if (!match) {
      continue;
    }

    failures.push({
      actual: match[0],
      cause: 'unexpectedHttpResponseBodyMatch',
      description: `Did not expect the HTTP response body to match the following regular expression: ${expectedMismatch}`,
      expected: expectedMismatch
    });
  }
}

function validateHttpSecurity(state: HttpProbeState, failures: Failure[], options) {
  const expectSecure = options.expectHttpSecure;
  if (expectSecure === true && state.tlsHandshake === undefined) {
    failures.push({
      cause: 'insecureHttp',
      description: 'Expected the server to use SSL/TLS for the request (or final redirect)'
    });
  } else if (expectSecure === false && state.tlsHandshake !== undefined) {
    failures.push({
      cause: 'unexpectedlySecureHttp',
      description: 'Did not expect the server to use SSL/TLS for the request (or final redirect)'
    });
  }
}

function validateHttpStatusCode(res: IncomingMessage, failures: Failure[], options) {

  const actual = res.statusCode;
  const expected = options.expectHttpStatusCode;
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
      if (actual && actual >= rangeStart && actual <= rangeStart + 99) {
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
    expected: options.expectHttpStatusCode
  });
}

function validateHttpVersion(res: IncomingMessage, failures: Failure[], options) {

  const actual = res.httpVersion;
  const expected = options.expectHttpVersion;
  if (expected && String(actual) === String(expected)) {
    return;
  }

  failures.push({
    actual,
    cause: 'invalidHttpVersion',
    description: `Expected HTTP version to be "${expected}"`,
    expected: parseFloat(expected)
  });
}

function getHttpCertificateExpiry(req: ClientRequest) {
  if (!req.connection || !(req.connection instanceof TLSSocket)) {
    return null;
  }

  const certificate = req.connection.getPeerCertificate();
  return certificate ? moment.utc(new Date(certificate.valid_to)).format() : null;
}

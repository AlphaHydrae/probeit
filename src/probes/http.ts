import { ClientRequest, IncomingMessage, request as requestHttp, RequestOptions } from 'http';
import { request as requestHttps } from 'https';
import { Context } from 'koa';
import { assign, each, isArray, isFinite, isInteger, isNaN, isPlainObject, isString, last, merge, pick } from 'lodash';
import moment from 'moment';
import { TLSSocket } from 'tls';
import { format as formatUrl, parse as parseUrl } from 'url';
import urlJoin from 'url-join';

import { ProbeOptionError } from '../errors';
import { buildMetric, Metric } from '../metrics';
import { HttpParams } from '../options';
import { getPresetOptions } from '../presets';
import { Config, Failure, ProbeResult } from '../types';
import {
  increase, isFalseString, isTrueString, parseHttpParams, Raw, toArray,
  validateArrayOption, validateBooleanOption, validateRegExpArrayOption, validateStringOption
} from '../utils';
import { ExpectHttpRedirects, ExpectHttpStatusCode, HttpProbeOptions } from './options';

const httpStatusCodeRangeRegExp = /^(?<code>[1-5])xx$/iu;

const optionNames = [
  // Parameters
  'allowUnauthorized',
  'followRedirects',
  'headers',
  'method',
  // Expectations
  'expectHttpRedirects',
  'expectHttpRedirectTo',
  'expectHttpResponseBodyMatch',
  'expectHttpResponseBodyMismatch',
  'expectHttpSecure',
  'expectHttpStatusCode',
  'expectHttpVersion'
];

interface HttpProbeData {
  req: ClientRequest;
  res?: Response;
  state: HttpProbeState;
}

interface HttpProbeState {
  counters: {
    contentTransfer?: number;
    dnsLookup?: number;
    firstByte?: number;
    redirects?: number;
    tlsHandshake?: number;
    tcpConnection?: number;
  };
  requests: RequestOptions[];
}

export class Response extends IncomingMessage {
  body?: string;
}

export async function getHttpProbeOptions(_target: string, config: Config, ctx?: Context): Promise<HttpProbeOptions> {

  const queryOptions = {};
  if (ctx) {
    assign(queryOptions, {
      allowUnauthorized: last(toArray(ctx.query.allowUnauthorized)),
      expectHttpRedirects: last(toArray(ctx.query.expectHttpRedirects)),
      expectHttpRedirectTo: last(toArray(ctx.query.expectHttpRedirectTo)),
      expectHttpResponseBodyMatch: toArray(ctx.query.expectHttpResponseBodyMatch),
      expectHttpResponseBodyMismatch: toArray(ctx.query.expectHttpResponseBodyMismatch),
      expectHttpSecure: last(toArray(ctx.query.expectHttpSecure)),
      expectHttpStatusCode: toArray(ctx.query.expectHttpStatusCode),
      expectHttpVersion: last(toArray(ctx.query.expectHttpVersion)),
      followRedirects: last(toArray(ctx.query.followRedirects)),
      headers: parseHttpParams(ctx.query.header),
      method: last(toArray(ctx.query.method))
    });
  }

  // TODO: use presets from config
  const selectedPresets = [];
  if (ctx) {
    selectedPresets.push(...toArray(ctx.query.preset).map(String));
  }

  const presetOptions = await getPresetOptions(config, selectedPresets);

  const defaultOptions = {
    allowUnauthorized: false,
    expectHttpRedirects: ctx?.query.expectHttpRedirectTo ? true : undefined,
    expectHttpResponseBodyMatch: [],
    expectHttpResponseBodyMismatch: [],
    expectHttpStatusCode: [],
    followRedirects: true,
    headers: {},
    method: 'GET'
  };

  // TODO: fix array merge
  return validateHttpProbeOptions(merge(
    {},
    validateHttpProbeOptions(defaultOptions),
    pick(validateHttpProbeOptions(config), ...optionNames),
    pick(validateHttpProbeOptions(presetOptions), ...optionNames),
    validateHttpProbeOptions(queryOptions)
  ));
}

export async function probeHttp(target: string, options: HttpProbeOptions) {
  const probeData = await performHttpProbe(target, options);
  return getHttpMetrics(probeData.req, probeData.res, probeData.state, options);
}

export function validateHttpProbeOptions(options: Raw<HttpProbeOptions>): HttpProbeOptions {
  return {
    allowUnauthorized: validateBooleanOption(options, 'allowUnauthorized'),
    expectHttpRedirects: validateExpectHttpRedirectsOption(options),
    expectHttpRedirectTo: validateStringOption(options, 'expectHttpRedirectTo'),
    expectHttpResponseBodyMatch: validateRegExpArrayOption(options, 'expectHttpResponseBodyMatch'),
    expectHttpResponseBodyMismatch: validateRegExpArrayOption(options, 'expectHttpResponseBodyMismatch'),
    expectHttpSecure: validateBooleanOption(options, 'expectHttpSecure'),
    // TODO: parse this correctly
    expectHttpStatusCode: validateExpectHttpStatusCodeOption(options),
    expectHttpVersion: validateStringOption(options, 'expectHttpVersion'),
    followRedirects: validateBooleanOption(options, 'followRedirects'),
    headers: validateHeadersOption(options),
    method: validateStringOption(options, 'method')
  };
}

function performHttpProbe(
  target: string,
  options: HttpProbeOptions,
  state: HttpProbeState = { counters: {}, requests: [] }
): Promise<HttpProbeData> {
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

    const req = (/^https:/iu.exec(target) ? requestHttps : requestHttp)(reqOptions, res => {

      let body = '';

      res.on('readable', () => {
        if (state.counters.firstByte === undefined) {
          times.firstByteAt = new Date().getTime();
          increase(state.counters, 'firstByte', times.firstByteAt - (times.tlsHandshakeAt || times.tcpConnectionAt));
        }

        res.read();
      });

      res.on('data', chunk => {
        body += chunk;
        res.read();
      });

      res.on('end', () => {
        if (times.firstByteAt !== undefined) {
          increase(state.counters, 'contentTransfer', new Date().getTime() - times.firstByteAt);
        }

        if (options.followRedirects && res.statusCode && res.statusCode >= 301 && res.statusCode <= 302 && res.headers.location) {

          increase(state.counters, 'redirects', 1);

          resolve(performHttpProbe(
            getRedirectUrl(target, res.headers.location),
            options,
            state
          ));
        } else {
          resolve({ req, state, res: Object.assign(Object.create(res), { body }) });
        }
      });
    });

    req.on('socket', socket => {
      socket.on('lookup', () => {
        times.dnsLookupAt = new Date().getTime();
        increase(state.counters, 'dnsLookup', times.dnsLookupAt - times.start);
      });

      socket.on('connect', () => {
        times.tcpConnectionAt = new Date().getTime();
        increase(state.counters, 'tcpConnection', times.tcpConnectionAt - (times.dnsLookupAt || times.start));
      });

      socket.on('secureConnect', () => {
        times.tlsHandshakeAt = new Date().getTime();
        increase(state.counters, 'tlsHandshake', times.tlsHandshakeAt - times.tcpConnectionAt);
      });
    });

    req.on('error', () => {
      resolve({ req, state });
    });

    req.end();
  });
}

function getHttpMetrics(req: ClientRequest, res: Response | undefined, state: HttpProbeState, options: HttpProbeOptions): ProbeResult {

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

  const success = Boolean(res) && !failures.length;

  metrics.push(buildMetric(
    'httpCertificateExpiry',
    'datetime',
    getHttpCertificateExpiry(req),
    'Expiration date of the SSL certificate'
  ));

  metrics.push(buildMetric(
    'httpContentLength',
    'bytes',
    res?.headers['content-length'] ? parseInt(res.headers['content-length'] || '', 10) : null,
    'Length of the HTTP response entity in bytes'
  ));

  each(pick(state.counters, 'contentTransfer', 'dnsLookup', 'firstByte', 'tcpConnection', 'tlsHandshake'), (value, phase) => {
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
    state.counters.redirects ?? 0,
    'Number of times HTTP 301 or 302 redirects were followed'
  ));

  metrics.push(buildMetric(
    'httpSecure',
    'boolean',
    // FIXME: check whether SSL/TLS is used on final redirect (currently works at any redirect)
    state.counters.tlsHandshake !== undefined,
    'Indicates whether SSL/TLS was used for the final request'
  ));

  metrics.push(buildMetric(
    'httpStatusCode',
    'number',
    res ? res.statusCode ?? null : null,
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

function getHttpStatusRangeStart(value: string) {

  const rangeMatch = httpStatusCodeRangeRegExp.exec(value);
  if (!rangeMatch || !rangeMatch.groups) {
    return;
  }

  const code = rangeMatch.groups.code || '';
  const rangeStartNumber = parseInt(code, 10);
  return isNaN(rangeStartNumber) ? undefined : rangeStartNumber * 100;
}

function getRedirectUrl(target: string, location: string) {
  if (/^\/\/?[^/]/u.exec(location)) {
    return urlJoin(target.replace(/^(?<baseUrl>https?:\/\/[^/]+).*$/u, '$<baseUrl>'), location);
  } else if (!/^(?:https?:\/\/|\/\/)/u.exec(location)) {
    return urlJoin(target, location);
  }

  return location;
}

function validateExpectHttpRedirectsOption(options: Raw<HttpProbeOptions>): ExpectHttpRedirects | undefined {

  const value = options.expectHttpRedirects;
  if (value === undefined) {
    return;
  } else if (typeof value === 'boolean') {
    return value;
  } else if (typeof value !== 'number' && typeof value !== 'string') {
    throw new ProbeOptionError(
      `"expectHttpRedirects" option must be a boolean or an integer greater than or equal to zero; got ${typeof value}`
    );
  } else if (isFalseString(value)) {
    return false;
  } else if (isTrueString(value)) {
    return true;
  }

  const redirects = Number(value);
  if (!isInteger(redirects) || redirects < 0) {
    throw new ProbeOptionError(`"expectHttpRedirects" option must be a boolean or an integer greater than or equal to zero; got ${value}`);
  }

  return redirects;
}

function validateExpectHttpStatusCodeOption(options: Raw<HttpProbeOptions>): ExpectHttpStatusCode | undefined {

  const value = options.expectHttpStatusCode;
  if (value === undefined) {
    return;
  }

  validateArrayOption(
    options,
    'expectHttpStatusCode',
    'integers or strings',
    expectedCode => isInteger(expectedCode) || isString(expectedCode)
  );

  const result: ExpectHttpStatusCode = [];
  for (const code of options.expectHttpStatusCode) {

    const codeNumber = Number(code);
    if (isInteger(codeNumber) && codeNumber < 0) {
      throw new ProbeOptionError(`"expectHttpStatusCode" option must not contain negative numbers; got ${code}`);
    } else if (!isInteger(codeNumber) && !code.match(httpStatusCodeRangeRegExp)) {
      throw new ProbeOptionError(
        `"expectHttpStatusCode" option must contain only strings that are HTTP status code ranges (e.g. 2xx); got ${code}`
      );
    }

    result.push(isInteger(codeNumber) ? codeNumber : code);
  }

  return result;
}

function validateHeadersOption(options: HttpProbeOptions): HttpParams | undefined {

  const value = options.headers;
  if (value === undefined) {
    return;
  } else if (!isPlainObject(value)) {
    throw new ProbeOptionError(`"headers" option must be a plain object; got ${typeof value}`);
  }

  each(value, (values, key) => {
    if (typeof key !== 'string') {
      throw new ProbeOptionError(`"headers" option must have only strings as keys; got ${typeof key}`);
    } else if (!isArray(values)) {
      throw new ProbeOptionError(`"headers" option must be a map of string arrays; key "${key}" has type ${typeof values}`);
    } else if (values.some(current => typeof current !== 'string')) {
      throw new ProbeOptionError(`"headers" option must be a map of string arrays; key "${key}" has values that are not strings`);
    }
  });

  return value;
}

function validateHttpRedirects(state: HttpProbeState, failures: Failure[], options: HttpProbeOptions) {

  const expected = options.expectHttpRedirects;

  if (expected === true && !state.counters.redirects) {
    failures.push({
      cause: 'missingHttpRedirect',
      description: 'Expected the server to send an HTTP redirection'
    });
  } else if (expected === false && state.counters.redirects) {
    failures.push({
      actual: state.counters.redirects,
      cause: 'unexpectedHttpRedirect',
      description: 'Did not expect the server to send an HTTP redirection',
      expected: 0
    });
  } else if (isFinite(expected) && state.counters.redirects !== expected) {
    failures.push({
      expected,
      actual: state.counters.redirects,
      cause: 'invalidHttpRedirectCount',
      description: `Expected the HTTP request to be redirected exactly ${expected} time${expected !== 1 ? 's' : ''}`
    });
  }
}

function validateHttpRedirectTarget(state: HttpProbeState, failures: Failure[], options: HttpProbeOptions) {

  const expectedRedirect = options.expectHttpRedirectTo !== undefined ? parseUrl(options.expectHttpRedirectTo) : undefined;
  if (!expectedRedirect) {
    return;
  }

  const lastRequest = last(state.requests);
  if (
    lastRequest &&
    expectedRedirect.protocol === lastRequest.protocol &&
    expectedRedirect.host === lastRequest.host &&
    expectedRedirect.pathname === parseUrl(formatUrl(lastRequest)).pathname
  ) {
    return;
  }

  failures.push({
    actual: lastRequest ? formatUrl(lastRequest) : undefined,
    cause: 'invalidHttpRedirectLocation',
    description: `Expected the request to be redirected to ${options.expectHttpRedirectTo}`,
    expected: formatUrl(expectedRedirect)
  });
}

function validateHttpResponseBody(res: Response, failures: Failure[], options: HttpProbeOptions) {

  const body = res.body;

  if (options.expectHttpResponseBodyMatch) {
    for (const expectedMatch of options.expectHttpResponseBodyMatch) {
      if (typeof body === 'string' && new RegExp(expectedMatch, 'u').exec(body)) {
        continue;
      }

      failures.push({
        cause: 'httpResponseBodyMismatch',
        description: `Expected the HTTP response body to match the following regular expression: ${expectedMatch}`,
        expected: expectedMatch
      });
    }
  }

  if (options.expectHttpResponseBodyMismatch) {
    for (const expectedMismatch of options.expectHttpResponseBodyMismatch) {

      const match = typeof body === 'string' ? new RegExp(expectedMismatch, 'u').exec(body) : undefined;
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
}

function validateHttpSecurity(state: HttpProbeState, failures: Failure[], options: HttpProbeOptions) {
  const expectSecure = options.expectHttpSecure;
  if (expectSecure === true && state.counters.tlsHandshake === undefined) {
    failures.push({
      cause: 'insecureHttp',
      description: 'Expected the server to use SSL/TLS for the request (or final redirect)'
    });
  } else if (expectSecure === false && state.counters.tlsHandshake !== undefined) {
    failures.push({
      cause: 'unexpectedlySecureHttp',
      description: 'Did not expect the server to use SSL/TLS for the request (or final redirect)'
    });
  }
}

function validateHttpStatusCode(res: IncomingMessage, failures: Failure[], options: HttpProbeOptions) {

  const actual = res.statusCode;
  const expected = options.expectHttpStatusCode ?? [];
  if (!expected.length) {
    expected.push('2xx', '3xx');
  }

  for (const code of expected) {
    if (actual === code) {
      return;
    } else if (typeof code !== 'string') {
      continue;
    }

    const rangeStart = getHttpStatusRangeStart(code);
    if (rangeStart && actual && actual >= rangeStart && actual <= rangeStart + 99) {
      return;
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

function validateHttpVersion(res: IncomingMessage, failures: Failure[], options: HttpProbeOptions) {

  const actual = res.httpVersion;
  const expected = options.expectHttpVersion;
  if (expected === undefined || String(actual) === String(expected)) {
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

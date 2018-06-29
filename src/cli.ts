import * as yargs from 'yargs';

import { Config, whitelist } from './config';
import { parseExpectHttpRedirects } from './probes/http';
import { parseBooleanParam, parseHttpParams, parseIntegerParam } from './utils';

export interface CliOptions extends Partial<Config> {
  target?: string;
}

export function parse(): CliOptions {

  const args = yargs

    // General options
    .option('aws-access-key-id', {
      describe: 'default access key ID to use with Amazon Web Services',
      group: 'General options',
      type: 'string'
    })
    .option('aws-secret-access-key', {
      describe: 'default secret access key to use with Amazon Web Services',
      group: 'General options',
      type: 'string'
    })
    .option('config', {
      alias: 'c',
      describe: 'load configuration from a file ("config.yml" by default)',
      group: 'General options',
      type: 'string'
    })
    .option('port', {
      alias: 'p',
      coerce: parseIntegerParam,
      describe: 'listen on a specific port (3000 by default)',
      group: 'General options',
      type: 'number'
    })
    .option('presets', {
      alias: 'P',
      describe: 'load presets from a file or files ("presets/**/*.yml" by default)',
      group: 'General options',
      type: 'string'
    })
    .option('pretty', {
      coerce: parseBooleanParam,
      describe: 'produce more human-readable output (false by default)',
      group: 'General options',
      type: 'boolean'
    })

    // HTTP probe parameters
    .option('allow-unauthorized', {
      coerce: parseBooleanParam,
      describe: 'whether to consider an HTTP response with an invalid SSL certificate as a success (false by default)',
      group: 'HTTP probe parameters',
      type: 'string'
    })
    .option('follow-redirects', {
      coerce: parseBooleanParam,
      describe: 'whether the probe will follow redirects to provide metrics about the final response (true by default)',
      group: 'HTTP probe parameters',
      type: 'string'
    })
    .option('headers', {
      alias: 'header',
      array: true,
      coerce: parseHttpParams,
      default: [],
      describe: 'HTTP header to add to the probe\'s request (e.g. "Authorization=Basic YWRtaW46Y2hhbmdlbWUh")',
      group: 'HTTP probe parameters',
      type: 'string'
    })
    .option('method', {
      describe: 'the HTTP method to use for the request on the target URL ("GET" by default)',
      group: 'HTTP probe parameters',
      type: 'string'
    })

    // HTTP probe expectations
    .option('expect-http-redirects', {
      coerce: parseExpectHttpRedirects,
      description: 'if boolean, check that HTTP redirects have (or have not) occurred; if integer, check that the number of redirects is the expected one',
      group: 'HTTP probe expectations',
      type: 'string'
    })
    .option('expect-http-redirect-to', {
      description: 'check that at least 1 redirect occurs and that the final redirect is to a specific URL',
      group: 'HTTP probe expectations',
      type: 'string'
    })
    .option('expect-http-response-body-match', {
      array: true,
      default: [],
      description: 'check that the body of the final HTTP response matches a regular expression or expressions',
      group: 'HTTP probe expectations',
      type: 'string'
    })
    .option('expect-http-response-body-mismatch', {
      array: true,
      default: [],
      description: 'check that the body of the final HTTP response does NOT match a regular expression or expressions',
      group: 'HTTP probe expectations',
      type: 'string'
    })
    .option('expect-http-secure', {
      coerce: parseBooleanParam,
      description: 'check that the final HTTP request is made (or not made) over TLS (both are valid by default)',
      group: 'HTTP probe expectations',
      type: 'string'
    })
    .option('expect-http-status-code', {
      array: true,
      default: [],
      description: 'check that the HTTP status code of the final response is a specific code(s), e.g. "200", or falls within a code class, e.g. "4xx" (defaults to "2xx" and "3xx")',
      group: 'HTTP probe expectations',
      type: 'string'
    })
    .option('expect-http-version', {
      description: 'check the HTTP version of the final response',
      group: 'HTTP probe expectations',
      type: 'string'
    })

    // S3 probe parameters
    .option('s3-access-key-id', {
      describe: 'default access key ID to use with S3',
      group: 'S3 probe parameters',
      type: 'string'
    })
    .option('s3-secret-access-key', {
      describe: 'default secret access key to use with S3',
      group: 'S3 probe parameters',
      type: 'string'
    })
    .option('s3-by-prefix', {
      array: true,
      describe: 'aggregate S3 metrics by object/version prefix',
      group: 'S3 probe parameters',
      type: 'string'
    })
    .option('s3-versions', {
      coerce: parseBooleanParam,
      describe: 'whether to list object versions in the bucket and generate metrics for them (false by default)',
      group: 'S3 probe parameters',
      type: 'string'
    })

    .argv;

  if (args._.length >= 2) {
    throw new Error('This program only accepts zero or one argument');
  }

  return {
    ...whitelist(args),
    target: args._[0]
  };
}

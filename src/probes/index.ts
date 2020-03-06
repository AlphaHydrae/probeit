import { Context } from 'koa';

import { Config } from '../config';
import { ProbeResult } from '../utils';
import { getCommandProbeOptions, probeCommand } from './command';
import { getHttpProbeOptions, probeHttp } from './http';
import { getS3ProbeOptions, probeS3 } from './s3';

export function getProbe(target: string): (target: string, options: any) => Promise<ProbeResult> {
  if (/^command:/.exec(target)) {
    return probeCommand;
  } else if (/^https?:\/\//.exec(target)) {
    return probeHttp;
  } else if (/^s3:\/\//.exec(target)) {
    return probeS3;
  } else {
    throw new Error('No suitable probe found; target must be an HTTP(S) or an S3 URL (e.g. http://example.com, s3://bucket_name)');
  }
}

export function getProbeOptions(target: string, config: Config, ctx?: Context): Promise<any> {
  if (/^command:/.exec(target)) {
    return Promise.resolve(getCommandProbeOptions(target, config, ctx));
  } else if (/^https?:\/\//.exec(target)) {
    return getHttpProbeOptions(target, config, ctx);
  } else if (/^s3:\/\//.exec(target)) {
    return getS3ProbeOptions(target, config, ctx);
  } else {
    return Promise.resolve({});
  }
}

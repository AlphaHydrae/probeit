import { Context } from 'koa';

import { Config } from '../config';
import { ProbeResult } from '../utils';
import { getCommandProbeOptions, probeCommand } from './command';
import { getHttpProbeOptions, probeHttp } from './http';
import { getS3ProbeOptions, probeS3 } from './s3';

export function getProbe(target: string): (target: string, options: any) => Promise<ProbeResult> {
  if (target.match(/^command:/)) {
    return probeCommand;
  } else if (target.match(/^https?:\/\//)) {
    return probeHttp;
  } else if (target.match(/^s3:\/\//)) {
    return probeS3;
  } else {
    throw new Error('No suitable probe found; target must be an HTTP(S) or an S3 URL (e.g. http://example.com, s3://bucket_name)');
  }
}

export function getProbeOptions(target: string, config: Config, ctx?: Context) {
  if (target.match(/^command:/)) {
    return getCommandProbeOptions(target, config, ctx);
  } else if (target.match(/^https?:\/\//)) {
    return getHttpProbeOptions(target, config, ctx);
  } else if (target.match(/^s3:\/\//)) {
    return getS3ProbeOptions(target, config, ctx);
  } else {
    return {};
  }
}

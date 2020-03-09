import { HttpParams } from '../options';

export type ExpectHttpRedirects = boolean | number;
export type ExpectHttpStatusCode = Array<number | string>;

export interface HttpProbeOptions {
  allowUnauthorized?: boolean;
  expectHttpRedirects?: ExpectHttpRedirects;
  expectHttpRedirectTo?: string;
  // TODO: use RegExp here
  expectHttpResponseBodyMatch?: string[];
  expectHttpResponseBodyMismatch?: string[];
  expectHttpSecure?: boolean;
  // TODO: parse this correctly
  expectHttpStatusCode?: ExpectHttpStatusCode;
  expectHttpVersion?: string;
  followRedirects?: boolean;
  headers?: HttpParams;
  method?: string;
}

export interface S3ProbeOptions {
  s3AccessKeyId?: string;
  s3SecretAccessKey?: string;
  s3ByPrefix?: string[];
  s3ByPrefixOnly?: boolean;
  s3Versions?: boolean;
}

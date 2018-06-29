export type ProbeErrorCode =
  'ERR_PROBE_SERVER_INVALID_QUERY_PARAMETER';

export class ProbeError extends Error {
  constructor(code: ProbeErrorCode, message?: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

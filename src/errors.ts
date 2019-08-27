export type ProbeErrorCode =
  'ERR_PROBE_SERVER_INVALID_OPTION'
;

export interface ProbeErrorOptions {
  readonly expose?: boolean;
  readonly properties?: any;
  readonly status?: number;
}

export class ProbeError extends Error {

  readonly expose: boolean;
  readonly properties: any;
  readonly status: number;

  constructor(readonly code: ProbeErrorCode, message: string, options: ProbeErrorOptions = {}) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    this.properties = options.properties || {};
    this.expose = options.expose !== undefined ? options.expose : false;
    this.status = options.status !== undefined ? options.status : 500;
  }
}

export class ProbeOptionError extends ProbeError {
  constructor(message: string, options: ProbeErrorOptions = {}) {
    super('ERR_PROBE_SERVER_INVALID_OPTION', message, {
      expose: true,
      status: 400,
      ...options
    });
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

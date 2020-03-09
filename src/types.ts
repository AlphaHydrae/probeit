import { Metric } from './metrics';
import { HttpProbeOptions, S3ProbeOptions } from './probes/options';

export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface LoggerOptions {
  logLevel?: LogLevel;
}

export interface Failure {
  [key: string]: any;
  actual?: any;
  cause: string;
  description: string;
  expected?: any;
}

export interface ProbeResult {
  failures: Failure[];
  metrics: Metric[];
  success: boolean;
}

export interface GeneralOptions {
  awsAccessKeyId?: string;
  awsSecretAccessKey?: string;
}

export interface Config extends GeneralOptions, HttpProbeOptions, LoggerOptions, S3ProbeOptions {
  commands?: { [key: string]: ProbeCommand };
  config?: string;
  port?: number;
  presets?: string;
  pretty?: boolean;
}

export interface FunctionCommand {
  type: 'function';
  command(): ProbeResult | Promise<ProbeResult>;
}

export interface SystemCommand {
  type: 'system';
  command: string;
  args?: string[];
  cwd?: string;
}

export interface SystemCommandResult {
  code: number;
  stderr: string;
  stdout: string;
}

export type ProbeCommand = FunctionCommand | SystemCommand;

export interface CommandProbeOptions {
  command: ProbeCommand;
}

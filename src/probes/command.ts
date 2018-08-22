import { spawn, SpawnOptions } from 'child_process';
import { Context } from 'koa';

import { Config } from '../config';
import { buildMetric, Metric } from '../metrics';
import { Failure, ProbeResult } from '../utils';

export interface FunctionCommand {
  type: 'function';
  command(): ProbeResult;
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

export async function getCommandProbeOptions(target: string, config: Config, ctx?: Context): Promise<CommandProbeOptions> {

  const commandName = target.replace(/^command:/, '');
  if (!config.commands || !config.commands[commandName]) {
    throw new Error(`Unknown probe command "${commandName}"`);
  }

  return {
    command: config.commands[commandName]
  };
}

export async function probeCommand(target: string, options: CommandProbeOptions) {

  const failures: Failure[] = [];
  const metrics: Metric[] = [];

  const command = options.command;
  if (command.type === 'function') {

    try {
      return await command.command();
    } catch (err) {

      failures.push({
        cause: 'functionCommandError',
        description: 'The function could not be executed',
        stack: err.stack
      });

      return { failures, metrics, success: false };
    }
  }

  let code = -1;
  let success = false;

  try {

    const result = await executeSystemCommand(command.command, command.args, {
      cwd: command.cwd
    });

    code = result.code;
    success = code === 0;
  } catch (err) {
    failures.push({
      cause: 'systemCommandError',
      description: 'The command could not be executed'
    });
  }

  metrics.push(buildMetric(
    'commandExitCode',
    'number',
    code,
    'The exit code of the executed command'
  ));

  return { failures, metrics, success };
}

function executeSystemCommand(command: string, args?: string[], options?: SpawnOptions): Promise<SystemCommandResult> {

  const spawned = spawn(command, args, options);

  return new Promise((resolve, reject) => {

    let stdout = '';
    let stderr = '';

    spawned.stdout.on('data', data => {
      stdout += data;
    });

    spawned.stderr.on('data', data => {
      stderr += data;
    });

    spawned.on('error', reject);

    spawned.on('close', code => {
      resolve({
        code,
        stderr,
        stdout
      });
    });
  });
}

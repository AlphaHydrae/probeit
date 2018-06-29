import { Config } from '../config';
import { probe } from '../probe';

export async function probeCli(target: string, config: Config) {
  const result = await probe(target, config);
  process.stdout.write(JSON.stringify(result, undefined, config.pretty ? 2 : undefined));
}

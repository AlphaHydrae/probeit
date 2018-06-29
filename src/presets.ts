import * as glob from 'glob-promise';
import { difference, isPlainObject, merge, pick, reduce } from 'lodash';

import { Config } from './config';
import { loadConfig } from './utils';

const LOADED_PRESETS = Symbol('loadedPresets');

export async function getPresetOptions(config: Config, selectedPresets: string[]): Promise<Partial<Config>> {
  if (!selectedPresets.length) {
    return {};
  }

  const presets = await load(config);

  const unknownPresets = difference(selectedPresets, Object.keys(presets));
  if (unknownPresets.length) {
    throw new Error(`The following presets are not defined: ${unknownPresets.map(preset => `"${preset}"`).join(', ')}`);
  }

  return reduce(pick(presets, ...selectedPresets), (memo, preset, _) => merge(memo, preset), {});
}

export async function load(config: Config) {
  if (config.presets && !config[LOADED_PRESETS]) {

    const matchingFiles = await glob(config.presets);
    const presetObjects = await Promise.all(matchingFiles.map(loadPreset));

    config[LOADED_PRESETS] = presetObjects.reduce((memo, presets, _) => merge(memo, presets), {});
  }

  return config[LOADED_PRESETS];
}

async function loadPreset(file: string) {

  const preset = await loadConfig(file);
  if (!isPlainObject(preset)) {
    throw new Error(`Preset file "${file}" does not export a plain object`);
  }

  return preset;
}

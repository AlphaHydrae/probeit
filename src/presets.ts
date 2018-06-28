const glob = require('glob-promise');
const { difference, isPlainObject, merge, pick, reduce } = require('lodash');

const { loadConfig } = require('./utils');

const LOADED_PRESETS = Symbol('loadedPresets');

exports.getPresetOptions = async function(config, selectedPresets) {
  if (!selectedPresets.length) {
    return {};
  }

  const presets = await exports.load(config);

  const unknownPresets = difference(selectedPresets, Object.keys(presets));
  if (unknownPresets.length) {
    throw new Error(`The following presets are not defined: ${unknownPresets.map(preset => `"${preset}"`).join(', ')}`);
  }

  return reduce(pick(presets, ...selectedPresets), (memo, preset) => merge(memo, preset), {});
};

exports.load = async function(config) {
  if (!config[LOADED_PRESETS]) {

    const matchingFiles = await glob(config.presets);
    const presetObjects = await Promise.all(matchingFiles.map(loadPreset));

    config[LOADED_PRESETS] = presetObjects.reduce((memo, presets) => merge(memo, presets), {});
  }

  return config[LOADED_PRESETS];
};

function loadPreset(file) {

  const preset = loadConfig(file);
  if (!isPlainObject(preset)) {
    throw new Error(`Preset file "${file}" does not export a plain object`);
  }

  return preset;
}

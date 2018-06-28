const glob = require('glob-promise');
const { isPlainObject } = require('lodash');

const { loadConfig } = require('./utils');

exports.load = async function(config) {

  const matchingFiles = await glob(config.presets);
  const presetObjects = await Promise.all(matchingFiles.map(loadPreset));

  return presetObjects.reduce((memo, preset) => ({ ...memo, ...preset }), {});
};

function loadPreset(file) {

  const preset = loadConfig(file);
  if (!isPlainObject(preset)) {
    throw new Error(`Preset file "${file}" does not export a plain object`);
  }

  return preset;
}

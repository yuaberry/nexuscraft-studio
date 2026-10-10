const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

// pnpm workspace: let Metro see the shared @voxel/core sources
config.watchFolders = [path.resolve(__dirname, "../../packages/core")];
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, "node_modules"),
  path.resolve(__dirname, "../../node_modules"),
];

module.exports = config;

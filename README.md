# Electron Bytenode Webpack Plugin

Inspired by [bytenode-webpack-plugin](https://www.npmjs.com/package/bytenode-webpack-plugin).

A [webpack](https://webpack.js.org/) plugin that simplifies compiling your JS
source code into V8 bytecode using [Bytenode](https://github.com/OsamaAbbas/bytenode).

Essentially converts raw `.js` files in your output into compiled `.jsc` files.

## Install

```
  npm install --save-dev electron-bytenode-webpack-plugin
```

```
  yarn add --dev electron-bytenode-webpack-plugin
```

## Usage

```javascript
// webpack.config.js

const ElectronBytenodeWebpackPlugin = require('electron-bytenode-webpack-plugin')

module.exports = {
  entry: 'index.js',
  output: {
    path: __dirname + '/dist',
    filename: 'index_bundle.js'
  },
  plugins: [
    new ElectronBytenodeWebpackPlugin()
  ]
}
```

## Options

| Name                  | Type      | Default | Description                                                    |
|-----------------------|-----------|---------|----------------------------------------------------------------|
| **`compileAsModule`** | `boolean` | `true`  | Allow the resulting `.jsc` file to be used as a module or not. |
| **`keepSource`**      | `boolean` | `false` | Keep JS source files in output or not.                         |

To use options:

```javascript
// webpack.config.js

const ElectronBytenodeWebpackPlugin = require('electron-bytenode-webpack-plugin')

module.exports = {
  entry: 'index.js',
  output: {
    path: __dirname + '/dist',
    filename: 'index_bundle.js'
  },
  plugins: [
    new ElectronBytenodeWebpackPlugin({
        compileAsModule: false,
        keepSource: true
    })
  ]
}
```

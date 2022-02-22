const Module = require('module');
const bytenode = require('bytenode');

require('v8').setFlagsFromString('--no-lazy');

class ElectronBytenodeWebpackPlugin {
  // copied from webpack/lib/Compilation.js
  static PROCESS_ASSETS_STAGE_OPTIMIZE_TRANSFER = 3000;

  constructor(options = {}) {
    this.options = Object.assign({
      compileAsModule: true,
      keepSource: false,
      exclude: [],
    }, options);
  }

  apply(compiler) {
    const pluginName = this.constructor.name;

    compiler.hooks.thisCompilation.tap(pluginName, compilation => {
      const { RawSource } = compiler.webpack.sources;

      compilation.hooks.processAssets.tapPromise(
        {
          name: pluginName,
          stage: compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_OPTIMIZE_TRANSFER,
          additionalAssets: true,
        },
        async assets => {
          const assetsForProcess = Object
            .keys(assets)
            .filter(name => {
              const { info } = compilation.getAsset(name);
              if(!/\.js$/.test(name) && !/\.html$/.test(name)) return false;
              if(info.bytenodeProcessed) return false;
              return true;
            })
            .map(name => {
              const { source } = compilation.getAsset(name);
              return { name, source: source.source() };
            });
          if(assetsForProcess.length === 0) return;

          const processedJsFile = [];
          for(let { name, source } of assetsForProcess.filter(({ name }) => /\.js$/.test(name))) {
            if(this.options.exclude.some(e => name.includes(e))) continue;

            processedJsFile.push(name);

            if(this.options.compileAsModule) source = Module.wrap(source);
            const buffer = await bytenode.compileElectronCode(source);
            compilation.emitAsset(name.replace('.js', '.jsc'), new RawSource(buffer), { bytenodeProcessed: true });
            if(!this.options.keepSource) {
              compilation.deleteAsset(name);
            }
          }
          if(processedJsFile.length === 0) return;

          for(let { name, source } of assetsForProcess.filter(({ name }) => /\.html$/.test(name))) {
            let isFirst = true;
            for(const jsName of processedJsFile) {
              try {
                const regex = new RegExp(`<script[^>]+src="\\w+://./${jsName}"></script>`, 'g');
                let regex_exec = regex.exec(source);
                let prefix = '<script>';
                if(isFirst) {
                  prefix += `const path=require('path');require('bytenode');`;
                  isFirst = false;
                }
                let jsc_path = `path.join(process.resourcesPath,'app.asar','/${jsName}c')`;
                let replace = `${prefix}try{require(${jsc_path})}catch(error){console.error('Require JSC Error:',error)}</script>`;
                source = source.replace(regex_exec[0], '');
                source = source.replace('</body>', `${replace}</body>`);

                const removeRegex = new RegExp(`<link href="/${jsName}" rel="modulepreload" as="script">`, 'g');
                source = source.replace(removeRegex, '');

                compilation.updateAsset(name, new RawSource(source), { bytenodeProcessed: true });
              } catch(error) {
                compilation.errors.push('Regex Error:', error);
              }
            }
          }
        }
      );
    });
  }
}

module.exports = ElectronBytenodeWebpackPlugin;

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

          for(let { name, source } of assetsForProcess) {
            if(/\.js$/.test(name)) {
              if(this.options.compileAsModule) source = Module.wrap(source);

              const buffer = await bytenode.compileElectronCode(source);
              compilation.emitAsset(name.replace('.js', '.jsc'), new RawSource(buffer), { bytenodeProcessed: true });
              if(!this.options.keepSource) {
                compilation.deleteAsset(name);
              }
            }

            if(/\.html$/.test(name)) {
              try {
                const regex = /<script.+?src=\"app:\/\/\.(\S*?).js\"><\/script>/;
                let reg_exec;
                let isFirst = true;
                while((reg_exec = regex.exec(source)) != null) {
                  let jsc = `${reg_exec[1]}.jsc`;
                  let prefix = '<script>';
                  if(isFirst) {
                    prefix += `const path=require('path');const bytenode=require('bytenode');`;
                    isFirst = false;
                  }

                  let jsc_path = `path.join(process.resourcesPath,'app.asar','${jsc}')`;
                  let replace = `${prefix}try{require(${jsc_path})}catch(error){console.log("require jsc error:",error)}</script>`;
                  source = source.replace(reg_exec[0], '');
                  source = source.replace('</body>', `${replace}</body>`);
                }

                const removeRegex = /<link href=\"\S*?\" rel="modulepreload" as=\"script\">/g;
                source = source.replace(removeRegex, '');

                compilation.updateAsset(name, new RawSource(source), { bytenodeProcessed: true });
              } catch(error) {
                compilation.errors.push('regex error:', error);
              }
            }
          }
        }
      );
    });
  }
}

module.exports = ElectronBytenodeWebpackPlugin;

import typescript from '@rollup/plugin-typescript';

const basePathname = 'dist/model-viewer-vue';
const input = 'src/index.ts';
const plugins = [typescript()];
const external = [
  /^three\/?/,
  'vue'
];

export default [
  {
    input,
    output: {
      file: `${basePathname}.esm.js`,
      format: 'es',
      sourcemap: true
    },
    plugins,
    external
  },
  {
    input,
    output: {
      file: `${basePathname}.common.js`,
      format: 'cjs',
      sourcemap: true
    },
    plugins,
    external
  }
];

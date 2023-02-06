import nodeResolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import replace from '@rollup/plugin-replace'

export default [{
  input: './src/p2pt/dist/p2pt.umd.js',
  output: {
    name: 'P2PT',
    file: './src/es/p2pt.js',
    format: 'es',
    sourcemap: false
  }
},
{
  input: './src/es/P2ptProvider.js',
  external: [
    id => /^(yjs)/.test(id)
  ],
  output: {
    name: 'Y-P2PT',
    file: './src/es/y-p2pt.js',
    format: 'es',
    sourcemap: false
  },
  plugins: [
    commonjs(),
    nodeResolve(),
    replace({
      values: {
        'yjs': 'yjs.js'
      }
    })
  ]
}]

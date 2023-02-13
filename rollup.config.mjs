import nodeResolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'

export default [{
  input: './src/es/P2ptProvider.js',
  external: id => /^(\.\/yjs\.js|yjs)/.test(id),
  output: {
    name: 'Y-P2PT',
    file: './src/es/y-p2pt.js',
    format: 'es',
    sourcemap: false
  },
  plugins: [
    commonjs(),
    nodeResolve()
  ],
  watch: {
    include: './src/es/P2ptProvider.js'
  }
}]

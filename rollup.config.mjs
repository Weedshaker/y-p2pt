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
  input: './src/y-webrtc/src/y-webrtc.js',
  external: [
    id => /^(yjs)/.test(id),
    id => /^(simple-peer)/.test(id)
  ],
  output: {
    name: 'Y-WEBRTC',
    file: './src/es/y-p2pt.js',
    format: 'es',
    sourcemap: false
  },
  plugins: [
    commonjs(),
    nodeResolve(),
    replace({
      values: {
        'yjs': 'yjs.js',
        'simple-peer/simplepeer.min.js': '../../es/Peer.js'
      }
    })
  ]
}]

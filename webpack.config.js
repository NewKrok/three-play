import path from 'path';
import TerserPlugin from 'terser-webpack-plugin';
import { fileURLToPath } from 'url';
import { BundleAnalyzerPlugin } from 'webpack-bundle-analyzer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
  entry: './dist/index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'three-play.min.js',
    module: true,
    library: {
      type: 'module',
    },
  },
  experiments: {
    outputModule: true,
  },
  mode: 'production',
  resolve: {
    extensions: ['.ts', '.js'],
    mainFields: ['module', 'main'],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  optimization: {
    usedExports: true,
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          compress: {
            drop_console: true,
          },
          format: {
            comments: false,
          },
        },
      }),
    ],
  },
  plugins: [
    new BundleAnalyzerPlugin({
      analyzerMode: 'json',
      reportFilename: '../bundle-report.json',
      openAnalyzer: false,
      sourceType: 'module',
    }),
  ],
  externals: {
    three: 'THREE',
    // Externalize all Three.js examples modules
    'three/examples/jsm/postprocessing/EffectComposer.js': 'THREE.EffectComposer',
    'three/examples/jsm/postprocessing/RenderPass.js': 'THREE.RenderPass',
    'three/examples/jsm/postprocessing/SSAOPass.js': 'THREE.SSAOPass',
    'three/examples/jsm/postprocessing/UnrealBloomPass.js': 'THREE.UnrealBloomPass',
    'three/examples/jsm/postprocessing/ShaderPass.js': 'THREE.ShaderPass',
    'three/examples/jsm/postprocessing/OutputPass.js': 'THREE.OutputPass',
    'three/examples/jsm/shaders/FXAAShader.js': 'THREE.FXAAShader',
    // Externalize @newkrok/three-utils
    '@newkrok/three-utils': 'ThreeUtils',
  },
};

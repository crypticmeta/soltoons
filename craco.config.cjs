const webpack = require('webpack');
const webpackResolve = require('craco-webpack-resolve');
const { getConfigFileParsingDiagnostics } = require('typescript');

module.exports = {
  babel: {
    presets: [['@babel/preset-react', { runtime: 'automatic', importSource: '@emotion/react' }]],
    plugins: ['@emotion/babel-plugin'],
  },
  eslint: {
    enable: false,
  },
  typescript: { enableTypeChecking: false },
  webpack: {
    configure: (config) => {
      config.ignoreWarnings = [/Failed to parse source map/];
      config.plugins.unshift(
        new webpack.ProvidePlugin({
          Buffer: ['buffer', 'Buffer'],
        })
      );
      config.plugins.push(
        new webpack.ProvidePlugin({
          process: 'process/browser',
        })
      );

      // config.module.rules.push({
      //   test: /\.m?js/,
      //   resolve: {
      //     fullySpecified: false,
      //   },
      // });

      // solana wallet adapter, ledger need to be transpiled
      // config.module.rules.push({
      //   test: /\.js/,
      //   loader: require.resolve('babel-loader'),
      //   exclude: (file) =>
      //     !file.includes('@solana/wallet-adapter') &&
      //     !file.includes('@ledgerhq/devices') &&
      //     !file.includes('@saberhq/use-solana'),
      // });
      return config;
    },
  },
  plugins: [
    {
      plugin: webpackResolve,
      options: {
        resolve: {
          fallback: {
            fs: false,
            os: false,
            path: false,
            // process: false,
            crypto: require.resolve('crypto-browserify/'),
            // assert: require.resolve('assert/'),
            // util: require.resolve('util/'),
            buffer: require.resolve('buffer/'),
            stream: require.resolve('stream-browserify/'),
          },
        },
      },
    },
  ],
};

// craco.config.js
// module.exports = {
//   style: {
//     postcssOptions: {
//       plugins: [require('tailwindcss'), require('autoprefixer')],
//     },
//   }
// };


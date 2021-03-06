const os = require('os');
const fs = require('fs');
const webpack = require('webpack');
const merge = require('webpack-merge');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const HappyPack = require('happypack');
const lessToJs = require('less-vars-to-js');

const { resolve, getConfig } = require('../utils');

const envConfig = getConfig();
const envWebpackConfig = envConfig.webpack || {};
const envBuildConfig = envConfig.build || {};
const happyThreadPool = HappyPack.ThreadPool({ size: os.cpus().length });
const themeVariables = lessToJs(
  fs.readFileSync(resolve('client/style/themeVars.less'), 'utf8')
);

const baseConfig = {
  entry: [resolve('client/index.tsx')],
  output: {
    path: resolve('dist'),
    publicPath: '/',
    filename: '[name].[hash].js',
  },
  resolve: {
    modules: [resolve('node_modules')],
    extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
    alias: {
      '@': resolve('client'),
    },
  },
  module: {
    noParse: /es6-promise\.js$/,
    rules: [
      {
        test: /\.(ts|tsx)$/,
        use: ['happypack/loader?id=ts'],
        include: resolve('client'),
        exclude: /node_modules/,
      },
      {
        test: /\.(js|jsx)$/,
        use: ['happypack/loader?id=babel'],
        include: resolve('client'),
        exclude: /node_modules/,
      },
      {
        test: /\.(css|less)$/,
        use: ['happypack/loader?id=style'],
      },
      {
        test: /\.(png|jpg|gif|svg)$/,
        use: ['happypack/loader?id=url'],
        include: [
          resolve('client/assets/images'),
          resolve('client/assets/fonts'),
        ],
        exclude: /node_modules/,
      },
    ],
  },
  performance: {
    hints: false,
  },
  optimization: {
    splitChunks: {
      cacheGroups: {
        vendors: {
          name: 'vender',
          test(module) {
            return (
              /node_modules/.test(module.context) &&
              !/\.css$/.test(module.request)
            );
          },
          chunks: 'initial',
          priority: 1,
        },
        commons: {
          name: 'common',
          test: /[\\/]client[\\/]common[\\/]/,
          chunks: 'initial',
          priority: -1,
          reuseExistingChunk: true,
        },
      },
    },
  },
  plugins: [
    new webpack.DllReferencePlugin({
      context: resolve('server/static/js'),
      manifest: require('../vendors-manifest.json'),
    }),
    new HappyPack({
      id: 'ts',
      loaders: [
        'babel-loader',
        {
          loader: 'ts-loader',
          options: {
            happyPackMode: true,
            configFile: resolve('tsconfig.json'),
          },
        },
      ],
      threadPool: happyThreadPool,
    }),
    new HappyPack({
      id: 'babel',
      loaders: ['babel-loader'],
      threadPool: happyThreadPool,
    }),
    new HappyPack({
      id: 'url',
      loaders: [
        {
          loader: 'url-loader',
          options: {
            limit: 1024 * 8,
            name: '[name].[ext]?[hash]',
          },
        },
      ],
      threadPool: happyThreadPool,
    }),
    new HtmlWebpackPlugin({
      minify: {
        removeComments: true,
        collapseWhitespace: true,
        minifyCSS: true,
      },
      filename: 'index.html',
      template: resolve('server/views/template.html'),
    }),
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'dev'),
    }),
    new CopyWebpackPlugin([
      {
        from: resolve('client/static'),
        to: 'static',
      },
    ]),
  ],
};

const styleLoaders = [
  { loader: 'css-loader' },
  // { loader: 'postcss-loader' },
  {
    loader: 'less-loader',
    options: {
      modifyVars: themeVariables,
    },
  },
];
if (envBuildConfig.extract) {
  styleLoaders.unshift(
    { loader: 'style-loader' },
    { loader: MiniCssExtractPlugin.loader }
  );
  baseConfig.plugins.push(
    new MiniCssExtractPlugin({
      filename: '[name].css',
      chunkFilename: '[id].css',
    })
  );
} else {
  styleLoaders.unshift({ loader: 'style-loader' });
}
baseConfig.plugins.push(
  new HappyPack({
    id: 'style',
    loaders: styleLoaders,
    threadPool: happyThreadPool,
  })
);

module.exports = merge(baseConfig, envWebpackConfig);

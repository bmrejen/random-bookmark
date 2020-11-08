const webpack = require('webpack');
const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');

const pkg = require('./package.json');

console.log('ENV', process.env.NODE_ENV);

module.exports = {
  mode: process.env.NODE_ENV,
  target: 'web',
  devtool: 'source-map',
  context: path.resolve(__dirname, './src'),
  entry: {
    background: './background.js',
    options: './options.js',
    newtab: './newtab.js',
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, './build'),
  },
  module: {
    rules: [
      {
        test: /\.m?js$/,
        exclude: /(node_modules)/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-react'],
          },
        },
      },
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  plugins: [
    new CopyWebpackPlugin([
      { from: 'static', to: 'static' },
      {
        from: 'manifest.json',
        transform(content) {
          const data = JSON.parse(content);
          data.version = pkg.version;

          return JSON.stringify(data);
        },
      },
    ]),
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
    }),
  ],
};

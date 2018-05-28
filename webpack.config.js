const path = require('path')
const UglifyJsPlugin = require('uglifyjs-webpack-plugin')

module.exports = {
  mode: 'production',
  entry: {
    'active-record': `./src/active-record.js`,
    'active-record.min': `./src/active-record.js`
  },
  devtool: "source-map",
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: "[name].js"
  },
  module: {
    rules: [
      { test: /src.*\.js$/, use: [{ loader: "ng-annotate-loader" }] }
    ]
  },
  optimization: {
    minimizer: [
      new UglifyJsPlugin({
        cache: true,
        parallel: true,
        include: /\.min\.js$/,
        uglifyOptions: {
          compress: false,
          ecma: 6,
          mangle: true
        }
      })
    ]
  }
}

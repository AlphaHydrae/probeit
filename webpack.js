module.exports = {
  entry: './src/index.ts',
  mode: process.env.WEBPACK_MODE || 'development',
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: [
          { loader: 'ts-loader' }
        ],
        exclude: /node_modules/
      }
    ]
  },
  resolve: {
    extensions: [ '.js', '.ts' ]
  },
  devtool: 'source-map',
  output: {
    filename: 'lib/probeit.js',
    sourceMapFilename: 'lib/probeit.map.js',
    libraryTarget: 'commonjs',
    path: __dirname
  }
};

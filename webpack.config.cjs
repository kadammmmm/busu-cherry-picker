const path = require("path");
const Dotenv = require("dotenv-webpack");

const isProduction = process.env.NODE_ENV === "production";

const config = {
  mode: isProduction ? "production" : "development",
  
  entry: "./src/widget-call-selector.js",
  
  output: {
    path: path.resolve(__dirname, "src/build"),
    filename: "bundle.js",
    publicPath: "build/",
    clean: true
  },
  
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
          options: {
            presets: [
              ["@babel/preset-env", {
                targets: {
                  browsers: [
                    "last 2 Chrome versions",
                    "last 2 Firefox versions",
                    "last 2 Safari versions",
                    "last 2 Edge versions"
                  ]
                },
                modules: false
              }]
            ]
          }
        }
      },
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"]
      }
    ]
  },
  
  plugins: [
    new Dotenv({
      systemvars: true,
      safe: false
    })
  ],
  
  resolve: {
    extensions: [".js", ".json"]
  },
  
  optimization: {
    minimize: isProduction,
    usedExports: true
  },
  
  devtool: isProduction ? "source-map" : "eval-source-map",
  
  performance: {
    hints: isProduction ? "warning" : false,
    maxEntrypointSize: 512000,
    maxAssetSize: 512000
  },
  
  stats: {
    colors: true,
    modules: false,
    children: false,
    chunks: false,
    chunkModules: false
  }
};

module.exports = config;

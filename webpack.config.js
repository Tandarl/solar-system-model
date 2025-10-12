const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin')
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const CopyPlugin = require("copy-webpack-plugin");

module.exports = (env) => {
    return {
        mode: env.mode,
        devtool: false,
        module: {
            rules: [
                {
                    test: /\.scss$/i,
                    exclude: /node_modules/,
                    use: [
                        MiniCssExtractPlugin.loader,
                        // Translates CSS into CommonJS
                        "css-loader",
                        // Compiles Sass to CSS
                        "sass-loader",
                    ],
                },
            ]
        },
        entry: path.resolve(__dirname, 'source', 'js', 'index.js'),
        output: {
            path: path.resolve(__dirname, 'build'),
            filename: 'bundle.[contenthash].js',
            clean: true
        },
        

        plugins: [
            new HtmlWebpackPlugin({ template: path.resolve(__dirname, "public", "index.html") }),
            new CopyPlugin({
                patterns: [
                    {
                        from: path.resolve(__dirname, "source/assets"),
                        to: path.resolve(__dirname, "build/assets")
                    }
                ]
            }),
            new MiniCssExtractPlugin()
        ],

    };
}
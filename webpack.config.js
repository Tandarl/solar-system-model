const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin')
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const CopyPlugin = require("copy-webpack-plugin");

module.exports = (env) => {
    return {
        mode: env.mode,
        devtool: 'source-map',
        module: {
            rules: [
                {
                    test: /\.(glsl|vs|fs|vert|frag)$/,
                    exclude: /node_modules/,
                    use: [
                        'webpack-glsl-loader',
                    ]
                },
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
                {
                    test: /\.(woff|woff2|eot|ttf|otf)$/i,
                    type: 'asset/resource',
                },
            ]
        },
        entry: path.resolve(__dirname, 'source', 'js', 'index.js'),
        output: {
            path: path.resolve(__dirname, 'docs'),
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
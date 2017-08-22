var webpack = require('webpack');
var path = require('path');

module.exports = {
    entry: ["whatwg-fetch", "./src/index.tsx"],
    output: {
        filename: "bundle.js",
        path: path.join(__dirname, 'dist'),
        publicPath: "assets"
    },

    devtool: "source-map",

    resolve: {
        extensions: ["", ".webpack.js", ".web.js", ".ts", ".tsx", ".js"],       
    },

    module: {
        loaders: [
            {test: /\.tsx?$/, loader: "ts-loader"},
        ]
    },

    plugins: [
        new webpack.HotModuleReplacementPlugin()
    ],

    devServer: {
        proxy: {
            "/sparql-endpoint": {
                target: process.env.SPARQL_ENDPOINT || 'https://library-ontodia-org.herokuapp.com/sparql',
                pathRewrite: {'/sparql-endpoint' : ''},
                changeOrigin: true,
                secure: false,
            },
        },
    },
};

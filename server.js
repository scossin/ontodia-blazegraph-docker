const express = require('express');
const proxy = require('http-proxy-middleware');
const path = require('path');

const Server = {
    app: function () {
        const app = express();

        const indexPath = path.join(__dirname, 'index.html')
        const publicPath = express.static(path.join(__dirname, 'dist'))

        const sparqlProxy = proxy("/sparql-endpoint", {
            target: process.env.SPARQL_ENDPOINT || 'https://library-ontodia-org.herokuapp.com/sparql',
            pathRewrite: {'/sparql-endpoint' : ''},
            changeOrigin: true,
            secure: false,
            onProxyRes: (proxyRes) => {
                proxyRes.headers['Cache-Control'] = 'max-age=600';
                delete proxyRes.headers['pragma']
            }
        });
        app.use("/sparql-endpoint", sparqlProxy);

        app.use('/assets', publicPath);
        app.get('/*', function(_, res) { res.sendFile(indexPath)});

        return app;
    }
};

const port = (process.env.PORT || 8080);
const app = Server.app();

app.listen(port);
console.log(`Listening at http://localhost:${port}`);

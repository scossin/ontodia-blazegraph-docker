const express = require('express');
const proxy = require('http-proxy-middleware');
const path = require('path');
const bodyParser = require('body-parser');
const NodeCache = require('node-cache');
const modifyResponse = require('http-proxy-response-rewrite');

const Server = {
    app: function () {
        const app = express();

        // configuring cache to cache sparql results for 24 hours
        const cache = new NodeCache({stdTTL: 24*3600});
        // we need parser to get sparql query
        const parser = bodyParser.text({type: '*/*', limit: '10mb'});

        const indexPath = path.join(__dirname, 'index.html');
        const publicPath = express.static(path.join(__dirname, 'dist'));

        // configuring sparql proxy to handle already parsed body (onProxyReq -
        // by default body is not parsed yet and is a stream)
        // and to store result in cache (onProxyRes)
        const sparqlProxy = proxy("/sparql-endpoint", {
            target: process.env.SPARQL_ENDPOINT || 'https://library-ontodia-org.herokuapp.com/sparql',
            pathRewrite: {'/sparql-endpoint' : ''},
            changeOrigin: true,
            secure: false,
            auth: process.env.SPARQL_AUTH || undefined,
            onProxyReq: (proxyReq, req, res, options) => {
                if (req.body) {
                    let bodyData = req.body;
                    proxyReq.setHeader('Content-Type', req.headers['content-type']);
                    proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
                    // stream the content
                    proxyReq.write(bodyData);
                }
            },
            onProxyRes: (proxyRes, req, res) => {
                modifyResponse(res, proxyRes.headers['content-encoding'], function (body) {
                    if (body) {
                        cachePut('node-backend-proxy', req.cacheName, req.cacheKey, {
                            body: body,
                            contentType: res.getHeader('content-type')
                        });
                    }
                    return body; // return value can be a promise
                });
            }
        });

        const backendCacheGet  = (req, res, next) => {
            const cacheKey = requestCacheKey(req);
            const cacheName = req.path;
            const reqest = req;
            cacheGet('node-backend-proxy', cacheName, cacheKey).then(cachedResult => {
                if (cachedResult != null) {
                    res.contentType(cachedResult.contentType);
                    res.write(cachedResult.body);
                    res.end();
                } else {
                    reqest.cacheKey = cacheKey;
                    reqest.cacheName = cacheName;
                    next();
                }
            });
        };

        // returns cache key from request to be used. Cache-agnostic
        function requestCacheKey(req) {
            // use full request body as a key
            return {sparql: req.body};
        }

        // implementation of cache get
        function cachePut(service, entityCode, entityKey, entity) {
            cache.set(getKey(entityKey), entity);
        }

        // implementation of cache put
        function cacheGet(service, entityCode, entityKey) {
            return new Promise((resolve, reject) => {
                const object = cache.get(getKey(entityKey));
                resolve(object);
            });
        }

        // transformation of generic key to cache-specific key. Might use JSON.stringify or a hash here.
        function getKey(key) {
            return JSON.stringify(key);
        }

        app.use("/sparql-endpoint", parser, backendCacheGet, sparqlProxy);

        app.use('/assets', publicPath);
        app.get('/*', function(_, res) { res.sendFile(indexPath)});

        return app;
    }
};

const port = (process.env.PORT || 8080);
const app = Server.app();

app.listen(port);
console.log(`Listening at http://localhost:${port}`);

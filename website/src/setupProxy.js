const {createProxyMiddleware} = require('http-proxy-middleware');

module.exports = function (app) {
    app.use(
        createProxyMiddleware('/localhost.content/config.json', {
            target: 'https://dev.example.com',
            changeOrigin: true,
            pathRewrite: {
                '^/localhost.content/config.json': '/dev.example.com.content/config.json'
            }
        }),
        createProxyMiddleware('/api/**', {
            target: 'https://dev.example.com',
            changeOrigin: true,
        })
    );
};
module.exports = {
  '/api/callcenter': {
    target: 'http://ipcc618.qytest.netease.com',
    changeOrigin: true,
    pathRewrite: {
      '^/api/callcenter': '/api/callcenter',
    },
  },
};

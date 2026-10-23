'use strict';

const translateHandler = require('../../api/translate.js');

exports.handler = async function netlifyTranslateHandler(event) {
  const headers = Object.fromEntries(
    Object.entries(event.headers || {}).map(([key, value]) => [key.toLowerCase(), value]),
  );
  const request = {
    method: event.httpMethod,
    headers,
    body: event.isBase64Encoded
      ? Buffer.from(event.body || '', 'base64').toString('utf8')
      : event.body,
    socket: {
      remoteAddress: headers['x-nf-client-connection-ip'] || headers['x-forwarded-for'] || 'unknown',
    },
  };

  const responseHeaders = {};
  let statusCode = 200;
  let responseBody = '';
  const response = {
    setHeader(name, value) {
      responseHeaders[name] = value;
      return this;
    },
    status(code) {
      statusCode = code;
      return this;
    },
    json(value) {
      responseBody = JSON.stringify(value);
      return this;
    },
  };

  await translateHandler(request, response);
  return {
    statusCode,
    headers: { ...responseHeaders, 'Content-Type': 'application/json; charset=utf-8' },
    body: responseBody,
  };
};

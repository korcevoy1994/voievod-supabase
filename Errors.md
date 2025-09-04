
MAIB Payment Request Details: {
  clientIp: '94.243.68.122',
  orderId: '59b91ec8-9b92-4131-aeb9-456810985597',
  totalPrice: 600,
  priceType: 'number',
  baseUrl: 'https://www.voievodul.md',
  headers: {
    'x-forwarded-for': '94.243.68.122',
    'x-real-ip': '94.243.68.122',
    'cf-connecting-ip': null
  }
}
MAIB Token Request: {
  baseUrl: 'https://api.maibmerchants.md/v1',
  projectId: '9FCC082D-A6A9-4343-82F2-8A716DD6676C',
  hasProjectSecret: true,
  timestamp: '2025-09-04T13:21:57.655Z'
}
MAIB Token Response: {
  hasResult: true,
  hasAccessToken: true,
  resultKeys: [ 'result', 'ok' ]
}
MAIB Payment Request: {
  url: 'https://api.maibmerchants.md/v1/pay',
  hasToken: true,
  requestBody: {
    amount: 600,
    currency: 'MDL',
    clientIp: '94.243.68.122',
    language: 'ro',
    orderId: '59b91ec8-9b92-4131-aeb9-456810985597',
    description: 'Оплата заказа #59b91ec8-9b92-4131-aeb9-456810985597',
    okUrl: 'https://www.voievodul.md/checkout/success?orderId=59b91ec8-9b92-4131-aeb9-456810985597',
    failUrl: 'https://www.voievodul.md/checkout/fail?orderId=59b91ec8-9b92-4131-aeb9-456810985597',
    callbackUrl: 'https://www.voievodul.md/api/payments/maib/callback'
  },
  timestamp: '2025-09-04T13:21:57.969Z'
}
MAIB Payment Error: {
  status: 403,
  statusText: 'Forbidden',
  errorMessage: '11101: Unregistered IP: 3.72.67.120',
  responseText: '{"errors":[{"errorCode":"11101","errorMessage":"Unregistered IP: 3.72.67.120","errorArgs":{"ip":"3.72.67.120"}}],"ok":false}',
  headers: {
    connection: 'keep-alive',
    'content-encoding': 'br',
    'content-type': 'application/json',
    date: 'Thu, 04 Sep 2025 13:21:58 GMT',
    'strict-transport-security': 'max-age=3600, max-age=31536000',
    'transfer-encoding': 'chunked',
    vary: 'Accept-Encoding',
    'x-rate-limit-limit': '1s',
    'x-rate-limit-remaining': '1',
    'x-rate-limit-reset': '2025-09-04T13:21:58.9883664Z'
  },
  timestamp: '2025-09-04T13:21:58.035Z'
}
MAIB payment error details: {
  error: 'Payment creation failed: 403 11101: Unregistered IP: 3.72.67.120',
  stack: 'Error: Payment creation failed: 403 11101: Unregistered IP: 3.72.67.120\n' +
    '    at f.createPayment (/var/task/.next/server/app/api/orders/[orderId]/payment/route.js:1:14463)\n' +
    '    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)\n' +
    '    at async x (/var/task/.next/server/app/api/orders/[orderId]/payment/route.js:1:2703)\n' +
    '    at async rb.do (/var/task/node_modules/next/dist/compiled/next-server/app-route.runtime.prod.js:5:21059)\n' +
    '    at async rb.handle (/var/task/node_modules/next/dist/compiled/next-server/app-route.runtime.prod.js:5:25902)\n' +
    '    at async k (/var/task/.next/server/app/api/orders/[orderId]/payment/route.js:1:9309)\n' +
    '    at async rb.handleResponse (/var/task/node_modules/next/dist/compiled/next-server/app-route.runtime.prod.js:1:104427)\n' +
    '    at async g (/var/task/.next/server/app/api/orders/[orderId]/payment/route.js:1:10312)\n' +
    '    at async E (/var/task/.next/server/app/api/orders/[orderId]/payment/route.js:1:11434)\n' +
    '    at async ev (/var/task/node_modules/next/dist/compiled/next-server/server.runtime.prod.js:13:30874)',
  orderId: '59b91ec8-9b92-4131-aeb9-456810985597',
  timestamp: '2025-09-04T13:21:58.037Z'
}
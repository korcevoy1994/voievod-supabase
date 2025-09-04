const { HttpsProxyAgent } = require('https-proxy-agent');
const https = require('https');

// Simulate MAIB client IP detection
async function testMAIBClientIP() {
  console.log('Testing MAIB client IP detection...');
  
  const fixieUrl = process.env.FIXIE_URL;
  console.log('FIXIE_URL configured:', !!fixieUrl);
  
  if (!fixieUrl) {
    console.log('❌ FIXIE_URL not configured');
    return;
  }
  
  try {
    // Test 1: Direct connection to ipify
    console.log('\n1. Testing direct connection:');
    const directIP = await getIP();
    console.log('Direct IP:', directIP);
    
    // Test 2: Connection through Fixie proxy
    console.log('\n2. Testing with Fixie proxy:');
    const proxyIP = await getIP(fixieUrl);
    console.log('Proxy IP:', proxyIP);
    
    // Test 3: Test MAIB API endpoint (simulate)
    console.log('\n3. Testing MAIB API simulation:');
    const maibResponse = await testMAIBEndpoint(fixieUrl);
    console.log('MAIB API test result:', maibResponse);
    
    // Check if proxy IP matches expected Fixie IPs
    const expectedIPs = ['54.217.142.99', '54.195.3.54'];
    if (expectedIPs.includes(proxyIP)) {
      console.log('\n✅ SUCCESS: Proxy is working with expected static IP!');
    } else {
      console.log('\n❌ ISSUE: Proxy IP does not match expected static IPs:', expectedIPs);
      console.log('Current proxy IP:', proxyIP);
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

function getIP(proxyUrl = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.ipify.org',
      path: '/?format=json',
      method: 'GET',
      headers: {
        'User-Agent': 'MAIB-Client-Test/1.0'
      }
    };
    
    if (proxyUrl) {
      options.agent = new HttpsProxyAgent(proxyUrl);
    }
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const result = JSON.parse(data);
            resolve(result.ip);
          } catch (e) {
            reject(new Error('Failed to parse response: ' + data));
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(new Error('Request failed: ' + error.message));
    });
    
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    req.end();
  });
}

function testMAIBEndpoint(proxyUrl) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'maib.ecommerce.md',
      path: '/v1/generate-token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'MAIB-Client-Test/1.0'
      }
    };
    
    if (proxyUrl) {
      options.agent = new HttpsProxyAgent(proxyUrl);
    }
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          response: data.substring(0, 200) + (data.length > 200 ? '...' : ''),
          proxyUsed: !!proxyUrl
        });
      });
    });
    
    req.on('error', (error) => {
      resolve({
        error: error.message,
        proxyUsed: !!proxyUrl
      });
    });
    
    req.setTimeout(10000, () => {
      req.destroy();
      resolve({
        error: 'Request timeout',
        proxyUsed: !!proxyUrl
      });
    });
    
    // Send empty body for test
    req.write(JSON.stringify({}));
    req.end();
  });
}

testMAIBClientIP();
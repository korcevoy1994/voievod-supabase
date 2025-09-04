const https = require('https');
const { HttpsProxyAgent } = require('https-proxy-agent');

// Test IP detection on production
async function testProductionIP() {
  console.log('Testing IP detection on production...');
  
  try {
    // Test direct connection
    console.log('\n1. Testing direct connection:');
    const directResponse = await makeRequest('https://api.ipify.org?format=json');
    console.log('Direct IP:', JSON.parse(directResponse).ip);
    
    // Test with proxy (if FIXIE_URL is set)
    const fixieUrl = process.env.FIXIE_URL;
    if (fixieUrl) {
      console.log('\n2. Testing with Fixie proxy:');
      const proxyResponse = await makeRequest('https://api.ipify.org?format=json', fixieUrl);
      console.log('Proxy IP:', JSON.parse(proxyResponse).ip);
      
      // Check if it's one of the expected Fixie IPs
      const expectedIPs = ['54.217.142.99', '54.195.3.54'];
      const proxyIP = JSON.parse(proxyResponse).ip;
      if (expectedIPs.includes(proxyIP)) {
        console.log('✅ Proxy is working correctly with static IP!');
      } else {
        console.log('❌ Proxy IP does not match expected static IPs:', expectedIPs);
      }
    } else {
      console.log('\n❌ FIXIE_URL environment variable is not set');
    }
    
    // Test production endpoint
    console.log('\n3. Testing production endpoint IP detection:');
    const prodResponse = await makeRequest('https://voievod-supabase-j9aq3tk8i-korcevoyui-gmailcoms-projects.vercel.app/api/test-ip');
    console.log('Production endpoint response:', prodResponse);
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

function makeRequest(url, proxyUrl = null) {
  return new Promise((resolve, reject) => {
    const options = {
      method: 'GET',
      headers: {
        'User-Agent': 'Node.js Test Script'
      }
    };
    
    if (proxyUrl) {
      options.agent = new HttpsProxyAgent(proxyUrl);
    }
    
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(data);
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });
    
    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    req.end();
  });
}

testProductionIP();
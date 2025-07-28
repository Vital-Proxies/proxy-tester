// Test script for Pro Mode functionality
const http = require('http');

// Test data
const testProxy = '127.0.0.1:8080:user:pass';
const testOptions = {
  targetUrl: 'https://www.google.com',
  proMode: true,
  connectionsPerProxy: 3,
  testAllConnections: true,
  detailedMetrics: true,
  connectionPooling: true,
  testMethod: 'advanced',
  retryCount: 1,
  customTimeout: 10000
};

// Test single proxy
async function testSingleProxy() {
  console.log('Testing single proxy in Pro Mode...');
  
  const data = JSON.stringify({
    proxy: testProxy,
    options: testOptions
  });

  const options = {
    hostname: '127.0.0.1',
    port: 3001,
    path: '/test-proxy-pro',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length
    }
  };

  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          const result = JSON.parse(responseData);
          console.log('\n✅ Pro Mode Test Result:');
          console.log('Status:', result.status);
          console.log('Protocol:', result.protocol);
          console.log('Connections tested:', result.connections?.length || 0);
          console.log('First connection time:', result.firstConnectionTime, 'ms');
          console.log('Subsequent connection time:', result.subsequentConnectionTime, 'ms');
          
          if (result.averageMetrics) {
            console.log('\n📊 Average Metrics:');
            console.log('- DNS Lookup:', result.averageMetrics.dnsLookupTime, 'ms');
            console.log('- TCP Connect:', result.averageMetrics.tcpConnectTime, 'ms');
            console.log('- TLS Handshake:', result.averageMetrics.tlsHandshakeTime, 'ms');
            console.log('- Proxy Connect:', result.averageMetrics.proxyConnectTime, 'ms');
            console.log('- Total Time:', result.averageMetrics.totalTime, 'ms');
          }
          
          resolve(result);
        } catch (error) {
          console.error('Failed to parse response:', error);
          console.error('Raw response:', responseData);
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      console.error('Request error:', error);
      reject(error);
    });

    req.write(data);
    req.end();
  });
}

// Test batch proxies
async function testBatchProxies() {
  console.log('\n\nTesting batch proxies in Pro Mode...');
  
  const proxies = [
    '127.0.0.1:8080:user:pass',
    '192.168.1.1:3128:admin:admin',
    'proxy.example.com:1080:test:test'
  ];

  const data = JSON.stringify({
    proxies,
    options: testOptions,
    concurrencyLimit: 2
  });

  const options = {
    hostname: '127.0.0.1',
    port: 3001,
    path: '/test-proxies-pro-batch',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length
    }
  };

  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      const results = [];

      res.on('data', (chunk) => {
        const lines = chunk.toString().split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const result = JSON.parse(line.substring(6));
              results.push(result);
              console.log(`\n✅ Proxy ${results.length}/${proxies.length} tested:`, result.proxy);
              console.log('Status:', result.status);
              console.log('First connection:', result.firstConnectionTime, 'ms');
            } catch (e) {
              // Ignore parsing errors for incomplete chunks
            }
          }
        }
      });

      res.on('end', () => {
        console.log(`\n📊 Batch test completed. ${results.length} proxies tested.`);
        resolve(results);
      });
    });

    req.on('error', (error) => {
      console.error('Request error:', error);
      reject(error);
    });

    req.write(data);
    req.end();
  });
}

// Run tests
async function runTests() {
  console.log('🚀 Starting Pro Mode tests...\n');
  console.log('Make sure the server is running on port 3001\n');
  
  try {
    // Test single proxy
    await testSingleProxy();
    
    // Small delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test batch
    await testBatchProxies();
    
    console.log('\n✅ All tests completed successfully!');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
  }
}

// Run the tests
runTests();
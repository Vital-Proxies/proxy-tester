// Debug test for session reuse
const http = require('http');

async function testProMode() {
  const proxy = process.argv[2] || '192.168.1.1:8080:user:pass';
  console.log(`Testing proxy: ${proxy}\n`);

  const data = JSON.stringify({
    proxy: proxy,
    options: {
      targetUrl: 'https://httpbin.org/ip',
      proMode: true,
      connectionsPerProxy: 5,
      testAllConnections: true,
      detailedMetrics: true,
      connectionPooling: true,
      testMethod: 'advanced',
      customTimeout: 10000
    }
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
          
          console.log('🔍 Pro Mode Test Result:');
          console.log('=======================');
          console.log('Status:', result.status);
          console.log('Protocol:', result.protocol);
          console.log('Total connections tested:', result.connections?.length || 0);
          
          if (result.connections && result.connections.length > 0) {
            console.log('\n📊 Connection Details:');
            console.log('===================');
            
            result.connections.forEach((conn, idx) => {
              console.log(`\nConnection #${conn.connectionNumber}:`);
              console.log(`  Total Time: ${conn.totalTime}ms`);
              console.log(`  Session Reused: ${conn.sessionReused ? '✅ YES' : '❌ NO'}`);
              console.log(`  Is First: ${conn.isFirstConnection}`);
              console.log(`  DNS: ${conn.dnsLookupTime}ms`);
              console.log(`  TCP: ${conn.tcpConnectTime}ms`);
              console.log(`  TLS: ${conn.tlsHandshakeTime}ms`);
              console.log(`  Proxy Connect: ${conn.proxyConnectTime}ms`);
            });
            
            console.log('\n📈 Summary:');
            console.log('=========');
            console.log(`First Connection: ${result.firstConnectionTime}ms`);
            console.log(`Subsequent Avg: ${result.subsequentConnectionTime}ms`);
            
            if (result.firstConnectionTime > 0 && result.subsequentConnectionTime > 0) {
              const improvement = ((result.firstConnectionTime - result.subsequentConnectionTime) / result.firstConnectionTime * 100).toFixed(1);
              console.log(`Improvement: ${improvement}% faster`);
            }
            
            // Check if session reuse is working
            const reusedCount = result.connections.filter(c => c.sessionReused).length;
            console.log(`\n🔄 Session Reuse: ${reusedCount}/${result.connections.length - 1} subsequent connections`);
            
            if (reusedCount === 0 && result.connections.length > 1) {
              console.log('\n⚠️  WARNING: No session reuse detected!');
              console.log('   This might indicate a problem with connection pooling.');
            }
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

// Run the test
console.log('🚀 Starting Pro Mode Debug Test...\n');
console.log('Usage: node test-session-debug.js [proxy]\n');

testProMode()
  .then(() => {
    console.log('\n✅ Test completed!');
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error);
  });
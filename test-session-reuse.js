// Test de réutilisation de session pour le mode Pro
const http = require('http');
const https = require('https');
const { HttpsProxyAgent } = require('https-proxy-agent');

// Configuration du test
const proxyUrl = 'http://user:pass@proxy.example.com:8080';
const targetUrl = 'https://httpbin.org/ip';
const numConnections = 5;

async function testWithoutSessionReuse() {
  console.log('🔴 Test SANS réutilisation de session (nouvelle connexion à chaque fois):\n');
  const times = [];
  
  for (let i = 0; i < numConnections; i++) {
    const start = Date.now();
    
    // Création d'un nouvel agent à chaque fois
    const agent = new HttpsProxyAgent(proxyUrl);
    
    await new Promise((resolve, reject) => {
      https.get(targetUrl, { agent }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          const elapsed = Date.now() - start;
          times.push(elapsed);
          console.log(`  Connexion ${i + 1}: ${elapsed}ms`);
          resolve();
        });
      }).on('error', reject);
    });
    
    // Destruction de l'agent
    agent.destroy();
  }
  
  const avg = times.reduce((a, b) => a + b) / times.length;
  console.log(`\n  Temps moyen: ${avg.toFixed(2)}ms\n`);
  
  return times;
}

async function testWithSessionReuse() {
  console.log('🟢 Test AVEC réutilisation de session (même agent):\n');
  const times = [];
  
  // Création d'un seul agent avec keep-alive
  const agent = new HttpsProxyAgent(proxyUrl, {
    keepAlive: true,
    keepAliveMsecs: 1000,
    maxSockets: 10,
    maxFreeSockets: 10
  });
  
  for (let i = 0; i < numConnections; i++) {
    const start = Date.now();
    
    await new Promise((resolve, reject) => {
      https.get(targetUrl, { 
        agent,
        headers: {
          'Connection': 'keep-alive',
          'Keep-Alive': 'timeout=60'
        }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          const elapsed = Date.now() - start;
          times.push(elapsed);
          console.log(`  Connexion ${i + 1}: ${elapsed}ms${i > 0 ? ' (session réutilisée)' : ' (première connexion)'}`);
          resolve();
        });
      }).on('error', reject);
    });
    
    // Petit délai pour s'assurer que la connexion est maintenue
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  const avg = times.reduce((a, b) => a + b) / times.length;
  const improvement = ((times[0] - avg) / times[0] * 100).toFixed(1);
  
  console.log(`\n  Temps moyen: ${avg.toFixed(2)}ms`);
  console.log(`  Amélioration vs première connexion: ${improvement}%`);
  console.log(`  Gain moyen par connexion: ${(times[0] - times.slice(1).reduce((a, b) => a + b) / (times.length - 1)).toFixed(2)}ms\n`);
  
  agent.destroy();
  
  return times;
}

async function compareResults(timesWithout, timesWith) {
  console.log('📊 Comparaison des résultats:\n');
  
  const avgWithout = timesWithout.reduce((a, b) => a + b) / timesWithout.length;
  const avgWith = timesWith.reduce((a, b) => a + b) / timesWith.length;
  const improvement = ((avgWithout - avgWith) / avgWithout * 100).toFixed(1);
  
  console.log(`  Sans réutilisation: ${avgWithout.toFixed(2)}ms en moyenne`);
  console.log(`  Avec réutilisation: ${avgWith.toFixed(2)}ms en moyenne`);
  console.log(`  \n🚀 Amélioration globale: ${improvement}%`);
  console.log(`  Temps économisé par requête: ${(avgWithout - avgWith).toFixed(2)}ms`);
}

// Point d'entrée principal
async function main() {
  console.log('=== Test de réutilisation de session Pro Mode ===\n');
  console.log(`Proxy: ${proxyUrl}`);
  console.log(`Target: ${targetUrl}`);
  console.log(`Nombre de connexions: ${numConnections}\n`);
  
  try {
    // Test sans réutilisation
    const timesWithout = await testWithoutSessionReuse();
    
    // Pause entre les tests
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test avec réutilisation
    const timesWith = await testWithSessionReuse();
    
    // Comparaison
    compareResults(timesWithout, timesWith);
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.log('\nAssurez-vous que le proxy est valide et accessible.');
  }
}

// Lancer le test
main();
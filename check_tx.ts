import { Connection, PublicKey } from '@solana/web3.js';
async function run() {
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  const tx = await connection.getTransaction('4a5tiXrMeeKnURTohM7QbKi3NzSE8ucEyNzKF8BuN2Yc6AkUPA3qS8sfbH7T4TYieW2jzN5KbJ9gJERfM6AgKyqn', {maxSupportedTransactionVersion: 0});
  console.log(JSON.stringify(tx?.meta?.logMessages, null, 2));
}
run();

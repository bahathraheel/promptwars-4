#!/usr/bin/env node
/**
 * StadiumPulse AI – Basic Load Test
 *
 * Sends N concurrent chat requests to the /api/chat endpoint and
 * reports success rate, p50, p90, p99 latency.
 *
 * Usage: node load-test.mjs [concurrency=20] [total=100]
 *
 * Assumption: Backend is running on http://localhost:3001
 */

const BACKEND = process.env.LOAD_TEST_URL ?? 'http://localhost:3001';
const CONCURRENCY = parseInt(process.argv[2] ?? '20', 10);
const TOTAL = parseInt(process.argv[3] ?? '100', 10);

const SAMPLE_MESSAGES = [
  'Where is Gate 1?',
  'How do I find a wheelchair accessible route?',
  'Where is the nearest medical station?',
  'What metro line goes to the stadium?',
  'Is there halal food available?',
  'What bin does a plastic bottle go in?',
  'What time do gates open?',
  'Where can I charge my phone?',
];

async function singleRequest(id) {
  const message = SAMPLE_MESSAGES[id % SAMPLE_MESSAGES.length];
  const start = Date.now();
  try {
    const res = await fetch(`${BACKEND}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, mode: 'chat' }),
    });
    const latency = Date.now() - start;
    return { ok: res.ok, status: res.status, latency };
  } catch (err) {
    return { ok: false, status: 0, latency: Date.now() - start, error: err.message };
  }
}

async function runBatch(batchSize, startId) {
  const promises = Array.from({ length: batchSize }, (_, i) => singleRequest(startId + i));
  return Promise.all(promises);
}

async function main() {
  console.log(`\n🏟️  StadiumPulse AI – Load Test`);
  console.log(`   Target:      ${BACKEND}`);
  console.log(`   Concurrency: ${CONCURRENCY}`);
  console.log(`   Total reqs:  ${TOTAL}\n`);

  const results = [];
  let completed = 0;

  while (completed < TOTAL) {
    const batchSize = Math.min(CONCURRENCY, TOTAL - completed);
    const batch = await runBatch(batchSize, completed);
    results.push(...batch);
    completed += batchSize;
    process.stdout.write(`\r   Progress: ${completed}/${TOTAL}`);
  }

  console.log('\n');

  const latencies = results.map((r) => r.latency).sort((a, b) => a - b);
  const successes = results.filter((r) => r.ok).length;
  const failures = results.filter((r) => !r.ok);

  const p = (pct) => latencies[Math.floor(latencies.length * pct / 100)];

  console.log('📊 Results:');
  console.log(`   Total:      ${TOTAL}`);
  console.log(`   Successes:  ${successes} (${((successes / TOTAL) * 100).toFixed(1)}%)`);
  console.log(`   Failures:   ${failures.length}`);
  console.log(`   Latency p50: ${p(50)}ms`);
  console.log(`   Latency p90: ${p(90)}ms`);
  console.log(`   Latency p99: ${p(99)}ms`);
  console.log(`   Min:         ${latencies[0]}ms`);
  console.log(`   Max:         ${latencies[latencies.length - 1]}ms`);

  if (failures.length > 0) {
    console.log('\n❌ Sample failures:');
    failures.slice(0, 5).forEach((f) => console.log(`   status=${f.status} error=${f.error ?? 'HTTP error'}`));
  }

  if (successes / TOTAL < 0.95) {
    console.error('\n⚠️  Success rate below 95% — investigate failures.');
    process.exit(1);
  } else {
    console.log('\n✅ Load test passed.');
  }
}

main().catch((e) => { console.error(e); process.exit(1); });

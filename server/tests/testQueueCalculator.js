// server/tests/testQueueCalculator.js
import { calculateWaitTime, getQueueStatistics, testQueueCalculator } from '../utils/queueCalculator.js';

async function runTests() {
  console.log('Testing Queue Calculator Implementation\n');
  
  // Test 1: Basic calculation
  console.log('Test 1 - Basic Wait Time Calculation:');
  const wait1 = await calculateWaitTime('507f1f77bcf86cd799439011', 1);
  const wait3 = await calculateWaitTime('507f1f77bcf86cd799439011', 3);
  console.log(`  Position 1: ${wait1} minutes`);
  console.log(`  Position 3: ${wait3} minutes`);
  console.log(`  Ratio (3/1): ${(wait3/wait1).toFixed(2)}x`);
  
  // Test 2: Statistics
  console.log('\nTest 2 - Queue Statistics:');
  const stats = await getQueueStatistics('507f1f77bcf86cd799439011');
  console.log('  Stats:', JSON.stringify(stats, null, 2));
  
  // Test 3: Run built-in tests
  console.log('\nTest 3 - Built-in Tests:');
  await testQueueCalculator();
  
  console.log('\nAll tests completed!');
}

runTests().catch(console.error);
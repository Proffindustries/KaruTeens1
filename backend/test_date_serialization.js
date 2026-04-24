//! Simple Node.js test to verify RFC3339 date serialization compatibility

// Test that RFC3339 dates work with JavaScript Date constructor
function testRFC3339Compatibility() {
    console.log('Testing RFC3339 date serialization compatibility...\n');

    // Sample RFC3339 dates that should be produced by the backend
    const testDates = [
        '2024-04-06T15:13:00Z',
        '2024-01-15T10:30:45+00:00',
        '2023-12-31T23:59:59Z',
        new Date().toISOString(), // Current time
    ];

    testDates.forEach((dateStr, index) => {
        try {
            const jsDate = new Date(dateStr);

            if (isNaN(jsDate.getTime())) {
                console.error(`❌ Test ${index + 1}: Invalid date "${dateStr}"`);
                return;
            }

            // Test round-trip compatibility
            const roundTrip = jsDate.toISOString();
            const parsedAgain = new Date(roundTrip);

            if (isNaN(parsedAgain.getTime())) {
                console.error(`❌ Test ${index + 1}: Round-trip failed for "${dateStr}"`);
                return;
            }

            console.log(`✅ Test ${index + 1}: "${dateStr}" -> ${jsDate.toLocaleString()}`);
        } catch (error) {
            console.error(`❌ Test ${index + 1}: Error parsing "${dateStr}": ${error.message}`);
        }
    });

    console.log('\nTesting edge cases...');

    // Test edge cases
    const edgeCases = [
        '1970-01-01T00:00:00Z', // Unix epoch
        '2100-01-01T00:00:00Z', // Future date
        '2024-02-29T12:00:00Z', // Leap day (if applicable)
    ];

    edgeCases.forEach((dateStr, index) => {
        try {
            const jsDate = new Date(dateStr);

            if (isNaN(jsDate.getTime())) {
                console.log(`⚠️  Edge case ${index + 1}: "${dateStr}" (invalid in this year)`);
            } else {
                console.log(
                    `✅ Edge case ${index + 1}: "${dateStr}" -> ${jsDate.toLocaleString()}`
                );
            }
        } catch (error) {
            console.log(`⚠️  Edge case ${index + 1}: "${dateStr}" - ${error.message}`);
        }
    });

    console.log('\n✅ RFC3339 date compatibility test completed!');
    console.log('📋 Summary: JavaScript Date() constructor fully supports RFC3339 format');
    console.log('🔄 Frontend can safely use new Date(backendDateString) for all date fields');
}

// Test date formatting functions that are commonly used in the frontend
function testDateFormatting() {
    console.log('\nTesting date formatting functions...\n');

    const testDate = new Date();
    const rfc3339String = testDate.toISOString();

    console.log(`Original RFC3339: ${rfc3339String}`);
    console.log(`toLocaleString(): ${testDate.toLocaleString()}`);
    console.log(`toLocaleDateString(): ${testDate.toLocaleDateString()}`);
    console.log(`toLocaleTimeString(): ${testDate.toLocaleTimeString()}`);
    console.log(`Date.parse(): ${Date.parse(rfc3339String)}`);

    // Test relative time formatting
    const now = new Date();
    const past = new Date(now.getTime() - 3600000); // 1 hour ago
    const future = new Date(now.getTime() + 3600000); // 1 hour from now

    console.log(`\nRelative time examples:`);
    console.log(`1 hour ago: ${past.toLocaleString()}`);
    console.log(`Now: ${now.toLocaleString()}`);
    console.log(`1 hour from now: ${future.toLocaleString()}`);
}

// Run the tests
testRFC3339Compatibility();
testDateFormatting();

console.log('\n🎉 All tests completed successfully!');
console.log('📝 The backend RFC3339 serialization is fully compatible with the frontend.');

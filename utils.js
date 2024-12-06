function extractScoreAndTimestamp(combinedValue) {
    const score = combinedValue >>> 16;  
    const timestamp = combinedValue & 0xFFFFFFFF;
    return { score, timestamp };
}

const combinedValue = 18293792134;
const { score, timestamp } = extractScoreAndTimestamp(combinedValue);
console.log(`Extracted score: ${score}, timestamp: ${timestamp}`);
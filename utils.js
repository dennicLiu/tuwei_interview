// function extractScoreAndTimestamp(combinedValue) {
//     const score = combinedValue >>> 16;  
//     const timestamp = combinedValue & 0xFFFFFFFF;
//     return { score, timestamp };
// }

// const combinedValue = 18293792134;
// const { score, timestamp } = extractScoreAndTimestamp(combinedValue);
// console.log(`Extracted score: ${score}, timestamp: ${timestamp}`);

const score = 100;
const shiftedScore = score << 16;
const finalCombinedValue = (shiftedScore | Date.now()) >>> 0;
console.log(finalCombinedValue);


// 获取今天结束时间与现在的毫秒数差的函数
export function getTimeDiffToEndOfToday() {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const endOfTodayTimestamp = today.getTime();
    const currentTimestamp = Date.now();
    return endOfTodayTimestamp - currentTimestamp;
}


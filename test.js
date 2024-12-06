const score1 = 100;
const score2 = 110;

const shiftedScore1 = score1 << 16;
const combinedValue = shiftedScore1 | score2;

console.log(combinedValue);
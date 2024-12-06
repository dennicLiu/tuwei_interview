// 获取今天结束时间与现在的毫秒数差的函数
export function getTimeDiffToEndOfToday() {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const endOfTodayTimestamp = today.getTime();
    const currentTimestamp = Date.now();
    return endOfTodayTimestamp - currentTimestamp;
}


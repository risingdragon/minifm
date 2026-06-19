// 验证脚本：模拟 CONFIG 和 generatePlayer 逻辑
const CONFIG = {
    LEAGUE_ABILITY_RANGES: {
        '1': { min: 167, max: 200 },
        '2': { min: 134, max: 166 },
        '3': { min: 101, max: 133 },
        '4': { min: 68, max: 100 },
        '5': { min: 35, max: 67 },
        '6': { min: 1, max: 34 }
    }
};

function generatePlayerAbility(leagueLevel) {
    if (leagueLevel === undefined) leagueLevel = 1;
    const range = CONFIG.LEAGUE_ABILITY_RANGES[leagueLevel] || CONFIG.LEAGUE_ABILITY_RANGES[6];
    const minAbility = range.min;
    const maxAbility = range.max;
    const ability = Math.floor(Math.random() * (maxAbility - minAbility + 1)) + minAbility;
    return ability;
}

const EXPECTED = {
    1: { min: 167, max: 200, avg: 183.5 },
    2: { min: 134, max: 166, avg: 150 },
    3: { min: 101, max: 133, avg: 117 },
    4: { min: 68, max: 100, avg: 84 },
    5: { min: 35, max: 67, avg: 51 },
    6: { min: 1, max: 34, avg: 17.5 }
};

const N = 100;
const results = [];

for (let level = 1; level <= 6; level++) {
    const values = [];
    for (let i = 0; i < N; i++) {
        values.push(generatePlayerAbility(level));
    }
    const min = Math.min.apply(null, values);
    const max = Math.max.apply(null, values);
    const avg = values.reduce(function (a, b) { return a + b; }, 0) / N;
    const exp = EXPECTED[level];
    const inRange = min >= exp.min && max <= exp.max;
    const avgClose = Math.abs(avg - exp.avg) <= 2;
    results.push({ level: level, min: min, max: max, avg: avg, exp: exp, inRange: inRange, avgClose: avgClose });
}

console.log('\n=== 球员能力值范围验证（每级 100 样本）\n');
console.log('| 级别 | 范围(实际) | 平均(实际) | 范围(期望) | 平均(期望) | 范围检查 | 平均检查 |');
console.log('|------|-----------|-----------|-----------|-----------|----------|----------|');

let allPass = true;
for (let i = 0; i < results.length; i++) {
    const r = results[i];
    const rangeStr = r.min + '-' + r.max;
    const expRangeStr = r.exp.min + '-' + r.exp.max;
    const row = '| L' + r.level + '   | ' + rangeStr + ' | ' + r.avg.toFixed(2) + ' | ' + expRangeStr + ' | ' + r.exp.avg + ' | ' + (r.inRange ? 'PASS' : 'FAIL') + '   | ' + (r.avgClose ? 'PASS' : 'FAIL') + '   |';
    console.log(row);
    if (!r.inRange || !r.avgClose) allPass = false;
}

console.log('\n=== Fallback 测试 (leagueLevel = 99):');
const fbAbility = generatePlayerAbility(99);
console.log('生成能力值: ' + fbAbility + ' (应在 1-34 范围内)');
const fbPass = fbAbility >= 1 && fbAbility <= 34;
console.log('Fallback: ' + (fbPass ? 'PASS' : 'FAIL'));
if (!fbPass) allPass = false;

console.log('\n=== 总体结果: ' + (allPass ? 'PASS 全部通过' : 'FAIL 有失败项') + '\n');
process.exit(allPass ? 0 : 1);
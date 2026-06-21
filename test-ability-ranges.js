const CONFIG = {
    LEAGUE_ABILITY_RANGES: {
        "1": { min: 105, max: 200 },
        "2": { min: 85, max: 175 },
        "3": { min: 65, max: 150 },
        "4": { min: 45, max: 125 },
        "5": { min: 25, max: 100 },
        "6": { min: 10, max: 80 }
    }
};

function generatePlayerAbility(leagueLevel = 1) {
    const range = CONFIG.LEAGUE_ABILITY_RANGES[leagueLevel] || CONFIG.LEAGUE_ABILITY_RANGES[6];
    const minAbility = range.min;
    const maxAbility = range.max;
    const rangeSize = maxAbility - minAbility + 1;
    const totalWeight = rangeSize * (rangeSize + 1) * (2 * rangeSize + 1) / 6;
    const pick = Math.floor(Math.random() * totalWeight) + 1;

    let cumulative = 0;
    for (let i = 1; i <= rangeSize; i++) {
        cumulative += i * i;
        if (pick <= cumulative) {
            return maxAbility - i + 1;
        }
    }

    return minAbility;
}

function expectedWeightedAverage(range) {
    const minAbility = range.min;
    const maxAbility = range.max;
    const rangeSize = maxAbility - minAbility + 1;
    let totalWeight = 0;
    let weightedSum = 0;

    for (let ability = minAbility; ability <= maxAbility; ability++) {
        const weight = Math.pow(maxAbility - ability + 1, 2);
        totalWeight += weight;
        weightedSum += ability * weight;
    }

    return weightedSum / totalWeight;
}

function generateTeamAbility(leagueLevel) {
    const squad = [];
    const counts = { GK: 3, DF: 8, MF: 8, CF: 6 };
    const starters = { GK: 1, DF: 4, MF: 4, CF: 2 };

    Object.keys(counts).forEach(position => {
        for (let i = 0; i < counts[position]; i++) {
            squad.push({ position, ability: generatePlayerAbility(leagueLevel) });
        }
    });

    return Object.keys(starters).reduce((sum, position) => {
        return sum + squad
            .filter(player => player.position === position)
            .sort((a, b) => b.ability - a.ability)
            .slice(0, starters[position])
            .reduce((positionSum, player) => positionSum + player.ability, 0);
    }, 0);
}

const PLAYER_SAMPLE_COUNT = 5000;
const TEAM_SAMPLE_COUNT = 5000;
const results = [];

for (let level = 1; level <= 6; level++) {
    const range = CONFIG.LEAGUE_ABILITY_RANGES[level];
    const playerValues = [];
    const teamValues = [];

    for (let i = 0; i < PLAYER_SAMPLE_COUNT; i++) {
        playerValues.push(generatePlayerAbility(level));
    }

    for (let i = 0; i < TEAM_SAMPLE_COUNT; i++) {
        teamValues.push(generateTeamAbility(level));
    }

    playerValues.sort((a, b) => a - b);
    teamValues.sort((a, b) => a - b);

    const playerMin = Math.min(...playerValues);
    const playerMax = Math.max(...playerValues);
    const playerAverage = playerValues.reduce((sum, value) => sum + value, 0) / playerValues.length;
    const teamAverage = teamValues.reduce((sum, value) => sum + value, 0) / teamValues.length;
    const expectedAverage = expectedWeightedAverage(range);
    const inRange = playerMin >= range.min && playerMax <= range.max;
    const averageClose = Math.abs(playerAverage - expectedAverage) <= 2;

    results.push({
        level,
        range,
        playerMin,
        playerMax,
        playerAverage,
        expectedAverage,
        teamP10: teamValues[Math.floor(teamValues.length * 0.1)],
        teamAverage,
        teamP90: teamValues[Math.floor(teamValues.length * 0.9)],
        inRange,
        averageClose
    });
}

console.log('\n=== Ability range validation ===\n');
console.log('| Level | Player range | Player avg | Expected avg | Team p10 | Team avg | Team p90 | Range | Avg |');
console.log('|------|--------------|------------|--------------|----------|----------|----------|-------|-----|');

let allPass = true;
results.forEach(result => {
    const row = [
        `| L${result.level}`,
        `${result.playerMin}-${result.playerMax}`,
        result.playerAverage.toFixed(2),
        result.expectedAverage.toFixed(2),
        result.teamP10,
        result.teamAverage.toFixed(0),
        result.teamP90,
        result.inRange ? 'PASS' : 'FAIL',
        `${result.averageClose ? 'PASS' : 'FAIL'} |`
    ].join(' | ');

    console.log(row);
    if (!result.inRange || !result.averageClose) allPass = false;
});

const fallbackAbility = generatePlayerAbility(99);
const fallbackPass = fallbackAbility >= CONFIG.LEAGUE_ABILITY_RANGES[6].min &&
    fallbackAbility <= CONFIG.LEAGUE_ABILITY_RANGES[6].max;

console.log('\n=== Fallback test (leagueLevel = 99) ===');
console.log(`Generated ability: ${fallbackAbility}`);
console.log(`Fallback: ${fallbackPass ? 'PASS' : 'FAIL'}`);

if (!fallbackPass) allPass = false;

console.log(`\n=== Overall result: ${allPass ? 'PASS' : 'FAIL'} ===\n`);
process.exit(allPass ? 0 : 1);

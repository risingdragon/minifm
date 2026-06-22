import type { FinanceLog, GameState, Player, Team, TransferMarket } from '../models/types';

const MARKET_SIZE = 24;

export function createTransferMarket(players: Player[], userTeamId: string, season: string, round: number): TransferMarket {
  return {
    listedPlayerIds: selectListedPlayers(players, userTeamId),
    lastRefreshRound: round,
    lastRefreshSeason: season,
  };
}

export function refreshTransferMarketIfNeeded(game: GameState, round: number): TransferMarket {
  if (
    game.transferMarket &&
    game.transferMarket.lastRefreshRound === round &&
    game.transferMarket.lastRefreshSeason === game.leagueSystem.season
  ) {
    return game.transferMarket;
  }

  return createTransferMarket(game.players, game.userTeamId, game.leagueSystem.season, round);
}

export function buyPlayer(game: GameState, playerId: string): GameState {
  const player = game.players.find((item) => item.id === playerId);
  const buyer = game.teams.find((team) => team.id === game.userTeamId);

  if (!player || !buyer || player.teamId === buyer.id || player.isGeneratedFillIn) {
    return game;
  }

  const seller = game.teams.find((team) => team.id === player.teamId);

  if (!seller || buyer.balance < player.marketValue || countRegularPlayers(game.players, seller.id) <= 11) {
    return game;
  }

  const fee = player.marketValue;
  const teams = game.teams.map((team) => {
    if (team.id === buyer.id) {
      return { ...team, balance: team.balance - fee, players: [...team.players, player.id] };
    }

    if (team.id === seller.id) {
      return { ...team, balance: team.balance + fee, players: team.players.filter((id) => id !== player.id) };
    }

    return team;
  });

  const players = game.players.map((item) =>
    item.id === player.id
      ? {
          ...item,
          teamId: buyer.id,
          isListed: false,
          isStarter: false,
        }
      : item,
  );

  const logs: FinanceLog[] = [
    {
      id: `transfer-${game.leagueSystem.season}-${Date.now()}-buyer`,
      season: game.leagueSystem.season,
      round: null,
      teamId: buyer.id,
      type: 'transferFee',
      amount: -fee,
      description: `${buyer.name} bought ${player.name} from ${seller.name}`,
    },
    {
      id: `transfer-${game.leagueSystem.season}-${Date.now()}-seller`,
      season: game.leagueSystem.season,
      round: null,
      teamId: seller.id,
      type: 'transferFee',
      amount: fee,
      description: `${seller.name} sold ${player.name} to ${buyer.name}`,
    },
  ];

  return {
    ...game,
    teams,
    players,
    transferMarket: {
      ...game.transferMarket,
      listedPlayerIds: game.transferMarket.listedPlayerIds.filter((id) => id !== player.id),
    },
    financeLogs: [...game.financeLogs, ...logs],
  };
}

export function countRegularPlayers(players: Player[], teamId: string): number {
  return players.filter((player) => player.teamId === teamId && !player.isGeneratedFillIn).length;
}

function selectListedPlayers(players: Player[], userTeamId: string): string[] {
  return players
    .filter((player) => player.teamId !== userTeamId && !player.isGeneratedFillIn)
    .sort((a, b) => marketScore(b) - marketScore(a))
    .slice(0, MARKET_SIZE)
    .map((player) => player.id);
}

function marketScore(player: Player): number {
  return player.overall * 2 + player.potential + (player.id.charCodeAt(player.id.length - 1) % 17);
}

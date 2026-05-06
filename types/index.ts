export type Suit = "♠" | "♥" | "♦" | "♣";

export type Rank =
  | "A"
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "10"
  | "J"
  | "Q"
  | "K";

export interface Card {
  rank: Rank;
  suit: Suit;
}

export type GameStatus =
  | "idle"
  | "player-turn"
  | "dealer-turn"
  | "player-bust"
  | "dealer-bust"
  | "player-win"
  | "dealer-win"
  | "push"
  | "player-blackjack"
  | "dealer-blackjack";

export interface GameState {
  deck: Card[];
  player: Card[];
  dealer: Card[];
  status: GameStatus;
  holeHidden: boolean;
  bet: number;
}

export interface UserStats {
  handsPlayed: number;
  wins: number;
  losses: number;
  pushes: number;
  blackjacks: number;
}

export interface User {
  name: string;
  email: string;
  budget: number;
  stats: UserStats;
}

export interface TutorAdvice {
  action: "Hit" | "Stand";
  reason: string;
}

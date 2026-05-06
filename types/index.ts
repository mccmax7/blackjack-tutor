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
  | "dealing"
  | "player-turn"
  | "dealer-turn"
  | "settled";

export type HandStatus =
  | "active"
  | "standing"
  | "busted"
  | "doubled"
  | "blackjack";

export type HandResult = "win" | "loss" | "push" | "blackjack";

export interface PlayerHand {
  cards: Card[];
  bet: number;
  status: HandStatus;
  result?: HandResult; // populated after settlement
  fromSplit?: boolean;
}

export interface GameState {
  deck: Card[];
  hands: PlayerHand[];
  activeHandIndex: number;
  dealer: Card[];
  status: GameStatus;
  holeHidden: boolean;
  bet: number; // original bet placed at deal time
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

export type TutorAction = "Hit" | "Stand" | "Double" | "Split";

export interface TutorAdvice {
  action: TutorAction;
  reason: string;
}

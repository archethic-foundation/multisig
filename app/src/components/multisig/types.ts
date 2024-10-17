export interface Token {
  name: string;
  symbol: string;
  amount: number;
}

export interface Balance {
  uco: number;
  tokens: Token[]
}
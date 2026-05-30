export const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const SUITS = ["S", "H", "D", "C"];

export const createDeck = () =>
  SUITS.flatMap((suit) => RANKS.map((rank) => ({ id: `${rank}-${suit}`, rank, suit })));

export const shuffleDeck = (deck) => {
  const copy = [...deck];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }

  return copy;
};

export const distributeCards = (players) => {
  const deck = shuffleDeck(createDeck());
  const hands = {};

  players.forEach((player) => {
    hands[player.userId] = [];
  });

  deck.forEach((card, index) => {
    const player = players[index % players.length];
    hands[player.userId].push(card);
  });

  Object.values(hands).forEach((hand) => {
    hand.sort((left, right) => RANKS.indexOf(left.rank) - RANKS.indexOf(right.rank));
  });

  return hands;
};

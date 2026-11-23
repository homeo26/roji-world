// Every minigame, and the place in town where it is played.
// module: path relative to this file. Each module's default export follows the contract in shell.js.
export const GAMES = [
  { id: 'tictactoe', title: 'X O', tagline: 'Three in a row wins', place: 'boardgames', module: './tictactoe.js' },
  { id: 'rps', title: 'Rock Paper Scissors', tagline: 'Best of five', place: 'boardgames', module: './rps.js' },
  { id: 'snakes', title: 'Snakes and Ladders', tagline: 'Race to square 100', place: 'boardgames', module: './snakes.js' },
  { id: 'connect4', title: 'Four in a Row', tagline: 'Drop four in a line', place: 'boardgames', module: './connect4.js' },
  { id: 'cooking', title: "Roji's YumYum Kitchen", tagline: 'Serve every hungry guest', place: 'yumyum', module: './cooking.js' },
  { id: 'horserace', title: 'Horse Race', tagline: 'Gallop, jump, win', place: 'horse', module: './horserace.js' },
  { id: 'fencing', title: 'Fencing Duel', tagline: 'First to five touches', place: 'fencing', module: './fencing.js' },
  { id: 'popcorn', title: 'Popcorn Catch', tagline: 'Fill the bucket before the movie', place: 'cinema', module: './popcorn.js' },
  { id: 'pottery', title: 'Pottery Wheel', tagline: 'Shape the vase', place: 'clay', module: './pottery.js' },
  { id: 'drawpad', title: 'Drawing Pad', tagline: 'Draw and keep it', place: 'drawing', module: './drawpad.js' },
  { id: 'memory', title: 'Memory Match', tagline: 'Find every pair', place: 'plaza', module: './memory.js' },
];

export const gamesAt = (place) => GAMES.filter((g) => g.place === place);
export const gameById = (id) => GAMES.find((g) => g.id === id);

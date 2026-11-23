# Roji World

A small 3D browser game about Roji and Homama. Play as either of them. They walk an island path where every stop is one weekend, and a little town where they live.

## The weekends (checkpoints)

Each numbered pad on the path is a weekend checkpoint. Stand on it to open its card and collect the stamp. Collecting a stamp sets off confetti, marks the weekend in the top bar and lights the path up to that stop. The Journey list (J, or the book button) shows every checkpoint, lets you travel to it and holds your notes.

1. Cinema Night (date night)
2. Horse Riding
3. Fencing
4. Board Games
5. Clay at the Café
6. Drawing
7. Coming soon (locked, unlocks next week)

Progress, looks and notes are saved in the browser. "Start the journey over" in Help clears the stamps.

## The town

- **Roji's home.** Walk to the door and press E to go inside. The kitchen, living room and bedroom sit side by side.
  - Living room: sit on the sofa under a blanket for movie night.
  - Bedroom: tuck in and sleep, with zzz floating up. The closet opens the wardrobe.
  - Kitchen: the stove opens the cooking game, and the fridge has snacks.
  - Drawings saved in the Drawing Pad hang in the living-room frames.
- **Roji's YumYum.** The restaurant, with the cooking game.
- **Play Park.** A wishing fountain, a dance floor (party music and lights) and an arcade kiosk with every minigame.
- **The car.** Parked by the home. Press E to drive it and Space to honk.
- **The pony.** At the Horse Riding stop. Press E to ride it.

## Two characters

- **Roji** and **Homama**. Pick one on the start screen, or switch at any time with Tab or the avatar button.
- The other one follows you. Press H to hold hands and walk together.
- **Wardrobe** (C, or the shirt button): haircuts, outfits, and colours for hair, top, bottom and shoes, for both kids.
- **Moves:** 1 wave, 2 dance, 3 spin, 4 cheer, 5 heart, 6 bow. The partner joins in when close.

## Minigames

| Where | Games |
|---|---|
| Cinema Night | Popcorn Catch |
| Horse Riding | Horse Race |
| Fencing | Fencing Duel |
| Board Games | X O, Rock Paper Scissors, Snakes and Ladders, Four in a Row |
| Clay at the Café | Pottery Wheel |
| Drawing | Drawing Pad |
| Roji's YumYum | YumYum Kitchen (cooking) |
| Play Park | Memory Match, plus the arcade with all of them |

The board games and Memory Match can be played against the computer or by two people on the same device. Each game can also be opened on its own for testing: `games.html?game=<id>&as=roji` (ids are in `src/games/registry.js`).

## Run it

Plain static files with no build step. three.js r186 is vendored in `vendor/`, and the font is in `fonts/`.

```bash
cd roji-world
python3 -m http.server 8765 --bind 127.0.0.1
```

Then open http://127.0.0.1:8765. Opening `index.html` directly from disk does not work, because browsers block ES modules on `file://`.

## Publish on GitHub Pages

The site works from any sub-path (all paths are relative), and `.nojekyll` makes GitHub serve the files as they are.

1. Create a new **public** repository on github.com, for example `roji-world`.
2. Push these files to its `main` branch, with `index.html` at the top level.
3. In the repository, open **Settings > Pages**. Under **Build and deployment**, pick **Deploy from a branch**, then `main` and `/ (root)`, and save.
4. After a minute or two the game is live at `https://<your-username>.github.io/roji-world/`.

Each browser keeps its own stamps, looks and notes, so two phones don't share progress.

## Credits

- [three.js](https://threejs.org) r186, MIT licence (`vendor/three/LICENSE`).
- [Fredoka](https://github.com/hafontia/Fredoka-One) font, SIL Open Font License 1.1 (`fonts/OFL.txt`).

## Controls

| Action | Keyboard | Touch (phone in landscape) |
|---|---|---|
| Walk | WASD or arrows, or click the ground | Thumbstick, bottom left |
| Run | Shift | Push the stick to its edge |
| Jump (honk in the car) | Space | Up-arrow button |
| Act (stamp, go inside, drive, ride, sit, sleep) | E or Enter | Big A button |
| Hold hands | H | Two-kids button |
| Moves and dances | 1 to 6 | Music-note button |
| Switch character | Tab | Avatar button |
| Wardrobe | C | Shirt button |
| Journey list | J | Book button |
| Zoom | Mouse wheel | |
| Sound on or off | M | Speaker button |
| Close a panel or game | Esc | Close button |

Phones held upright see a "turn your phone sideways" screen.

## Change the weekends

Everything about the stops is in `src/config.js`: titles, tags, texts and colours.

- To reveal a weekend only when it arrives, set its `date` to `'YYYY-MM-DD'`. It stays locked before that day.
- To open the 7th stop, give it a title and text and remove `locked: true`. Its 3D scene is the gift box in `buildNext` in `src/stations.js`.

## Files

| File | What it does |
|---|---|
| `src/main.js` | Renderer, lights, camera, both kids, mounts, activities, hotspots, the game loop |
| `src/kid.js` | Roji and Homama, built from shapes: walk, jump, moves, sit, sleep, ride, drive, hand-holding |
| `src/looks.js` | Haircuts, outfits, colours and the saved looks |
| `src/world.js` | Island, water, path, town road, trees, flowers, lamps, butterflies |
| `src/stations.js` | The stop pads, one 3D scene per weekend, the home and the pony |
| `src/places.js` | Roji's YumYum and the Play Park |
| `src/interior.js` | Inside the home: kitchen, living room, bedroom |
| `src/car.js` | The car |
| `src/ui.js` | Top bar, cards, journey list, notes, games menu, wardrobe, minimap |
| `src/audio.js` | Music box loop, party music and sound effects, made with Web Audio |
| `src/fx.js` | Confetti, hearts, dust puffs, tap marker |
| `src/input.js` | Keyboard, mouse, thumbstick and touch buttons |
| `src/games/shell.js` | Full-screen frame that every minigame runs in |
| `src/games/registry.js` | The list of minigames and where each is played |
| `src/games/*.js` | One file per minigame |
| `games.html` | Opens a single minigame for testing |

# Roji World

A small 3D browser game about Roji and Homama. Play as either of them. They walk an island path where every stop is one weekend, and a town full of places to visit together. Roji is a doctor and Homama is a software engineer.

## The weekends (checkpoints)

Each numbered pad on the path is a weekend checkpoint. Stand on it to open its card and collect the stamp. Collecting a stamp sets off confetti, marks the weekend in the top bar and lights the path up to that stop. A stamped card has an Unstamp button if you change your mind. The Journey list (J, or the book button) shows every checkpoint, lets you travel to it and holds your notes.

1. Cinema Night (date night)
2. Horse Riding
3. Fencing
4. Board Games
5. Clay at the Café
6. Drawing
7. Coming soon (locked, unlocks next week)

Progress, looks and notes are saved in the browser. "Start the journey over" in Help clears the stamps.

## The town

Every building can be entered: walk to its door and press E, or use "Go inside" on its card.

- **Roji's Home.** A bigger cottage ringed with flowers. Inside, side by side:
  - Kitchen: open the fridge (pecan cake, German cake, cookies, a burger, candy, Spanish latte, shawerma, mansaf, strawberries, ice cream), cook together and eat together.
  - Living room: movie night on the sofa under a blanket, or play with Mishmish.
  - Bedroom: a folded quilt, story time in bed, a wardrobe, and a baby bed waiting for its baby, with a "girl or boy?" guessing game. Homama always leaves a gift under Roji's pillow: pick it up, hold it and open it.
  - Bathroom: bubble bath and brushing teeth together.
  - Study: two desks, Homama's for code and Roji's for medicine, for studying together.
  - Mishmish, an orange cat, wanders about and meows every so often.
- **Cinema.** Seats, a screen and a popcorn counter (Popcorn Catch).
- **Clay Café.** Coffee at the window, a pottery studio and a kiln room. Pots you make stay on the café shelf.
- **Roji's YumYum.** Diner with an open kitchen, booths, a jukebox and milkshakes.
- **Island Zoo.** Animals, including two giraffes: Jodi (the serious one) and Jouri (the goofy one). There is a photo spot.
- **Sunny Hill Hospital.** Where Dr. Roji works and checks on her patients. Each time she comes to work, Homama has left her a sweet note.
- **City Pool.** In the middle of town. Swim, float on rings, use the slide and dive. The water ripples where you move.
- **Tech Studio.** Where Homama works, with his very good desk.
- **Football Pitch.** Kick the ball about, take penalties or play a match.
- **Roji World Karting.** A kart track with a podium.
- **Little Wheels Driving School.** Roji takes driving lessons. Homama already has his licence and cheers her on.
- **Little Stars Primary.** A school with a bell tower and a yellow bus. It stays locked until Roji and Homama have a little one.
- **Picnic Garden.** A picnic blanket, a swing, ducks and cloud watching.
- **Cycling Park.** Bikes for two.
- **Snowflake Peak.** The cold end of the map: ice skating, snowmen, cocoa in the lodge and a ski race.
- **Play Park.** A wishing fountain, a dance floor and an arcade kiosk.
- **The car.** Parked by the home. Press E to drive: it goes where you point the stick or keys. Space honks.
- **The pony.** At the Horse Riding stop. Press E to ride it.

## Time of day

The town follows the player's own clock, with sunrise and sunset that move with the seasons: dawn, sunrise, morning, noon, afternoon, golden hour, sunset, dusk and night, when the lamps and windows light up. Tap the clock at the top left to pick Live, a fast mode (a whole day in 4 minutes) or a fixed moment.

## Two characters

- **Roji** and **Homama**. Pick one on the start screen, or switch at any time with Tab or the avatar button.
- The other one follows you. Press H to hold hands and walk together.
- **Wardrobe** (C, or the shirt button): haircuts, outfits and colours. Roji has girls' clothes and Homama has boys' clothes.
- **Jumping:** jump onto benches, beds and other things, and press jump again in the air for a double jump with a flip.
- **Moves:** 1 wave, 2 dance, 3 spin, 4 cheer, 5 heart, 6 bow. The partner joins in when close.

## Minigames

All minigames are 3D and you play them as Roji or Homama in the same style as the town.

| Where | Games |
|---|---|
| Cinema Night | Popcorn Catch |
| Horse Riding | Horse Race (ride the pony like in the town) |
| Fencing | Fencing Duel |
| Board Games | X O, Four in a Row, Snakes and Ladders, Rock Paper Scissors |
| Clay at the Café | Pottery Wheel |
| Drawing | Drawing Pad (drawings hang in the home) |
| Roji's YumYum | Roji's YumYum Kitchen |
| Play Park | Memory Match |
| Sunny Hill Hospital | Patient Rounds |
| Tech Studio | Ship It! |
| Football Pitch | Football |
| Roji World Karting | Kart Race |
| Little Wheels Driving School | Driving Lesson |
| Cycling Park | Cycle Race |
| Snowflake Peak | Ski Race |

The board games and Memory Match can be played against the computer or by two people on the same device.

## Run it

Plain static files with no build step. three.js r186 is vendored in `vendor/`, and the font is in `fonts/`.

```bash
cd roji-world
python3 -m http.server 8765 --bind 127.0.0.1
```

Then open http://127.0.0.1:8765. Opening `index.html` directly from disk does not work, because browsers block ES modules on `file://`.

For testing, `?time=night` fixes the time of day. The other names are `dawn`, `sunrise`, `morning`, `noon`, `afternoon`, `golden`, `sunset` and `dusk`.

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
| Jump, double jump (honk in the car) | Space, twice for a double jump | Up-arrow button |
| Act (stamp, go inside, drive, ride, sit, sleep) | E or Enter | Big A button |
| Hold hands | H | Two-kids button |
| Moves and dances | 1 to 6 | Music-note button |
| Switch character | Tab | Avatar button |
| Wardrobe | C | Shirt button |
| Journey list | J | Book button |
| Zoom | Mouse wheel, or + and - | Pinch with two fingers |
| Full screen | F | Full-screen button, top right |
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
| `src/main.js` | Renderer, lights, camera, both kids, mounts, hotspots, the game loop |
| `src/engine/manifest.js` | Every place, interior and 3D minigame, and where each place sits on the map |
| `src/engine/daylight.js` | Time of day from the local clock |
| `src/engine/spaces.js` | Going inside buildings and coming back out |
| `src/engine/arena.js` | Runs a 3D minigame in its own scene |
| `src/engine/movement.js`, `physics.js` | Walking, jumping onto things, double jump, swimming and collisions |
| `src/engine/activities.js` | Shared poses: sofa, bed, desks, picnic blanket |
| `src/places/<id>.js` | One file per town place, with its own folder for models and its interior |
| `src/interiors/<id>.js` | Interiors of the Cinema, Clay Café and Roji's YumYum |
| `src/arena/<id>.js` | One file per 3D minigame |
| `src/kid.js` | Roji and Homama, built from shapes: walk, jump, moves, sit, sleep, swim, ride, drive, hand-holding |
| `src/looks.js` | Haircuts, outfits, colours and the saved looks |
| `src/world.js` | Island, water, path, town road, trees, flowers, lamps, butterflies |
| `src/stations.js` | The stop pads, one 3D scene per weekend, and the pony |
| `src/places.js` | The Play Park and the YumYum building |
| `src/car.js` | The car |
| `src/ui.js` | Top bar, cards, journey list, notes, games menu, wardrobe, clock, minimap |
| `src/audio.js` | Music box loop, party music and sound effects, made with Web Audio |
| `src/fx.js` | Confetti, hearts, dust puffs, tap marker |
| `src/input.js` | Keyboard, mouse, thumbstick, pinch zoom and touch buttons |
| `src/games/*.js` | The older 2D minigames, used only if a 3D one fails to load |
| `games.html` | Opens a single 2D minigame for testing |

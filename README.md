# best-stealth-game-20261121-1759 — Lantern Thief

[![make.fun · best-stealth-game-20261121-1759](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/chepster4/best-stealth-game-20261121-1759/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/chepster4/best-stealth-game-20261121-1759/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)

Lantern Thief — a complete top-down stealth game that runs offline in a desktop browser from its own static files. You are a hooded thief with a lantern, sneaking through three moonlit manor courtyards. Take every golden relic, then slip out the exit — unseen.

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

## How to play

- **WASD / arrow keys** — move. **Shift** — sneak (slower, quieter, harder to spot).
- **Click** — throw a pebble. Guards hear it land and go to look.
- **P / Esc** — pause.

Guards patrol fixed routes with **vision cones** that are raycast against the walls and crates, so cover really does cut their sight. Being seen fills a guard's suspicion: at full, the alarm sounds and the guard chases you. If one catches you, you lose a life and wake at the courtyard gate. **Bushes** hide you unless a guard gets close. **Running is loud** — guards nearby come to investigate your footsteps. Collect all 3 relics to unlock the exit.

Three levels — the Ember Courtyard, the Lantern Hall, and the Ember Vault — with more guards and tighter patrols each time. All sound is synthesized live with the Web Audio API (footsteps, alarm sting, pickup chime); the game ships no audio files and makes no network request.

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` (Node 22, standard library only) copies `game/` and `screenshots/` to the output directory and writes `dossier.json` with the vendored `vendor/makefun-game.ts`.

## Screenshots

The four screenshots in `screenshots/` are real renders of this game's own code, staged with `?shot=cover|play|alarm|win&seed=7` (see `shots.json` and `game/src/shots.js`).

## License

MIT — see [LICENSE](LICENSE).

---

<sub>Entered on [make.fun](https://make.fun/?ref=b5gt2sm0&utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759) · AI agents build software for cash rewards</sub>

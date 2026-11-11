# Nomen

*Nomen omen*: type a name, get its planet. [Leggi in italiano](README.it.md).

Every name becomes its own 3D world, computed in your browser: oceans, mountains, clouds, rings and moons, and on some worlds a civilization with cities, roads and fields that you can zoom into, from space down to the streets, by day and by night. The same name always gives the same planet. Type another name and you jump there across the galaxy, leaving in the direction where that world really is in the sky.

No libraries, no images, no server: one WebGL2 shader and plain JavaScript modules. The name lives after the `#` in the address, a part the browser never sends anywhere.

## Run it

```bash
python3 tools/serve.py
```

Then open `http://127.0.0.1:4350/`. The tests run with `node --test`.

## How it works

- **The name is the seed.** It is normalized and hashed, and every feature of the planet reads its own key from that hash. New features get new keys, so existing planets never change: `tests/oro.json` guards this.
- **One fragment shader draws everything** (`js/glsl.js`): the ray meets the sphere, procedural noise makes terrain, climate, clouds and air, and the detail grows as the camera comes down.
- **Civilizations are built in JavaScript** (`js/civilta.js`) on the same terrain, then handed to the shader as two tables: cities, roads and bridges are drawn from them. Up close a city has blocks, lots, gardens and shadows; at night, street lamps and lit windows.
- **The galaxy** (`js/universo.js`): every name has a place in one of four spiral arms. The starry sky and the jump between worlds follow from it.
- Resolution and quality adapt to keep it smooth.

## Limits

- It needs WebGL2.
- Planets are generated, not simulated: climate, cities and roads are plausible, not physical.
- Up close, cities follow rules, not real data: blocks, lots and lights, not single buildings.
- Nothing is saved: the link is the only memory of a world.

## Credits

- Idea and direction: Stefano Carta.
- Design: Claude Fable 5.2 (Anthropic).
- Code: Claude Opus 5.5 (Anthropic), except the first version of the shader, written by Claude Fable 5.2.

MIT License.

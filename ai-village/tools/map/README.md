# Map build tools (capital island)

- `build_capital.py` joins the 2K pieces into the one seamless island map, using best-match cuts (`seam.py`) and per-piece alignment (`register.py`).
- It was run from the scratchpad `lego/` folder, using the aligned pieces `pieceN_2k_aligned.png` and `capital_piece_2k.png` (the city).
- Webp copies of every piece are in `assets/new-world/pieces2/`. To rebuild, convert them back to those names next to `tools/`, then run `python3 tools/build_capital.py`.
- The output is copied to `assets/maps/capital-island-map.webp`. See NOTES.md for each piece's offset and the hand patches.

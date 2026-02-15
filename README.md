# Tetris Rosy Retrospection — Save Editor

A web-based editor for modifying high scores in [Tetris Rosy Retrospection](https://www.romhacking.net/hacks/5765/), a
Game Boy ROM hack of the original Tetris. Load your emulator's `.srm` save file, edit the top-3 names and scores for any
level, and save it back.

## Usage

1. Open the editor (hosted on [GitHub Pages](https://brandonkowalski.github.io/rosy-retrospective-score-editor/) or run
   locally)
2. Load your `.srm` or `.sav` file by clicking the upload area or dragging it in
3. Switch between **TYPE-A** and **TYPE-B** tabs to find the level you want to edit
4. Edit names (A-Z, up to 6 characters) and scores (max 999,999)
5. Click **SAVE .SRM** to download the modified file
6. Drop it back in your emulator's save directory

You must load an existing save file from the game — the editor preserves all game state bytes that it doesn't
understand, so round-tripping a real save is safe.

## Save Format

The `.srm` file is 32KB (8KB of actual SRAM, mirrored/padded). Scores are organized into 27-byte groups, each holding 3
entries:

| Region | Offset   | Groups | Description           |
|--------|----------|--------|-----------------------|
| Type-B | `0x0000` | 60     | 10 levels x 6 heights |
| Type-A | `0x0654` | 10     | 10 normal levels      |

Each 27-byte group:

- Bytes 0-8: Three 3-byte BCD scores (little-endian, max 999,999)
- Bytes 9-26: Three 6-byte names (GB tile IDs: `0x0A`=A through `0x23`=Z, `0x60`=blank)

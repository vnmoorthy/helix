# Helix pitch deck

There are two versions of the same 10-slide deck. Both have speaker notes, about 3 minutes in total.

| File | Use it for |
|---|---|
| `index.html` | **Presenting.** A self-contained web deck with motion graphics. |
| `helix-deck.pptx` | A PowerPoint or Keynote copy, for sharing or as a backup. |
| `build_pptx.py` | Rebuilds the `.pptx`. |

## Presenting from `index.html`

1. Open `deck/index.html` in Chrome, either by double-clicking it or with `open -a "Google Chrome" deck/index.html`.
2. Press **F** to go fullscreen. Each slide plays its animations when it appears.

| Key | Action |
|---|---|
| `→` `↓` `Space` `Enter` `PageDown`, or click | Next slide |
| `←` `↑` `Backspace` `PageUp`, or click the left quarter of the screen | Previous slide |
| `F` | Enter or leave fullscreen |
| `N` | Show or hide the speaker-notes drawer (it also has a timer) |
| `T` | Reset the timer |
| `1`–`9`, `0` | Jump to slides 1–9; `0` jumps to slide 10 |
| `Home` / `End` | Jump to the first or last slide |

- The URL hash tracks the current slide, so `index.html#5` opens on slide 5 and a reload keeps your place.
- Screenshots load from `../docs/screens/{niche,genome,fork}.png` and are cropped to the app content. If a file is missing, a built-in mock of that screen appears in its place.
- The deck works offline. Only the Geist font comes from Google Fonts; without a connection the system sans-serif is used.

## `helix-deck.pptx`

- 16:9, using the dark brand styling. Speaker notes are in the notes pane.
- Every slide has a transition. Slides 2, 6 and 7 use **Morph**: the wordmark shrinks into the footer, and the screenshot moves between the demo slides. PowerPoint versions without Morph show a fade instead.
- Entrance animations start automatically. Most elements fade in one after another. The track bars and helix wipe in, the winning-genome cards and roster rows fly in, and data packets loop along the architecture rail on slide 8.
- Fonts are Arial and Courier New. Gradient text renders in PowerPoint and Keynote; LibreOffice shows it as solid peach.

To rebuild after recapturing screenshots or editing the notes in `index.html`, run:

```bash
python3 -I deck/build_pptx.py   # needs python-pptx, Pillow, numpy, lxml
```

The script reads the speaker notes from `index.html`, so edit the notes there and both versions stay in sync.

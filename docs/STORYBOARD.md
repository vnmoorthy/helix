# Helix — 3-minute pitch storyboard

**Format:** 3:00 pitch + 2:00 Q&A (Hack the Feed finals, 5:30 PM).
**Setup before you walk on:** laptop on power, Wi-Fi on, two browser tabs open and zoomed to 110%:
1. **Deck** — `deck/index.html`, slide 1, fullscreen (`F`).
2. **App** — `http://localhost:3000/n?q=protein%20coffee` already loaded (a live sequence cached, so it opens instantly).

Have one backup niche already sequenced (e.g. `ai tools`) in case the room asks for another.

> Rule of thumb: **the demo is the pitch.** Slides 5–7 are backup screenshots. Only use them if the app or Wi-Fi fails.

---

| # | Time | Screen | What you say (word for word) | Action / motion beat |
|---|------|--------|------------------------------|----------------------|
| 1 | 0:00–0:12 | **Slide 1 — Title.** DNA helix animates in. | "Every viral video has a genome. I built Helix, the tool that sequences it." | Pause one beat on "genome". Click. |
| 2 | 0:12–0:30 | **Slide 2 — Problem.** | "Every Monday, every creator asks: *what do I post this week?* The answers are vibes: 'use a strong hook', 'add captions'. Agencies running 50 creators pay strategists to watch hundreds of videos by hand. Social tools read captions, but most of what makes a video work is what it *shows, says, overlays and sounds like*." | Stress the four verbs. Click. |
| 3 | 0:30–0:42 | **Slide 3 — Insight.** Five colored tracks draw in. | "Oriane lets us read all four. So Helix breaks every video into genes across five tracks: visual, spoken, on-screen, sound and format. Every gene has a timestamp and the Oriane field it came from." | Point at the tracks as they animate. Click. |
| 4 | 0:42–0:50 | **Slide 4 — Sequence → Lift → Fork.** | "Three steps: sequence a niche, measure which genes lift views, fork the winner. Let me show you, live." | **Switch to the app tab.** |
| 5 | 0:50–1:20 | **App — Niche genome** (`protein coffee`). | "This is the protein coffee niche. Oriane found these videos four ways at once: by what's said, written on screen, captioned and *seen* by AI Vision. Look at this number: **[X]% of this niche never mentions it in the caption**. A hashtag tool is blind to them. Up here is the winning genome: what the top quartile shares and the bottom doesn't. A text hook in frame one: **[2.2]× the views per follower**." | Point to the "Invisible to caption search" KPI, then the first winning-genome card. Read the real numbers off the screen. |
| 6 | 1:20–1:40 | **App — click a gene** in the leaderboard. | "Every gene is clickable. Here are the videos that carry it, ranked. No guru, just the data across [N] videos." | Click "Text hook in frame 1" in the leaderboard. The wall filters. |
| 7 | 1:40–2:05 | **App — open a video genome.** | "Open any video and you get its genome: frames, the transcript on a timeline, on-screen text with the exact OCR box, the sound, and every gene with its receipt. Question hook at 0:00. First word at 0.2 seconds. Trending sound." | Click the top video. Hover two transcript chunks and two frames (OCR boxes light up). |
| 8 | 2:05–2:30 | **App — Fork structure.** Type a product. | "Now the part a creator uses on Monday. I type what *my* video is about, say an oat-milk cold brew, and Helix forks the structure into a shot list: hook, setup, proof, CTA. It inherits the genes and swaps every piece of content. **Structure, never content.**" | Click **Fork structure** → type `oat-milk cold brew` → **Generate**. Point at the inherited-gene badges. |
| 9 | 2:30–2:42 | **App — Agency roster.** | "And for an agency with 50 creators: paste the roster, one click, 50 Monday briefs." | Toggle **Agency roster** → **Fork for 5 creators**. Cards fly in. |
| 10 | 2:42–2:52 | **Slide 9 — Business.** | "Creators pay 19 dollars a month. Agencies pay 499 per 50-creator roster. Brands pay per API call on top of Oriane. Every sequence makes our gene-lift data better, so that data is the moat." | Switch back to the deck. |
| 11 | 2:52–3:00 | **Slide 10 — Close.** | "Helix. Every viral video has a genome. Now every creator can read it. Thank you." | Stop. Smile. Don't add anything. |

---

## Q&A prep: the 6 questions the red team asked most

**"Fork-a-video was on the organizer's list. What's new?"**
Fork-a-video copies one video. Helix measures every gene **across the whole niche** and tells you which ones actually move views-per-follower, with n and top-vs-bottom-quartile share. The fork is just the output. The genome statistics are the product.

**"Isn't forking copying?"**
We copy **structure, never content**, the way songs share chord progressions. The shot list swaps the topic, the words, the footage and the creator. You can see the "swapped" badge on every beat.

**"How do you know a gene *causes* views?"**
We don't claim causation. We show lift with its sample size and its quartile split, plus a timestamped receipt for every gene. Every fork is a testable hypothesis. Next on the roadmap: tracking whether forked videos beat the creator's own median.

**"How accurate are the genes? Are they hallucinated?"**
None of them come from an LLM. Each one is read deterministically from an Oriane field: `transcriptChunks`, `onScreenTextRegions`, `visualSimilarityScore` or `audioTitle`. The field name and timestamp are printed right next to it. The LLM is optional and only rewrites the lines in your voice.

**"Why won't Oriane, or a big tool, build this?"**
Oriane is the index. Helix is the creator workflow on top: lift statistics, the winning genome, forks and roster briefs. The more we sequence, the better our per-niche priors get. Helix makes Oriane's data a Monday habit. (To Julien: *"Helix is a reason for every agency to buy Oriane credits."*)

**"Who pays, and on Monday?"**
Agencies first. They write briefs for 20 to 50 creators every week, and the roster fork replaces hours of a strategist's time. $499/month per roster. Creators come in at $19.

---

## If something breaks
- **Wi-Fi dies:** cached niches open instantly with a "sequenced <time>" badge. Keep going.
- **A niche returns nothing:** say "broader niche," then switch to the pre-sequenced backup.
- **The app won't load:** use deck slides 5–7 (screenshots of each step) and narrate the same script.

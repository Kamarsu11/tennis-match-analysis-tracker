# Tennis Match Manual Analysis PWA (iOS Mobile-First)

A mobile-first Progressive Web App (PWA) designed for courtside manual tennis match performance analysis with 1–5 taps per point.

---

## 🚀 Key Features

* **Courtside Fast-Entry Workflow (1–5 Taps):**
  * **1-Tap Ace / Service Winner / Double Fault:** Auto-registers server, receiver, rally length, and updates score immediately.
  * **3–5 Tap Detailed Points:** Winner, Unforced Error, Forced Error, Shot Type (Forehand, Backhand, Volley, Overhead, Drop Shot, Return), Position, Rally length (1–4, 5–8, 9+), and tactile Error Diagnostic.
* **Full Multi-Format Scoring Engine:**
  * Standard Best of 1, 3, or 5 sets (6 games, 7-point tie-break).
  * Format B (Set 3 is a 10-point Match Tie-Break).
  * Format C (Junior shortened sets starting at 2–2, 3rd set Match TB).
  * Fast4 (4 games per set, tie-break at 3–3, No-Ad sudden death at 40–40).
  * Pro-Set (8 games).
  * Single 10-point tie-break matches.
  * Advantage vs No-Ad scoring.
* **Complete Rule Automations:**
  * Auto-tracks Server & Receiver.
  * Auto-tracks Serving Side (Deuce / Ad).
  * Auto-tracks Tie-break ABBA serving rotation.
  * Auto-detects End Changes (odd games & tie-break intervals).
  * Auto-detects Leverage Moments (**BREAK POINT**, **GAME POINT**, **SET POINT**, **MATCH POINT**).
* **Live Corrections & Safety Controls:**
  * Instant 1-tap **Undo** of previous points.
  * Quick-edit modal for any recent point (change shot, outcome, rally length, or comment).
  * Manual score override & unobserved point fast-adder (+1 point without forced questions).
  * HTML5 Screen Wake Lock toggle to prevent screen dimming courtside.
* **Senior Analytics Dashboard (Match, Set, Game, Tie-Break Levels):**
  * **Aggressive Margin:** `((Winners + Opponent FE) - UE) / Total Points`
  * **Dominance Ratio:** `Return Points Won % / Opponent Return Points Won %`
  * **First-Strike (1–4) vs Tolerance (5–8, 9+) Breakdown:** Win rates and winner/error counts by rally length.
  * **Shot Breakdown Matrix:** Forehand vs Backhand vs Net vs Serve winners & errors.
  * **Hierarchical Error Diagnostic:** Drill down from Shot $\rightarrow$ Error Cause (Opponent Deep Ball, Heavy Pace/Rushed, High Topspin, Low Slice, Wide/Stretch, Footwork/Balance, Execution).
  * **Searchable Coach Notes & Point Timeline:** Filter point comments and observations.
* **Local-First Storage, Backup & Export:**
  * Stored locally in IndexedDB (offline-first).
  * 1-Click CSV Export of all point-level records + metadata.
  * 1-Click Full JSON Database Backup & Restore.

---

## 📱 iOS Home Screen Installation

1. Open the web app URL in Safari on your iPhone.
2. Tap the **Share** button (the square with an arrow pointing upward).
3. Scroll down and tap **Add to Home Screen**.
4. Open the app from your home screen for an immersive, full-screen offline experience.

---

## 🧪 Automated Test Suite

Run the unit and end-to-end simulation tests with Node:

```bash
node tests/engine.test.mjs
node tests/full_match.test.mjs
```

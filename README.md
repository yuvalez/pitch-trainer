# Ear Trainer

A browser app for training your ear and learning to play by ear.

## Exercises (4 levels each: Beginner, Intermediate, Advanced, Expert)

- **Intervals**: name the distance between two notes.
- **Chord Quality**: major, minor, diminished, 7ths, 9ths, inversions.
- **Chord Naming**: name the full chord (root and quality, like "Dm7"), with a reference note or key.
- **Find the Chord**: hear a chord and play its notes on the piano.
- **Chord in Context**: hear a progression and identify one highlighted chord.
- **Key & Scale**: find the tonic on the piano and name the scale or mode of a clip.
- **Melodic Dictation**: hear a melody and play it back on the on-screen piano.
- **Chord Progressions**: name chords in Roman numerals, from I–IV–V to borrowed chords.

Chord Quality, Chord Naming and Find the Chord also have a **Custom** tab. Pick the chord types to drill, and missed ones come up more often.

Reach 80% over your last 20 answers to unlock the next level. Progress is saved in your browser.
The Learn page explains each topic with playable examples.

## Game

- **Modes**:
  - **Classic**: 20 questions with 5 hearts, earning 1–3 stars.
  - **Time Attack**: 60 seconds. The clock pauses while each question first plays.
  - **Survival**: endless questions with 3 hearts.
- **XP and ranks**: correct answers earn XP. Harder levels and combos (×1.5 at 5 in a row, ×2 at 10, ×3 at 20) earn more. XP raises your rank from Listener to Golden Ear.
- **Daily goal and streak**: reach the daily goal (set in Settings) to keep your streak.
- **Trophies**: 20 achievements, plus arcade high scores, on the Trophies page.

## Language and theme

English or Hebrew, switched from the top bar. Hebrew uses a full right-to-left layout and Do Re Mi note names. Settings can switch note names to letters in either language.

The theme follows the system by default; the top-bar button cycles System → Light → Dark.

## Run

```
npm install
npm run dev      # http://localhost:5173
npm test         # unit tests
npm run build    # production build in dist/
```

Piano samples load from tonejs.github.io. Without internet the app falls back to a built-in synth.

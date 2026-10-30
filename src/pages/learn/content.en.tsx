import {
  ChordSoundList,
  IntervalTable,
  InversionExamples,
  ModeList,
  NumeralRows,
  ProgressionList,
} from './widgets';

export function LearnContentEn() {
  return (
    <>
      <section id="intervals" className="card">
        <h2>📏 Intervals</h2>
        <p>
          An interval is the distance between two notes, counted in semitones (one piano key to the next). Link each
          interval to the opening of a song you know: when you hear the interval, the song comes to mind.
        </p>
        <IntervalTable />
      </section>

      <section id="chords" className="card">
        <h2>🎹 Chords</h2>
        <p>
          A triad stacks two thirds. Major = major 3rd + minor 3rd. Minor = minor 3rd + major 3rd. Diminished stacks two
          minor 3rds, augmented two major 3rds. Seventh chords add another third on top.
        </p>
        <ChordSoundList />
      </section>

      <section id="identify-chords" className="card">
        <h2>🏷️ Identifying chords by ear</h2>
        <ol>
          <li>
            <strong>Find the bass.</strong> Hum the lowest note you hear. In root position it is the chord’s root, which
            gives the letter name.
          </li>
          <li>
            <strong>Major or minor?</strong> Bright and settled is major. Darker is minor. This comes from the 3rd.
          </li>
          <li>
            <strong>Check the 5th.</strong> A tense, shrinking sound means a ♭5 (diminished). A stretched, unresolved
            sound means a #5 (augmented).
          </li>
          <li>
            <strong>Listen for a 7th.</strong> Dominant 7 wants to move. Major 7 is dreamy and sits a half step under the
            root. Minor 7 is mellow.
          </li>
          <li>
            <strong>Sing the arpeggio.</strong> Sing each chord tone from the bottom up, then find each one on your
            instrument.
          </li>
        </ol>
        <h3>Inversions</h3>
        <p>
          An inversion puts a different chord tone in the bass. The chord keeps its quality, but the bass note is no
          longer the root. Write it as a slash chord, e.g. C/E.
        </p>
        <InversionExamples />
      </section>

      <section id="scales" className="card">
        <h2>🔑 Scales &amp; modes</h2>
        <p>
          A song's key is its home note (the tonic) plus the scale built on it. The seven modes all use the same
          pattern of whole and half steps, started from a different note. Each mode has one “colour note” that makes
          it sound different from plain major or minor.
        </p>
        <ModeList />
      </section>

      <section id="harmony" className="card">
        <h2>🔁 Harmony &amp; Roman numerals</h2>
        <p>
          Build a triad on each note of the scale and you get the key's family of chords. Roman numerals name them by
          scale degree, so a progression means the same thing in every key. Uppercase is major, lowercase is minor, °
          is diminished.
        </p>
        <NumeralRows />
        <h3>Progressions worth knowing</h3>
        <ProgressionList />
        <p className="muted small">
          Secondary dominants like V/V are the dominant of a chord other than I. In C major, V/V is D7 and leads to G.
          Borrowed chords such as iv, ♭VI and ♭VII come from the parallel minor key.
        </p>
      </section>

      <section id="by-ear" className="card">
        <h2>👂 Playing by ear</h2>
        <h3>How to find the key of a song</h3>
        <ol>
          <li>Listen for the note where the music feels at rest. Endings of choruses and verses usually land there.</li>
          <li>Hum that note, then find it on your instrument. This is your candidate tonic.</li>
          <li>Play the major chord on that note while the song plays, then the minor chord. Keep whichever fits.</li>
          <li>
            Check the colour notes. A major key with a ♭7 is Mixolydian. A minor key with a major 6th (major IV chord)
            is Dorian.
          </li>
          <li>Confirm by playing the scale along with the song. Wrong notes will clash immediately.</li>
        </ol>
        <h3>How to pick out a melody</h3>
        <ol>
          <li>Sing the phrase back until you can hum it without the recording.</li>
          <li>Find the first note by trial and error. Starting on the tonic or 5th is common.</li>
          <li>For each next note ask: up or down? Step or leap? Which interval?</li>
          <li>Most melodies stay within the key's scale. Try scale notes first.</li>
        </ol>
        <h3>How to work out chords</h3>
        <ol>
          <li>Follow the bass line. Its notes are usually the chord roots.</li>
          <li>Decide major or minor for each root.</li>
          <li>Translate to Roman numerals. Most songs use I, IV, V and vi, and those patterns repeat.</li>
        </ol>
      </section>
    </>
  );
}

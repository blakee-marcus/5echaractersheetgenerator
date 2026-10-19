import { CharacterJsonGenerator } from "./character-json-generator";

export default function Home() {
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <header className="site-header">
        <p className="wordmark">5e Character Sheet Generator</p>
      </header>
      <main id="main-content" className="page-shell">
        <section className="hero" aria-labelledby="page-title">
          <p className="eyebrow">D&amp;D 5th Edition</p>
          <h1 id="page-title">Character data in. Fillable sheet out.</h1>
          <p className="lede">
            A focused PDF engine for validating structured character data and
            mapping it onto the official-style three-page character sheet.
          </p>
          <p className="status">
            Character data is checked for valid structure and supported field
            values before PDF generation. D&amp;D 5e gameplay rules are not yet
            automatically validated.
          </p>
        </section>

        <CharacterJsonGenerator />

        <section className="capabilities" aria-labelledby="capabilities-title">
          <h2 id="capabilities-title">Built for reliable output</h2>
          <ul>
            <li>
              <strong>Structural validation</strong>
              <span>Checks supported fields and basic numeric integrity.</span>
            </li>
            <li>
              <strong>Explicit mapping</strong>
              <span>Maps abilities, skills, combat, equipment, and spells.</span>
            </li>
            <li>
              <strong>Safe PDF output</strong>
              <span>Detects unsupported text and field overflow.</span>
            </li>
          </ul>
        </section>
      </main>
      <footer>
        <p>Local-first. No account required.</p>
      </footer>
    </>
  );
}

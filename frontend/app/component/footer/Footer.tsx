export function Footer() {
  return (
    <footer>
      <section>URN-Uitslag</section>
      <section>
        <strong>Server</strong> {process.env.MSW ? "Mocked" : "Live"} &nbsp;&nbsp;
        <strong>Versie</strong> v{process.env.VERSION}
      </section>
    </footer>
  );
}

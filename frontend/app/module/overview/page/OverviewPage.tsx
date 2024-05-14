import { WorkStationNumber } from "@kiesraad/ui";

export function OverviewPage() {
  return (
    <>
      <header>
        <section>
          <h1>Verkiezingen</h1>
        </section>
        <section>
          <WorkStationNumber>16</WorkStationNumber>
        </section>
      </header>
      <main>
        <article>Lijst met verkiezingen</article>
      </main>
    </>
  );
}

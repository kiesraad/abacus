
# Github werkwijze

Dit document beschrijft de werkwijze met Github. Er zijn meerdere manieren om deze stappen te zetten. 

- Pak een issue op uit de 'Current'-kolom van het bord:
    - Bekijk de bijbehorende epic voor context over dit issue.
    - Controleer of alle randvoorwaarden zijn voltooid. Als er een randvoorwaarde mist en er nog geen issue voor is,
      overleg dan met het team.
    - Bedenk of het issue duidelijk genoeg is om te implementeren.
      Zijn er architectuur-overwegingen die afgestemd moeten worden?
      Bij twijfel, betrek het team voordat je code gaat schrijven.

- Maak een nieuwe branch aan op basis van de main branch:
    - `git checkout -b <branch name>`
    - Geef de branch een duidelijk beschrijvende naam.
      Gebruik bij voorkeur de naam die door de 'Create a branch'
      link bij het GitHub-issue wordt voorgesteld.

- Schrijf de code:
    - Implementeer de functionaliteit die wordt beschreven in het issue.
    - Maak testen aan voor de functionaliteit en voer ze uit.

- Maak een pull request aan:
    - Als de branch commits bevat die al eerder gemerged zijn, kun je die verwijderen met een _interactive rebase_:
      `git fetch; git rebase origin/main --interactive` en verwijder de betreffende commits uit de lijst.
    - Verwijs naar het issue in een comment, bijv. `Closes #42`
    - Wijs ten minste 2 reviewers aan.

- Merge de pull request:
    - Zorg dat de branch up to date is met main
    - Zorg dat alle opmerkingen (conversations) opgelost zijn.
    - Zorg dat je 2 approvals hebt
    - Consolideer de merge message; behoud alleen de belangrijkste punten
    - Sluit de pull request met *Squash and Merge*.

Dit project gebruikt [Lefthook] om de Git pre-commit hook te beheren. Lefthook zal
automatisch geïnstalleerd worden wanneer `npm install` wordt uitgevoerd in de `frontend`
directory.

[Lefthook]: https://github.com/evilmartians/lefthook

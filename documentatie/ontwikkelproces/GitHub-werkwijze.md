# GitHub werkwijze

Dit document beschrijft de werkwijze met GitHub.
Er zijn meerdere manieren om deze stappen te zetten. 

- Pak een issue op uit de 'Current'-kolom van het bord:
    - Bekijk de bijbehorende epic voor context over dit issue.
    - Controleer of alle randvoorwaarden zijn voltooid. Als er een randvoorwaarde
      mist en er nog geen issue voor is, overleg dan met het team.
    - Wijs jezelf toe aan het issue
    - Zet het issue op 'In progress' onder 'Projects' in de rechterkolom van het issue.
    - Bedenk of het issue duidelijk genoeg is om te implementeren.
      Zijn er architectuur-overwegingen die afgestemd moeten worden?
      Betrek bij twijfel het team voordat je code gaat schrijven.

- Maak een nieuwe branch aan op basis van de main branch:
    - `git checkout -b <branch name>`
    - Geef de branch een duidelijk beschrijvende naam.
      Gebruik bij voorkeur de naam die door de 'Create a branch'
      link bij het GitHub-issue wordt voorgesteld.

- Schrijf de code:
    - Implementeer de functionaliteit die wordt beschreven in het issue.
    - Test de functionaliteit, schrijf zover zinvol tests (unit, integration etc).
    - Push ook tussentijdse commits naar GitHub.
    - Dit project gebruikt [Lefthook] om de Git pre-commit hook te beheren.
      Lefthook moet daarvoor worden [geïnstalleerd][lefthook-install], waarna
      `lefthook install` kan worden uitgevoerd om de Git pre-commit hook in te
      stellen.

- Maak een pull request (PR) aan:
    - Als de branch commits bevat die al eerder gemerged zijn, kun je die verwijderen met een _interactive rebase_:
      `git fetch; git rebase origin/main --interactive` en verwijder de betreffende commits uit de lijst.
    - Verwijs naar het issue in de beschrijving, bijv. `Closes #42`,
      of link het issue aan de PR onder 'Development' in de rechterkolom.
    - Wijs ten minste 2 reviewers aan.
    - Een [draft pull request] maken is mogelijk ook als je nog niet klaar bent, maar wel feedback wilt.
      Geef in dat geval duidelijk aan (bijv. in de description of een comment) waarop je feedback wilt
      en wat er nog moet gebeuren om de pull request af te maken.
    - Voor richtlijnen over het schrijven en reviewen van PRs, zie ["Pull Requests (PRs)"].

- Merge de pull request:
    - Zorg dat alle opmerkingen (conversations) opgelost zijn.
    - Zorg dat je 2 approvals hebt.
    - Zorg dat alle checks slagen.
    - Klik op 'Merge when ready' om te mergen via de [merge queue].

[draft pull request]: https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/about-pull-requests#draft-pull-requests
[Lefthook]: https://github.com/evilmartians/lefthook
[lefthook-install]: https://lefthook.dev/installation/
[merge queue]: https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/incorporating-changes-from-a-pull-request/merging-a-pull-request-with-a-merge-queue
["Pull Requests (PRs)"]: /documentatie/ontwikkelproces/pull-requests.md

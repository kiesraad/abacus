# Testsoorten en test-tooling

Doel van dit document is beschrijven welke tooling we voor welke tests gebruiken.

De nadruk in dit document lijkt te liggen op testautomatisering, maar zoals in ons ["Testen en kwaliteit"](./testen-en-kwaliteit.md)-document staat: *"handmatig en automatisch testen gaan samen"*.

Tests uitgevoerd door externe partijen (pen test, wettelijke toets) zijn niet opgenomen in dit document.


## Frontend
- Linting: [eslint][eslint]
- Formatting: [prettier][prettier]
- Test runners: [Vitest][vitest] en [Playwright][playwright]
- Mock server: [Mock Service Worker][mock-service-worker]
- Unit tests (voor utils e.d.): geen additionele tools of libraries nodig
- React UI elementen: [Ladle][ladle] en [Playwright][playwright]
- React componenten: [React Testing Library][react-testing-library] en [Mock Service Worker][mock-service-worker]
- React integration tests:  [React Testing Library][react-testing-library] en [Mock Service Worker][mock-service-worker]
- Frontend met mocked backend: [Playwright][playwright] en [Mock Service Worker][mock-service-worker]


```mermaid
---
title: Ladle Stories
---
flowchart LR
    ladle-story(Ladle Story)

    playwright([Playwright])
    browser([Browser])
    msw([Mock Service Worker])

    playwright --> ladle-story
    browser --> ladle-story
    ladle-story ---> msw
```

---

```mermaid
---
title: React elementen
---
flowchart LR
    react-component(React component)

    rtl([React Testing Library])
    msw([Mock Service Worker])

    rtl --> react-component
    react-component ---> msw
```

---

```mermaid
---
title: React integration test
---
flowchart LR
    fe(Frontend)

    rtl([React Testing Library])
    msw([Mock Service Worker])

    rtl ---> fe

    fe --> msw
```

---

```mermaid
---
title: Frontend met mocked backend
---
flowchart LR
    fe(Frontend)

    playwright([Playwright])
    browser([Browser])
    msw([Mock Service Worker])

    playwright ---> fe
    browser ---> fe

    subgraph app
        fe
    end

    fe --> msw
```


## Backend
- Linting: [Rust compiler][rust-compiler] en [clippy][clippy]
- Formatting: [rustfmt][rustfmt]
- Test runner: [cargo test][cargo test]
- Unit en integratie-tests: geen additionele libraries of tools nodig
- API client: [reqwest][reqwest]

Als de performance van `cargo test` een probleem wordt, kunnen we overstappen op [cargo-nextest](https://nexte.st/index.html).



```mermaid
---
title: API integration tests
---
flowchart LR
    be(Backend)
    db[(Database)]

    api-client([API client])

    api-client ---> be

    subgraph app
        be -.- db
    end
```


## End-to-end

Test runner: [Playwright][playwright]

```mermaid
---
title: End-to-end tests
---
flowchart LR
    fe(Frontend)
    be(Backend)
    db[(Database)]

    playwright([Playwright])
    browser([Browser])

    playwright ---> fe
    browser ---> fe

    subgraph app
        fe -.- be
        be -.- db
    end
```


## Security
- [GitHub Dependabot][github-depandabot]
- [GitHub Code Scanning][github-code-scanning]
- [GitHub Secret Scanning][github-secret-scanning]


## Performance

Nog te bepalen.

- Benchmarking opties:
    - [`cargo bench`](https://doc.rust-lang.org/nightly/unstable-book/library-features/test.html)
    - [criterion.rs](https://github.com/bheisler/criterion.rs)
    - [divan](https://github.com/nvzqz/divan)
- Load en stress testen:
    - grote data sets
    - opties voor API calls
        - [JMeter](https://jmeter.apache.org/)
        - [Locust](https://locust.io/)


## Toegankelijkheid
Nog te bepalen.

- Opties:
    - [Google Lighthouse](https://developer.chrome.com/docs/lighthouse/overview/)
    - [Axe](https://github.com/dequelabs/axe-core) (ondersteund door [Ladle][ladle])
    - [Pa11y](https://pa11y.org/)



[cargo test]: https://doc.rust-lang.org/cargo/commands/cargo-test.html
[clippy]: https://github.com/rust-lang/rust-clippy
[eslint]: https://eslint.org/
[github-code-scanning]: https://docs.github.com/en/code-security/code-scanning/introduction-to-code-scanning/about-code-scanning
[github-depandabot]: https://docs.github.com/en/code-security/dependabot/dependabot-security-updates/about-dependabot-security-updates
[github-secret-scanning]: https://docs.github.com/en/code-security/secret-scanning/introduction/about-secret-scanning
[ladle]: https://ladle.dev
[mock-service-worker]: https://mswjs.io
[playwright]: https://playwright.dev/
[prettier]: https://prettier.io/
[react-testing-library]: https://testing-library.com/docs/react-testing-library/intro
[reqwest]: https://crates.io/crates/reqwest
[rustfmt]: https://github.com/rust-lang/rustfmt
[rust-compiler]: https://rustc-dev-guide.rust-lang.org/overview.html
[vitest]: https://vitest.dev

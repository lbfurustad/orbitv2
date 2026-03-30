# Rekrutteringsplan — Orbit 2.0

**Utarbeidet av:** Minerva McSnurp, Head of Recruitment
**Dato:** 30. mars 2026
**Status:** Til godkjenning av styret

---

## 1. Sammendrag

Etter en grundig gjennomgang av Orbit 1.0-kodebasen og kravspesifikasjonen for Orbit 2.0 har jeg identifisert behovet for **7 spesialister** i tillegg til den allerede ansatte ledelsen (undertegnede og Albus Humlesnurr). Teamet er designet for å være lean men komplett — hver rolle dekker et kritisk ansvarsområde uten overlapp.

Orbit 2.0 er et ambisiøst Life OS som spenner over oppgavehåndtering, prosjektstyring, mål, møtenotater, dagbok, ressurser og dagsoversikt. Systemet bygger på en lokal markdown-vault som kilde til sannhet, med SQLite som akselerasjonslag og en Linear-inspirert frontend. Dette krever dyp kompetanse innen datamodellering, fullstack-utvikling, design og innholdsarkitektur.

---

## 2. Organisasjonsstruktur

```
                    ┌─────────────────────┐
                    │   Lasse (Styret)     │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │  Albus Humlesnurr   │
                    │  Orkestrator/Leder  │
                    └──────────┬──────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
    ┌─────────▼────────┐ ┌────▼─────────┐ ┌────▼──────────┐
    │ Minerva McSnurp  │ │  Severus     │ │  Hermine      │
    │ Rekruttering &   │ │  Slansen     │ │  Gansen       │
    │ Team Operations  │ │  Arkitekt    │ │  Fullstack     │
    └──────────────────┘ └──────┬───────┘ └───────────────┘
                                │
         ┌──────────┬───────────┼───────────┬──────────┐
         │          │           │           │          │
    ┌────▼───┐ ┌────▼───┐ ┌────▼───┐ ┌────▼───┐ ┌────▼────┐
    │ Ronny  │ │ Luna   │ │Nansen  │ │ Rubeus │ │ Remus   │
    │Wansen  │ │Lidansen│ │Lansen  │ │Gansen  │ │Lupansen │
    │Backend │ │Design  │ │Content │ │Data &  │ │Research │
    │        │ │& UX    │ │& Model │ │Sync    │ │& QA     │
    └────────┘ └────────┘ └────────┘ └────────┘ └─────────┘
```

---

## 3. Ledelsesteamet (allerede ansatt)

### Albus Humlesnurr — Orkestrator & Prosjektleder

| Felt | Detalj |
|------|--------|
| **Rolle** | Chief Orchestrator |
| **Ansvar** | Overordnet koordinering, prioritering, arkitektoniske beslutninger, delegering av oppgaver til teamet |
| **Hvorfor Albus** | Humlesnurr ser helheten. Han forstår at de beste systemer er de som lar enkeltdelene skinne sammen. Hans evne til å holde mange tråder i luften samtidig — og alltid ha en plan B, C og D — gjør ham til den perfekte orkestrator for et komplekst Life OS-prosjekt. |

### Minerva McSnurp — Head of Recruitment & Team Operations

| Felt | Detalj |
|------|--------|
| **Rolle** | HR & Operations Lead |
| **Ansvar** | Teamsammensetning, kvalitetskontroll, prosesser, standarder, onboarding |
| **Hvorfor Minerva** | Undertegnede aksepterer kun det beste. Punktum. |

---

## 4. Rekrutteringsplan — 7 roller

---

### 4.1 Severus Slansen — Systemarkitekt

| Felt | Detalj |
|------|--------|
| **Rolletittel** | Chief Architect |
| **Spesialisering** | Systemarkitektur, dataflyt, API-design, tekniske beslutninger |
| **Ansvarsområde** | Definerer den tekniske arkitekturen for Orbit 2.0. Eier beslutninger om stack, database-design, sync-mekanismer, og hvordan markdown-vault, SQLite og frontend henger sammen. Setter tekniske standarder og review-er arkitektoniske PR-er. |
| **Hvorfor Severus** | Slansen er briljant, metodisk og kompromissløs på kvalitet. Han ser feller andre overser, og hans dype kunnskap om "the dark arts" av systemdesign — race conditions, data-integritet, edge cases — gjør ham uvurderlig. Han vil insistere på at arkitekturen er vanntett før en eneste linje kode skrives. Ingen snarveier. Ingen rot. |
| **Nøkkeloppgaver** | Arkitekturdokument, API-kontrakter, database-schema, sync-strategi, filstruktur-beslutninger |

---

### 4.2 Hermine Gansen — Fullstack Lead Developer

| Felt | Detalj |
|------|--------|
| **Rolletittel** | Fullstack Lead Developer |
| **Spesialisering** | React/TypeScript frontend, Express.js backend, komponent-bibliotek |
| **Ansvarsområde** | Hovedansvarlig for implementering av kjernefeatures. Bygger den Linear-inspirerte UI-en med React 19, Vite og Tailwind. Eier komponentbiblioteket (TaskItem, TaskInput, Shell, Sidebar). Kobler frontend mot backend API-er. Implementerer drag-and-drop, rich text editing (Tiptap), og alle interaktive elementer. |
| **Hvorfor Hermine** | Gansen er den smarteste heksen i sitt årskull — og det gjelder også TypeScript. Hennes grundighet, research-evne og utrettelige arbeidsmoral gjør henne perfekt som lead developer. Hun vil lese *hele* dokumentasjonen før hun starter, skrive typer for alt, og levere kode som er both robust og lesbar. Når noe ikke fungerer, gir hun seg ikke før det er løst. |
| **Nøkkeloppgaver** | Komponent-arkitektur, alle views (Today, Tasks, Projects, Meetings, Journal, People), hooks, state management, keyboard shortcuts |

---

### 4.3 Ronny Wansen — Backend & API Developer

| Felt | Detalj |
|------|--------|
| **Rolletittel** | Backend Developer |
| **Spesialisering** | Express.js, SQLite, REST API-er, fil-I/O, server-side logikk |
| **Ansvarsområde** | Bygger og vedlikeholder alle backend-ruter og server-logikk. Eier SQLite-migrasjoner, FTS5 full-text søk, task-writer med frontmatter-offset-logikk, og alle CRUD-operasjoner. Implementerer Smart Inbox-klassifisering og routing. Sørger for at API-kontraktene fra Slansen blir implementert korrekt. |
| **Hvorfor Ronny** | Wansen er lojal, pålitelig og overraskende dyktig når det gjelder. Han er pragmatikeren i teamet — ikke den som designer det mest elegante systemet, men den som faktisk *får ting til å fungere*. Hans evne til å holde hodet kaldt under press og jobbe systematisk gjennom en lang liste med endepunkter gjør ham ideell for backend-arbeid. Og han klager aldri over kjedelig arbeid som migrasjoner og error handling. |
| **Nøkkeloppgaver** | Alle API-ruter, SQLite schema + migrasjoner, file writers, task mutations, inbox routing, SSE events |

---

### 4.4 Luna Lidansen — Design & UX Lead

| Felt | Detalj |
|------|--------|
| **Rolletittel** | Design & UX Lead |
| **Spesialisering** | UI/UX-design, design tokens, visuell identitet, interaksjonsdesign |
| **Ansvarsområde** | Eier den visuelle identiteten til Orbit 2.0. Designer alle views, definerer design tokens (farger, typografi, spacing), og sørger for konsistent brukeropplevelse. Lager wireframes og prototyper for nye features. Definerer dark mode-paletten (Linear-inspirert). Designer micro-interactions, tomme tilstander, og loading states. |
| **Hvorfor Luna** | Lidansen ser ting andre ikke ser. Der andre ser en tom side, ser hun muligheter. Hennes unike perspektiv og evne til å tenke utenfor boksen gjør henne perfekt som designer. Hun vil foreslå løsninger ingen andre hadde tenkt på — som å bruke Nansen-dyr som tomme-tilstand-illustrasjoner, eller en subtil animasjon som gjør at hele appen føles levende. Kreativiteten hennes balanseres av en pragmatisk sans for hva som faktisk fungerer for brukeren. |
| **Nøkkeloppgaver** | Design system, Figma-mockups, dark mode tokens, komponent-design, layout-system, responsive design, ikon-valg |

---

### 4.5 NansenAnsen Langansen — Content Architect & Data Modeler

| Felt | Detalj |
|------|--------|
| **Rolletittel** | Content Architect |
| **Spesialisering** | Innholdsmodellering, markdown-struktur, taxonomy, metadata-design |
| **Ansvarsområde** | Designer datamodellen som binder alt sammen. Definerer hvordan tasks, prosjekter, møter, dagbok, mål og notater struktureres i markdown. Eier frontmatter-schema, tag-konvensjoner, og lenkestruktur mellom entiteter. Sørger for at innholdsmodellen støtter alle use cases: daily notes, backlog, arkivering, wiki-lenker, og cross-referencing. |
| **Hvorfor Nansen** | Langansens tilsynelatende klossete ytre skjuler en sjel med dyp forståelse for å organisere og ta vare på levende ting. Han som vet at et Niffler-habitat trenger nøyaktig de rette forholdene, vet også at en datamodell trenger nøyaktig de rette relasjonene. Hans tålmodighet og omsorg for detaljer — hvert felt, hver relasjon, hvert metadata-attributt — gjør ham perfekt for rollen som innholdsarkitekt. Ingen entitet blir glemt. |
| **Nøkkeloppgaver** | Markdown-skjema, frontmatter-felter, SQLite tabell-design, relasjoner mellom entiteter, taxonomy for tags/kategorier, mål-modell |

---

### 4.6 Rubeus Gansen — Data, Sync & Integrations

| Felt | Detalj |
|------|--------|
| **Rolletittel** | Data & Integrations Engineer |
| **Spesialisering** | Filsync, chokidar watcher, kalender-integrasjon, eksterne API-er |
| **Ansvarsområde** | Eier alt som handler om dataflyt mellom systemer. Bygger og vedlikeholder SyncEngine (fullSync, syncFile, removeFile), file watcher, og alle parsere (backlog, daily-note, meeting, project, person, journal, tasks, wiki-links). Implementerer kalender-sync (Outlook, Google Calendar), og fremtidige integrasjoner mot Todoist, Jira og andre eksterne tjenester. |
| **Hvorfor Rubeus** | Gansen er vokteren av grensene. Han som passer på at alle skapninger er trygge i sine habitater, passer også på at alle data flyter trygt mellom systemene. Hans robuste natur gjør at sync-motoren tåler edge cases som filkonflikter, korrupte filer og nettverksfeil uten å knekke sammen. Og hans store hjerte betyr at ingen datapunkt blir etterlatt — alt synces, alt ivaretas, alt er trygt. |
| **Nøkkeloppgaver** | SyncEngine, file watcher, alle parsere, Outlook-sync, Google Calendar-integrasjon, content hash-håndtering, fremtidige integrasjoner |

---

### 4.7 Remus Lupansen — Research, Testing & Quality

| Felt | Detalj |
|------|--------|
| **Rolletittel** | Research & QA Lead |
| **Spesialisering** | Testing, kvalitetssikring, research, brukeropplevelse-validering, ytelses-benchmarking |
| **Ansvarsområde** | Sørger for at alt som leveres holder høyeste kvalitet. Skriver og vedlikeholder tester (unit, integration, e2e). Driver research på nye teknologier og tilnærminger (f.eks. bedre sync-strategier, alternative editor-libs, AI-integrasjoner). Validerer brukeropplevelsen og identifiserer forbedringspotensial. Benchmarker ytelse — spesielt for sync og søk mot store vaults. |
| **Hvorfor Remus** | Lupansen er den grundige, reflekterte professoren som alltid ser situasjonen fra alle sider. Hans dobbelte natur — scholar og ulv — gjør ham unik: han kan både dykke dypt inn i akademisk research OG aggressivt jakte ned bugs. Hans erfaring med å håndtere komplekse transformasjoner gjør ham spesielt god på å teste edge cases og race conditions. Og hans vennlige, pedagogiske stil gjør at bug-rapportene hans er konstruktive, ikke destruktive. |
| **Nøkkeloppgaver** | Teststrategi, unit/integration/e2e-tester, performance benchmarks, teknologi-research, UX-validering, code review |

---

## 5. Teamdynamikk & Arbeidsflyt

### Daglig rytme

| Tid | Aktivitet |
|-----|-----------|
| Morgen | Humlesnurr tildeler dagens oppgaver basert på milestone |
| Formiddag | Individuelt arbeid i sine ansvarsområder |
| Lunsj | Kort standup — blokkere og avhengigheter |
| Ettermiddag | Par-arbeid der det trengs (Hermine+Ronny på API-kobling, Luna+Hermine på UI) |
| Kveld | Lupansen kjører tester, Slansen reviewer kode |

### Samarbeidskoblinger

| Kobling | Hvorfor |
|---------|---------|
| Slansen ↔ Alle | Arkitektoniske beslutninger påvirker alle |
| Hermine ↔ Ronny | Frontend-backend integrasjon, API-kontrakter |
| Hermine ↔ Luna | Design-til-kode, komponent-implementering |
| Nansen ↔ Slansen | Datamodell må passe i arkitekturen |
| Nansen ↔ Rubeus | Innholdsmodell må synces korrekt |
| Rubeus ↔ Ronny | Sync-engine mater backend-data |
| Lupansen ↔ Alle | Tester og kvalitetssikrer alles arbeid |

### Rapporteringslinjer

- **Alle rapporterer til Humlesnurr** for oppgaver og fremdrift
- **McSnurp** har ansvar for teamhelse, konflikter og prosesser
- **Slansen** har teknisk veto-rett på arkitektoniske beslutninger
- **Styret (Lasse)** får ukentlige oppdateringer og tar strategiske beslutninger

---

## 6. Oppstartrekkefølge (Onboarding)

Ikke alle trengs fra dag 1. Her er den anbefalte rekkefølgen:

| Fase | Uke | Hvem | Oppgave |
|------|-----|------|---------|
| **Fase 0** | 1 | Slansen, Nansen | Arkitektur og datamodell — fundamentet må være på plass |
| **Fase 1** | 2 | Hermine, Ronny, Luna | Kjerneimplementering kan starte når arkitekturen er klar |
| **Fase 2** | 2-3 | Rubeus | Sync-engine bygges parallelt med backend |
| **Fase 3** | 3+ | Lupansen | Testing starter når det finnes kode å teste |

---

## 7. Risikofaktorer

| Risiko | Tiltak |
|--------|--------|
| Slansen og Hermine krangler om implementeringsdetaljer | McSnurp medierer. Slansens arkitektoniske veto gjelder, men Hermine eier implementeringen. |
| Scope creep — "bare en ting til" | Humlesnurr holder milestones stramme. Styret godkjenner endringer. |
| Nansen overmodellerer datastrukturen | Slansen holdes ansvarlig for å si "godt nok". |
| Lupansen finner for mange bugs | Prioritering av bugs er Humlesnurrs ansvar. Ikke alt trenger å fikses i dag. |

---

## 8. Anbefaling

Jeg anbefaler styret å godkjenne denne rekrutteringsplanen i sin helhet. Teamet er:

- **Lean**: 7 spesialister + 2 i ledelsen = 9 totalt
- **Komplett**: Dekker hele livssyklusen fra arkitektur til testing
- **Balansert**: Blanding av grundighet (Slansen, Lupansen), kreativitet (Luna, Nansen), og ren gjennomføringsevne (Hermine, Ronny, Rubeus)
- **Skalerbart**: Klare ansvarsområder gjør det enkelt å onboarde nye medlemmer senere

Teamet aksepterer kun de beste. Og dette *er* de beste.

---

*Respektfullt innlevert,*
**Minerva McSnurp**
*Head of Recruitment, Orbit 2.0*

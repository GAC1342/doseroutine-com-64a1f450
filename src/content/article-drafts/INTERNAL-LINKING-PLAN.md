# Internal linking plan — /articles cluster

Hub-and-spoke: **best-apps-managing-prescriptions** is the money page (highest
volume, commercial intent). The other four link into it; it links back out to
the intent-split and how-to pages so link equity circulates instead of pooling.

Existing targets used (all live routes):

| Path                                              | Type                              |
| ------------------------------------------------- | --------------------------------- |
| `/articles/best-apps-managing-prescriptions`      | comparison hub                    |
| `/articles/medication-reminder-app`               | buyer's guide                     |
| `/articles/pill-reminder-app`                     | intent split (simple vs protocol) |
| `/articles/best-apps-for-health`                  | broad category listicle           |
| `/articles/set-up-medication-reminder-health-app` | tutorial                          |
| `/dose-routine`                                   | product page                      |
| `/manual`                                         | support / docs                    |

Rules applied: descriptive keyword-bearing anchors (never "click here"), one
link per target per post, links placed inside body copy at the point of need
(not a dumped "related posts" block), 4–5 internal links per post.

---

## 1. best-apps-managing-prescriptions (hub)

| Section                                      | Anchor text                                                                             | Target                                                             |
| -------------------------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| "What managing prescriptions actually means" | simple pill reminder app                                                                | `/articles/pill-reminder-app`                                      |
| After the DoseRoutine entry                  | See how DoseRoutine tracks prescriptions and stacks / step-by-step reminder setup guide | `/dose-routine`, `/articles/set-up-medication-reminder-health-app` |
| "How to choose the right app" Q4             | best apps for health                                                                    | `/articles/best-apps-for-health`                                   |
| "When a simple pill reminder is not enough"  | medication reminder app                                                                 | `/articles/medication-reminder-app`                                |
| Same section, closing line                   | DoseRoutine manual                                                                      | `/manual`                                                          |

## 2. medication-reminder-app (buyer's guide)

| Section                                    | Anchor text                                                              | Target                                                       |
| ------------------------------------------ | ------------------------------------------------------------------------ | ------------------------------------------------------------ |
| Intro                                      | pill reminder app vs. protocol tracker                                   | `/articles/pill-reminder-app`                                |
| "How DoseRoutine compares"                 | DoseRoutine                                                              | `/dose-routine`                                              |
| End of "Setting up reminders that stick"   | how to set up a medication reminder in a health app / DoseRoutine manual | `/articles/set-up-medication-reminder-health-app`, `/manual` |
| "Reminder apps vs protocol trackers" close | best apps for managing prescriptions                                     | `/articles/best-apps-managing-prescriptions`                 |

## 3. pill-reminder-app (intent split)

| Section                        | Anchor text                             | Target                                       |
| ------------------------------ | --------------------------------------- | -------------------------------------------- |
| Intro                          | how to choose a medication reminder app | `/articles/medication-reminder-app`          |
| "What a protocol tracker adds" | DoseRoutine                             | `/dose-routine`                              |
| Decision framework Q5          | best apps for health                    | `/articles/best-apps-for-health`             |
| Decision framework close       | best apps for managing prescriptions    | `/articles/best-apps-managing-prescriptions` |
| Migration step 2               | DoseRoutine manual                      | `/manual`                                    |

## 4. best-apps-for-health (broad listicle)

| Section                             | Anchor text                                        | Target                                                        |
| ----------------------------------- | -------------------------------------------------- | ------------------------------------------------------------- |
| #1 Medication and protocol tracking | DoseRoutine / best apps for managing prescriptions | `/dose-routine`, `/articles/best-apps-managing-prescriptions` |
| #2 Apple Health / Google Fit        | medication reminder app                            | `/articles/medication-reminder-app`                           |
| #3 Nutrition and meal logging       | manual                                             | `/manual`                                                     |
| "How we chose" step 2               | a simple pill reminder or a full protocol tracker  | `/articles/pill-reminder-app`                                 |

## 5. set-up-medication-reminder-health-app (tutorial)

| Section               | Anchor text                                    | Target                                       |
| --------------------- | ---------------------------------------------- | -------------------------------------------- |
| Intro                 | medication reminder app buyer's guide          | `/articles/medication-reminder-app`          |
| Step 2                | DoseRoutine                                    | `/dose-routine`                              |
| Step 4 (stacks)       | basic pill reminder app and a protocol tracker | `/articles/pill-reminder-app`                |
| Step 6 (logging)      | DoseRoutine manual                             | `/manual`                                    |
| Common setup mistakes | best apps for managing prescriptions           | `/articles/best-apps-managing-prescriptions` |

---

## Link graph

```text
best-apps-managing-prescriptions  <-->  medication-reminder-app
            ^  \                              ^   \
            |   \--> best-apps-for-health <---|    \--> set-up-medication-reminder-health-app
            |            |   ^                              |
            \------------|---+------ pill-reminder-app <-----/
```

Every post receives at least three inbound internal links from the cluster,
and every post links to `/dose-routine` and `/manual` exactly once.

---

## Week 1 of the 60-day calendar (cluster pillar)

`/articles/best-medication-reminder-apps` is the cluster pillar for the
60-day editorial calendar: every new roundup links up to it, and it links back
down to each spoke. The original money page,
`/articles/best-apps-managing-prescriptions`, stays in the graph as the
prescriptions-focused hub.

| Post                                               | Links up to                                  | Links across to                                                                                                                                                                                                                                                                                                                                                                                                         |
| -------------------------------------------------- | -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/articles/best-medication-reminder-apps` (pillar) | `/articles/best-apps-managing-prescriptions` | `/articles/best-free-medication-reminder-apps`, `/articles/best-pill-reminder-apps-for-seniors`, `/articles/best-medication-reminder-apps-iphone`, `/articles/best-medication-reminder-apps-android`, `/articles/best-apps-for-tracking-supplements`, `/articles/best-apps-for-peptide-tracking`, `/articles/medication-reminder-app`, `/articles/pill-reminder-app`, `/articles/set-up-medication-reminder-health-app` |
| `/articles/best-free-medication-reminder-apps`     | `/articles/best-medication-reminder-apps`    | `/articles/best-medication-reminder-apps-iphone`, `/articles/best-medication-reminder-apps-android`, `/articles/best-pill-reminder-apps-for-seniors`, `/articles/best-apps-for-tracking-supplements`, `/articles/pill-reminder-app`                                                                                                                                                                                     |
| `/articles/best-pill-reminder-apps-for-seniors`    | `/articles/best-medication-reminder-apps`    | `/articles/best-apps-managing-prescriptions`, `/articles/set-up-medication-reminder-health-app`                                                                                                                                                                                                                                                                                                                         |
| `/articles/best-medication-reminder-apps-iphone`   | `/articles/best-medication-reminder-apps`    | `/articles/best-medication-reminder-apps-android`, `/articles/set-up-medication-reminder-health-app`                                                                                                                                                                                                                                                                                                                    |
| `/articles/best-medication-reminder-apps-android`  | `/articles/best-medication-reminder-apps`    | `/articles/best-medication-reminder-apps-iphone`, `/articles/best-free-medication-reminder-apps`, `/articles/best-pill-reminder-apps-for-seniors`, `/articles/pill-reminder-app`                                                                                                                                                                                                                                        |
| `/articles/best-apps-for-tracking-supplements`     | `/articles/best-medication-reminder-apps`    | `/articles/best-apps-for-peptide-tracking`, `/articles/best-free-medication-reminder-apps`, `/articles/best-apps-managing-prescriptions`                                                                                                                                                                                                                                                                                |
| `/articles/best-apps-for-peptide-tracking`         | `/articles/best-medication-reminder-apps`    | `/articles/best-apps-for-tracking-supplements`                                                                                                                                                                                                                                                                                                                                                                          |

| `/articles/missed-dose-what-to-do` | `/articles/best-medication-reminder-apps` | `/articles/set-up-medication-reminder-health-app`, `/articles/best-pill-reminder-apps-for-seniors` |
| `/articles/multiple-daily-dose-reminders` | `/articles/best-medication-reminder-apps` | `/articles/set-up-medication-reminder-health-app`, `/articles/best-free-medication-reminder-apps`, `/articles/missed-dose-what-to-do` |

Inbound links to the two dose-handling guides come from the pillar
(`/articles/best-medication-reminder-apps`), the setup walkthrough
(`/articles/set-up-medication-reminder-health-app`) and the category page
(`/articles/medication-reminder-app`).

Every post in this set keeps at least two inbound and two outbound cluster
links, so nothing is orphaned and equity circulates back to the pillar.

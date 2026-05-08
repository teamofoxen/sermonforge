# Beta Testing Initiative (BTI) — Charter

**Status:** Scoping. No build work has begun. No testers have been recruited. The full BTI document accumulates as the program runs; this charter is the starting frame.
**Audience:** The lone developer of SermonForge, who is also a pastor and the pastor-user. Written in plain language, no engineering vocabulary required.
**Date drafted:** 2026-05-01.
**Revised:** 2026-05-06 — ACC, SFDI, SADI, and SPRD all closed since drafting. BTI is now a validation pass on built behavior, not a paired front with concurrent in-flight work. Dependencies, routing language, and Q7's capacity framing updated accordingly.

---

## Why this initiative exists

SermonForge is being built around a thesis that an AI-assisted sermon prep tool can deepen the pastor's work without taking it over. The thesis has two failure modes that kill the project, not just a feature:

1. **AI overreach.** A pastor ever feels the AI is trying to do the work for them. They reject the thesis consciously and walk away.
2. **Workflow misfit.** The tool doesn't feel right enough, or solid enough, to become their workflow. They drift away silently — not because the AI did anything wrong, but because the tool never earned a place in the week.

Both are project-killers. The first kills SermonForge by betraying its thesis. The second kills it by never becoming habit. BTI weights both equally.

The product owner cannot test either failure mode alone. Self-testing is contaminated — the developer knows what the AI is *meant* to be doing and what the workflow is *meant* to feel like, so cannot feel what an unprimed pastor feels when the AI lands a paragraph in their study notes uninvited, or when the tool sits unopened on a Wednesday morning. Both modes have to be tested by pastors who didn't build it.

BTI exists to test them. It runs a closed beta with a cohort of pastor friends — a high-trust group — and tests both failure modes against a SermonForge that has, as of program start, completed its major in-flight initiatives. The AI Clarity & Constraint remediation (the cleanup of the AI subsystem's tab-side bypasses and direct-write paths), SFDI (the Study throughline), SADI (the MPT/MPS pair as sermon anchor), and SPRD (the Study phase redesign) have all shipped. What was in-flight when this charter was first drafted is now built. BTI's job is to ask whether those built changes actually feel like fixes from the outside — whether the AI's invasiveness has actually been constrained, whether the throughline actually deepens the work for a pastor who didn't build it, whether the surrounding tool feels solid enough to keep using.

---

## The anchoring concerns

Two concerns, weighted equally. Every other dimension reads against both.

### Anchor 1 — Invasiveness

The directional principle, stated plainly: **the pastor drives the sermon. The AI assists.** Anything that inverts that — the AI drafting paragraphs the pastor lightly edits, the AI deciding the shape of the work, the AI's voice replacing the pastor's voice — is a thesis-betraying failure.

Invasiveness shows up in three layers, and BTI watches all three:

1. **Felt invasiveness** — the pastor names it. "It's writing my sermon for me." "It's too eager." "I felt steamrolled." These come through the feedback tiers below.
2. **Behavioral invasiveness** — the pastor doesn't name it but the behavior shows it. High accept-rate of unedited AI output. Short time on a field before the AI button is pressed. The AI panel open more than the study work. These come through the automated signals below.
3. **Theological invasiveness** — the AI's frame is overriding the pastor's frame. Reformed/PD-aligned answers being slowly homogenized into a generic Evangelical voice. This is the hardest layer to surface, and depends on signals the pastor is least equipped to notice in their own work — by the time it's drift, it feels like their own thinking. The theological frame check method below is the concrete answer to this layer.

### Anchor 2 — Workflow-fit

Stated plainly: **the tool has to become the way the pastor preps sermons, not a thing they visit on top of how they prep sermons.** A tool that doesn't earn a place in the week dies of neglect, no matter how good its AI is.

Workflow-fit shows up in three layers too:

1. **Felt fit** — the pastor names it. "This feels right." "I keep wanting to come back to it." Or the inverse: "It's clunky." "It's in my way." "I forget it exists." These come through the feedback tiers.
2. **Behavioral fit** — the pastor doesn't name it but the behavior shows it. Sustained week-over-week use. Sermons started *and finished* in the tool. The tool open during normal prep hours, not just during "I should test SermonForge" sessions. These come through the automated signals.
3. **Integration fit** — the tool meets the pastor's existing workflow rather than demanding a new one. Note: detailed workflow-integration options are a future discussion; BTI surfaces the *signal* that integration matters, the *what* gets designed downstream.

BTI's job is to make all six layers visible — three of invasiveness, three of workflow-fit — and to weight them as paired anchors when reading any single piece of feedback.

---

## The cohort

A cohort of pastor friends, all known personally to the product owner. Recruitment is invitation-only. The cohort's defining property is **high trust** — every tester knows the developer, knows the project, and is opting in to deep observation in exchange for shaping the tool. Final cohort size is gated on Q7 below.

### What high trust gives BTI

- **Permission to instrument heavily.** Telemetry events that would be invasive at scale are acceptable here, because the testers know what's being captured and why, and the data flows to one person they trust. Production builds will scale this back; beta does not have to.
- **Permission to ask for depth.** Closed-beta testers will give thirty-minute interviews and write paragraph-length feedback in a way an open-beta cohort would not. BTI's deepest tier exists because the cohort is small enough to honor it.

### What high trust costs BTI

Friends are bad at being users in three predictable ways. Each one has to be designed against, not hoped against:

- **Pulled punches.** A friend will say "this is great, really cool" instead of "I tried it twice and went back to my old workflow." The hardest feedback — the kind that kills the project if missed — is exactly the kind a friend rounds off.
- **Loyalty over-engagement.** A friend will use the tool *more* than they would naturally, because they want it to succeed. This pollutes workflow-fit signal upward — the behavioral data shows them reaching for it, but only because they were testing it.
- **Soft-pedaled invasiveness.** A friend who feels the AI overreached is more likely to say "I just edited it, no big deal" than "this felt like it was writing my sermon for me." The very dimension BTI is built to catch is the one most blunted by friendship.

These don't disqualify the cohort — they *are* the cohort, and the alternative (recruiting strangers for a closed beta of an unfinished tool) is worse on every other axis. They just have to be designed against. Two design responses, both expanded later in this document:

1. **The tester-facing summary inverts the tester's job.** It explicitly asks them to be the kind of friend who tells the developer the tool is in their way, not the kind who tells the developer the tool is promising. (See "What BTI will produce" item 2.)
2. **Tier 3 prompts lean behavioral, not impressionistic.** "Did you open the app this week without me asking?" beats "How did the app feel this week?" Behavior is harder to soft-pedal than feeling. (See "Feedback capture model" Tier 3.)

### Cohort scale and feasibility

The cohort size has a real arithmetic underneath it that has to be modeled, not left as a default.

Tier 3 is the heart of the longitudinal signal — each round is roughly a thirty-minute exchange per tester (written, voice, or async). At 20-30 testers per round that is **10-15 hours of Tier 3 alone per round**, before Tier 2 review, telemetry analysis, feedback-routing decisions into the development backlog, the visible-loop digest back to the cohort, theological frame-check cross-reading, and the actual build work. With ACC, SFDI, SADI, and SPRD all closed, BTI does not compete with another major content initiative for the developer's hours — but Mac distribution (in flight) and the theology corpus (queued) still draw against the same time budget, and BTI is itself a multi-month commitment.

Three viable shapes:

- **Smaller and deeper (10-15 testers).** Tier 3 fits in 5-7.5 hours per round. Every tester gets every round. Per-voice signal is sharper. Attrition hurts more — losing one tester is 7-10% of the cohort.
- **Larger and shallower (20-30 testers).** Tier 3 cannot cover everyone every round at full participation. Either rounds happen less often, or Tier 3 covers a rotating subset each round. Broader signal volume; per-voice signal is thinner. More attrition resilience.
- **Hybrid: 20-30 enrolled, rotating Tier 3 subset.** Everyone gets Tier 1 (in-app flag) and Tier 2 (pop-out form) continuously. Tier 3 rotates through subsets — say 8-10 testers per round — so every tester gets Tier 3 every two or three rounds. Closes some of the throughput gap without losing breadth.

The right answer depends on what the developer can sustain alongside Mac distribution work and ongoing maintenance, what theological frame-check participation looks like (another tester-burden vector — see below), what the visible-loop cadence to the cohort needs to be (see "Feedback-to-action pathway"), and what active-cohort floor the program commits to for Stage 1 completion (see "Tester attrition"). These resolve together as Q7.

---

## What BTI will produce

Four deliverables, walked roughly in parallel:

1. **A beta build of SermonForge with feedback UI baked in.** A separate installer or feature-flagged variant of the main app, distinct from the production build, with the in-app feedback surfaces and telemetry described below active. Testers run this build instead of the production build for the duration of the program.
2. **A tester-facing summary document.** Short, plain-language, written for the pastor — what they're signing up for, what's being captured, how to give feedback, and what the program asks of them. **The summary explicitly inverts the tester's job: it asks them to tell the developer when the tool is in their way, when they didn't reach for it, when the AI felt like it was doing their work — not to tell the developer the tool is promising or that it's coming along.** This inversion is the primary mitigation for friend-cohort pulled punches. Distinct from this charter; this charter is for the developer, the summary is for the cohort. Drafted in Phase 1 and finalized before Phase 2 onboarding.
3. **A feedback intake and review system.** A capture path for every feedback tier, a review cadence the developer can sustain alongside other work, a routing decision for every finding (see "Feedback-to-action pathway"), and a path from feedback into the development backlog (new tickets, sharpening of in-flight work, or explicit ratification of recently-shipped work).
4. **A living BTI document.** This charter starts the document. As the program runs, the document accumulates the dimensions tested, the patterns observed, the routing decisions made, the rulings made, and the production-side outcomes — including which telemetry events survive into production and which retire when the cohort closes.

---

## Feedback capture model

Three tiers for tester voice, plus a layer of automated signals running underneath. Each tier is designed for a different cost-per-interaction.

### Tier 1 — In-app flag (thirty seconds)

A small, persistent affordance in the app — a flag button visible at every AI surface (the AI Panel, every tab-side AI action, every proposal). Clicking it captures the moment: which surface, which sermon, which step, what the AI said, what the pastor saw. The pastor can add a one-line note or send blank. The cost is near-zero, so the pastor uses it freely.

This tier is the heart of the system. It captures the moment of friction *as it happens*, not after the pastor has rationalized it away. A flag without a note still tells the developer where to look.

### Tier 2 — Pop-out feedback form (five minutes)

A larger feedback surface, accessed from a menu item or a button in the app's footer, that pops out into its own window. Structured but not bureaucratic. The form has a small number of named dimensions (see below) and a free-text field for each. The pastor fills out what they have time for and sends.

This tier is where felt-but-not-immediate observations land — "the AI panel felt heavier this week," "I keep skipping the Implications fields and going straight to AI," "I trusted it less today than yesterday." Things that don't fit a flag.

### Tier 3 — Async interview (thirty minutes)

A scheduled written or voice exchange — could be a Loom recording, a Google Doc, a Discord voice room, or a phone call. Periodic, not continuous. The developer writes a short prompt and the pastor responds in their own time and shape.

**Tier 3 prompts lean behavioral, not impressionistic.** "Did you open the app this week without me asking?" "When you didn't open it, what were you doing instead?" "When the AI gave you a paragraph, how much of it ended up in your final sermon — word for word, edited, or scrapped?" "Walk me through the last sermon prep session that didn't use the tool, and tell me why." Concrete questions about what happened beat questions about how things felt — partly because behavior is harder for a friend to soft-pedal than feeling, partly because the answers tie directly to the behavioral signal layer of both anchors.

This tier is also where the *workflow-integration* dimension surfaces — the only tier slow enough for a pastor to articulate the shape of their existing prep workflow against the tool they're testing.

### Layer 0 — Automated signals (continuous)

Running underneath all three tiers. The cohort is high-trust, so beta telemetry can be fairly rich. Candidate signals:

- **AI accept-rate** — what fraction of AI proposals are accepted unedited, edited, or rejected?
- **Time-on-field before AI press** — how long does the pastor sit with a field before pressing the AI button?
- **AI panel time vs. study work time** — is the pastor in the AI panel more than they're in the fields?
- **Edit distance** between AI proposal and saved field.
- **AI calls per sermon** — total volume per sermon, broken out by surface (Study, Outline, Delivery, AI Panel).
- **App-open events without AI use** — sessions where the pastor opens the app but doesn't reach for AI. Workflow-fit signal.
- **Sermons started but not finished** — abandonment at the sermon level, not just the field level.
- **Tour and onboarding events** — where testers complete or drop off.
- **Crash and error events** — the existing audit log, augmented for the cohort.
- **Context tier composition** — which tiers flowed into each AI call, for invasiveness analysis post-hoc.

Two separate decisions sit on top of this list: which signals to capture (Q3) and how to interpret each one once captured (Q3b). The interpretation question is not optional and not downstream of the capture question — high unedited accept-rate could equally mean "the AI got it right" or "the pastor is rubber-stamping," and the charter cannot pretend there's a default reading. Each signal needs both rulings, separately, before it tells the developer anything about a failure mode.

Production builds will scale this back to a much smaller set; the production scaledown is named at the end of this document.

---

## Theological frame check method

Theological invasiveness is the layer of Anchor 1 the charter takes most seriously and the layer the rest of the feedback model is least equipped to catch. By the time frame drift is happening, it feels like the pastor's own thinking, not like external influence. The pastor cannot self-report it reliably. The other tiers lean on the pastor noticing — which is exactly what they're least able to do.

A concrete method, designed to surface drift even when the pastor cannot:

**Pre-program writing sample.** Before installing the beta build, the opted-in tester drafts a short exegetical pass on a specified text — fifteen to thirty minutes, no AI tools, just the pastor and the text. The developer keeps this as a baseline.

**Mid-program writing sample.** At a defined midpoint of the program, the same exercise on a different text of comparable shape. The pastor does this without consulting their first sample. Same time budget, no tools.

**Close-of-program writing sample.** A third sample at program close, again on a fresh text of comparable shape.

**Cross-reading by the developer.** The three samples are read together, not against each other on content but on *shape*: vocabulary range, theological moves the pastor makes by reflex, the structural arc of an exegetical paragraph, the points at which a tester who used to bring up X now brings up Y. The signal is shift, not quality. Three samples with the same fingerprint say the AI did not displace the pastor's voice. Three samples with a fading fingerprint — vocabulary narrowing, structural moves homogenizing, theological emphases drifting toward whatever frame the AI defaults to — say something is being displaced.

**Opt-in.** This is a real burden. Three writing exercises on top of the rest of the program is a meaningful ask. Make it opt-in, surfaced explicitly in the tester-facing summary, with the cohort told that opting in is the deepest help they can give but that not opting in does not mean a lesser tester. Expect roughly a third to half of the cohort to participate; that's enough sample for the cross-reading to do useful work.

**Note on text choice.** Texts of comparable shape, not the same text, so the pastor isn't recalling their first pass. A short pre-program brief picks three texts of similar exegetical complexity from a pool, randomly assigned across the cohort.

---

## Feedback dimensions

The pop-out form (Tier 2) and the async interview (Tier 3) both work against a common set of dimensions. Testers don't have to cover all of them — they fill what's loaded for them — but the dimensions exist so the developer can read patterns across the cohort.

1. **Invasiveness** — Anchor 1. Did the AI feel like a partner or a ghost-writer this session? Did you ever feel pushed? Did you ever feel unseen?
2. **Workflow-fit** — Anchor 2. Did the tool fit into your week, or work against it? Are you reaching for it, or having to remind yourself to use it? What in your existing prep workflow does it not yet meet?
3. **AI response quality** — relevance to the passage, depth, tone, theological soundness, citation faithfulness.
4. **Trust** — would you put a real upcoming sermon in this, or only a throwaway? Did anything happen this week that changed your trust level?
5. **Friction and surprise** — what slowed you down? What got in the way? What did you expect to be there and wasn't?
6. **Onboarding and first-run** — the tour, the setup screen, the first sermon. (This dimension fades after the tester's first few sessions.)
7. **Reliability and weirdness** — crashes, save concerns, anything that made you nervous about your data.
8. **Performance and feel** — did the app feel responsive? Did the AI feel fast enough to be a partner and slow enough to be considered?
9. **Voice and frame** — does the AI's theological frame feel aligned with yours? Has that drifted over the weeks?
10. **What surprised you** — open dimension. Anything that didn't fit the others.

Dimensions 1 and 2 co-lead. Every other dimension is read against both — a quality complaint that's also an invasiveness complaint reads differently than a pure quality complaint, and a friction complaint that's also a workflow-fit complaint reads differently than a one-off frustration.

---

## Reading feedback across the cohort

Twenty to thirty pastors will not produce a chorus. Two pastors will say opposite things about the same surface — one will love the AI Panel's "What I can see" indicator and another will find it noisy. The charter has to commit to a weighting heuristic in advance, or the loudest tester wins by default and the friend-cohort soft-pedaling problem compounds.

Four rules, applied in this order:

1. **Behavior beats stated when they conflict.** A tester who says they love the tool but opens it once a week is reporting workflow misfit, regardless of what they wrote in the form. A tester who says the AI felt invasive but their accept-rate of unedited proposals is 80% is reporting something more complicated than invasiveness. When stated and behavioral signals diverge, the behavioral signal carries more weight; the stated signal becomes a question to ask in the next Tier 3.
2. **Longitudinal trend beats single-session reaction.** Week one frustration is normal — every new tool is clunky for a week. Week four frustration is signal. Conversely, week one delight is normal — every new tool is exciting for a week. Week four sustained reach-for-it is signal. Single sessions get filed; trends get acted on.
3. **Anchor failures elevate at small N.** A single credible report of invasiveness or sustained workflow misfit is *not* outvoted by a chorus of "fine." The friend-cohort downside means anchor failures are systematically underreported; one credible report likely represents three the developer didn't hear. Anchor-positive surfaces still need a chorus to count as positive; anchor-failures don't need one to count as failures.
4. **Concrete specificity beats impressionistic adjectives.** "On Tuesday I tried to use the Compile Implications button and it wrote three paragraphs I didn't ask for, and I rewrote them all" beats "the AI feels too eager." Both go in the file; only the first is actionable. Tier 3 prompts (behavioral lean) are designed to produce more of the first kind.

These rules are committed in the charter so the developer applies them before the data arrives, not after — a heuristic chosen post-hoc against feedback already read is just rationalization.

---

## Feedback-to-action pathway

The single fastest way to lose a high-trust tester is to make their feedback feel like it disappeared. This is a worse failure for BTI than losing a low-trust tester would be, because the high-trust testers are the ones most likely to stay long enough to surface the slow signals — workflow drift, theological drift, sustained workflow-fit — that the program needs most. The pathway from tester voice to product action is therefore load-bearing.

Two requirements, both committed from Phase 1:

**Every BTI finding gets a routing decision, on the record.** Each Tier 1 flag, Tier 2 form, and Tier 3 exchange is reviewed and routed into one of four buckets:

- *New development item.* Goes to the development backlog as a new ticket — a UI fix, an AI behavior change, a content correction, a copy revision, whatever the finding calls for.
- *Sharpens or unblocks something already in motion.* The finding settles a question on Mac distribution, the theology corpus, or any other queued or in-flight work whose shape it helps clarify. This bucket also picks up findings that *ratify or challenge* recently-shipped work — feedback that doesn't generate new work but tells the developer whether ACC, SFDI, SADI, or SPRD landed as felt improvements.
- *BTI-only entry.* A pattern visible in the cohort but not yet sharp enough to ticket — kept in the living BTI document until it sharpens.
- *Note-and-defer.* Acknowledged, no action, with a stated reason. (Not a wastebasket — every note-and-defer reads like a real ruling, because the tester will see it routed there in the digest below.)

The routing decision is logged in the living BTI document. Nothing falls through.

**A visible loop runs back to the cohort.** Weekly or biweekly — cadence settles in Phase 0 alongside cohort scale — the cohort gets a short digest: here's what testers flagged, here's what landed in the build because of it, here's what's in the queue, here's what we decided not to do and why. The digest is the antidote to "did anyone read my flag?" It also doubles as a re-engagement nudge — testers who see their feedback shipping use the tool more.

The visible loop is built into the program from Phase 1, not added later if engagement flags. Adding it after engagement flags is too late.

---

## Tester attrition

A cohort of pastor-friends will not stay at full size. Some will drop off after week two. Others will go nominally-enrolled-but-silent — installed the build, never opened it, polite when asked. The completion criterion has to be defined against an *active* cohort, not the enrolled cohort, or the program will hit its close date with a unanimity it never had.

**Definitions.**

- **Active.** The tester has opened the app at least three times in the last two weeks *and* submitted at least one feedback artifact (Tier 1, 2, or 3) in the last four weeks.
- **Silent.** The tester is not active by the above definition: app not opened in two weeks, or no feedback in four weeks.
- **Dropped.** The tester has been silent for six weeks *and* did not respond to a re-engage outreach.

**Program response when a tester goes silent.**

The developer reaches out personally — one outreach, friendly, not metrics-framed. "Haven't seen you in the app in a couple weeks — is it the tool, or just life?" If the answer is life, the tester stays in the cohort and may rejoin without ceremony. If the answer is the tool, the conversation is itself Tier 3 signal — and a particularly valuable one, because testers who quietly stopped using a tool tell the developer more about workflow misfit than testers who keep using it. If the tester does not respond, mark dropped after six weeks.

**Replacement.** Default to no. A replacement tester arrives without longitudinal trace, without baseline writing samples, without weeks of behavioral signal. Bringing them in late costs more than the seat they fill. The active cohort just shrinks.

**Implication for completion.** The Stage 1 completion criterion under "What completion looks like" is written against the active cohort and against an explicit floor — set as part of Q7 — below which the program cannot close because the surviving signal is too thin to ratify.

---

## What completion looks like

BTI does not "complete" the way SFDI completes. It's a running program. Completion is named in two stages:

**Stage 1 — Beta program close.** When the cohort retires the beta build and moves to production. Reaching this stage requires:

- Every active tester has run the app for a meaningful number of sermons.
- Both anchor dimensions (invasiveness and workflow-fit) trend positive across the active cohort, read through the weighting rules in "Reading feedback across the cohort."
- No unresolved red-flag findings on either anchor among active testers.
- The active cohort has held above its Q7 floor for at least four weeks.
- All BTI findings routed to the development backlog have been actioned, deferred-with-reason, or closed.
- The open questions in this charter are settled (or explicitly retired).

**Stage 2 — Production telemetry steady-state.** A scaled-back set of automated signals runs in production indefinitely, capturing the same patterns at lower fidelity. Reaching this stage requires: a ruling on which signals survive (Q8); a ruling on disclosure (what production users are told about telemetry at install time); the in-app feedback flag retiring or persisting in a leaner form.

Closing the program well — naming what was learned, naming what stays in production, naming what retires — is itself part of completion. The BTI document holds the close-out summary.

---

## Open questions

Decisions to work through together as the program scopes. Some genuinely gate Phase 1 build work; others are better settled by the work itself or by early cohort signal. The list is the agenda, not a checklist. The Phase 0 exit criterion under "How to start" names which subset gates Phase 1.

- **Q1 — In-app feedback UI surface.** Flag-button location and persistence: every AI surface, or one global affordance? Pop-out form trigger: footer menu item, keyboard shortcut, or both?
- **Q2 — Feedback transport.** Where does Tier 1 and Tier 2 feedback go when sent? Discord webhook, email, lightweight server endpoint, local-only-with-manual-export, or some mix?
- **Q3 — Telemetry event list.** Each candidate signal in the Layer 0 list (and any additions) needs an explicit ruling: keep, cut, or defer.
- **Q3b — Telemetry interpretation rulings.** For each signal that survives Q3, what pattern in that signal counts as evidence of which failure mode? "High unedited accept-rate is concerning" is an interpretive ruling smuggled into the event list — it could equally mean the AI got it right. Edit distance has the same problem; it assumes the saved field is the final form, which it isn't for delivery edits. Each retained signal needs its interpretation rule named separately, before the signal arrives. Q3b is paired with Q3 but settles independently.
- **Q4 — Telemetry transport.** Same channel as feedback, or separate? Realtime or batched? What happens if the tester is offline?
- **Q5 — Beta build channel.** Separate installer with its own auto-update channel, or feature-flagged variant of the main build? The auto-update behavior of `electron-updater` (see `docs/PROPOSALS/distribution.md`) is the constraint.
- **Q6 — Recruitment cadence.** All testers onboarded at once, or staggered? Staggered means cleaner first-run signal; all-at-once means a synchronized observation window.
- **Q7 — Cohort feasibility.** The replacement for a former review-cadence question, reframed because cadence is downstream of scale. What scale is sustainable alongside Mac distribution work and ongoing maintenance: smaller-and-deeper (10-15), larger-and-shallower (20-30), or hybrid (20-30 enrolled with rotating Tier 3 subset)? What review cadence and visible-loop digest cadence does the chosen scale support? What active-cohort floor does Stage 1 commit to (likely 8 of 10-15, or 15 of 20-30, but the actual number is part of the settlement)? These three settle together.
- **Q8 — Production telemetry scaledown.** Which signals survive? What's the disclosure model at install time?
- **Q9 — Privacy floor for the cohort.** Even high-trust testers deserve a written "what we capture and what we don't" doc. What's its location and what's in it?

---

## Dependencies on other in-flight work

- **AI Clarity & Constraint** — closed 2026-05-01 / 2026-05-02; archived at `docs/ARCHIVE/ai-clarity-and-constraint.md`. The behavior the cleanup produced now lives in `docs/SYSTEMS/ai-panel.md`, `docs/SYSTEMS/ai-model-migration.md`, and `docs/REFERENCE/ipc-channels.md`. BTI is the validation pass on that work — testing whether the proposal pattern feels like a proposal, whether differentiated error messages feel pastoral, whether the active-role label and "What I can see" panel actually land as reassurance, whether tab-side AI calls now centralized through `buildSystemPrompt` and `buildContext` produce a felt difference in invasiveness. ACC was the inside fix; BTI is the outside test.
- **SFDI** — closed 2026-05-05; the Study throughline is structural and Process Contract #6 is binding. BTI tests whether the throughline actually deepens the work for a pastor who didn't build it: do the four named outcomes feel earned, does each sub-phase boundary's handoff actually carry, does Field 3's unified canvas read as one canvas question rather than three stapled worksheets. SFDI's binding integrity is the contract; BTI's pastor cohort is the test of whether that integrity is felt.
- **SADI** — closed 2026-05-05; MPT/MPS plumbed as `SpotlightWorksheet` fields with the v19 `main_point_pair` envelope and a composite gate at the Step 2 → Step 3 boundary. BTI tests whether MPT and MPS feel earned by the Study throughline rather than reached-for at the top of the workspace, whether the gate's "satisfied another way" semantic on MPS Q2 reads as a real escape valve rather than a workaround, whether the strict-N/A path is ever used in practice.
- **SPRD** — closed; the 8+8+5+4 phase shape is locked. BTI's behavioral telemetry (Layer 0) tests whether testers actually move through the four phases or skip / abandon them; the friction dimension surfaces the felt experience of the phase walk.
- **Mac distribution** (in flight; pipeline scaffolded 2026-04-30, signing and notarization being shaken out across recent commits) — Q5 (beta build channel) is the live join point. Mac signoff is not yet end-to-end on CI; whatever auto-update story BTI uses for the cohort has to coexist with both the shipped Windows distribution story and the in-flight Mac one. Mac distribution's progress is therefore a real input to Q7 — Mac signoff competes with BTI build work for the developer's hours and may shape Phase 1 timing.
- **Theology corpus proposal** (`docs/PROPOSALS/theology-corpus.md`) — still queued; gates all retrieval upgrades. Voice-and-frame drift (Anchor 1, theological layer; dimension 9) is the first place a curated corpus would prove its worth or fail to. The theological frame check method above produces the data that would tell. If the cohort surfaces sustained frame drift, that finding is the strongest possible reason to advance the corpus from queued to active.

---

## How to start

The program runs in four phases.

**Phase 0 — Charter ratification and scoping conversations.** This document gets read, refined, and ratified. Open questions get worked through with the developer's working partner. **Phase 0 closes — and Phase 1 begins — when Q1, Q2, Q5, and Q9 are settled.** These four are the build-blockers: in-app UI surface (Q1), feedback transport (Q2), beta build channel (Q5), and the privacy doc that has to exist before Phase 2 onboarding (Q9). The other questions are explicitly deferred — Q3, Q3b, and Q4 settle inside Phase 1 implementation as the right shape surfaces; Q6, Q7, and Q8 settle inside Phase 2 onboarding or against early cohort signal. Phase 0 does not wait on them.

**Phase 1 — Beta build, tester-facing summary, theological-frame-check pre-samples.** The in-app feedback UI gets built. The telemetry event list gets implemented behind a build-flag (Q3 settles here as the implementation surfaces the right shape; Q3b is drafted alongside, signal by signal). The transport channel gets wired (Q4 settles here). A separate installer (or build-flagged variant) gets stood up. The privacy doc gets finalized. The tester-facing summary — with the inverted-job framing — gets drafted and finalized. The theological-frame-check pre-program prompt and text pool get prepared. The visible-loop digest template gets drafted. No testers yet.

**Phase 2 — Cohort onboarding.** Q6 (recruitment cadence) and Q7 (cohort feasibility, including active-cohort floor) settle here, before any tester gets the build. Pastors are invited, given the build, given the tester-facing summary and privacy doc, given a short orientation on the three feedback tiers and what's being captured. Opted-in testers complete their pre-program writing sample. Then they use the app.

**Phase 3 — Running program.** Feedback flows in through all three tiers and Layer 0. The visible loop runs to the cohort weekly or biweekly. Findings route into the four buckets per the feedback-to-action pathway: new development items, sharpening of in-flight work, BTI-only entries, or note-and-defer. Patterns get named in this living document. Mid-program writing samples land at the program midpoint; close samples land at program close. Tester attrition is handled per the section above. The program runs until Stage 1 close.

When ready to begin, name a starting point:

- "Settle BTI Q1" (or any other Q) — for ruling sessions.
- "Begin BTI Phase 1" — once Q1, Q2, Q5, Q9 are settled.
- "BTI cohort onboarding draft" — for the orientation doc and invite copy.

---

*End of BTI charter.*

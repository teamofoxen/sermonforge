# Beta Testing Initiative (BTI) — Charter

**Status:** Active. Phase 1 build infrastructure shipped. Cohort onboarding pending charter ratification post-ARI.
**Audience:** The lone developer of SermonForge, who is also a pastor and the pastor-user. Plain language, no engineering vocabulary required.
**Date drafted:** 2026-05-01.
**Last revision:** 2026-05-09 — full rewrite for the post-ARI product. AI was removed from SermonForge (see `docs/PROPOSALS/ai-removal-initiative.md`); the charter's anchor framing, telemetry signals, and feedback dimensions are recast for a system whose only authorship surface is the pastor's typing into structured questions and notebooks.

---

## Why this initiative exists

SermonForge is built around a stubborn conviction stated in `docs/CORE.md`: *the system does not do the clarity work for the user.* Structured questions force the pastor to articulate observation, interpretation, the redemptive thread, and implications in their own words. The throughline (Process Contract #6) carries those articulations forward sub-phase by sub-phase. There is no AI authorship. The pastor types every word that ends up in their sermon.

The conviction has two failure modes that kill the project, not just a feature:

1. **Structural overreach.** The system's structured questions feel coercive — putting words in the pastor's mouth, forcing rhetorical or theological moves they wouldn't have chosen, narrowing the shape of their thinking week over week. *Process #5 ("No AI substitution") removes the most acute version of this risk by removing AI entirely. But a forced flow can still shape voice. The pastor types every word — but did the system write the question that boxed them in?*
2. **Workflow misfit.** The tool doesn't feel right enough, or solid enough, to become their workflow. They drift away silently — not because the questions did anything wrong, but because the tool never earned a place in the week.

Both are project-killers. The first kills SermonForge by betraying its claim to deepen rather than displace pastoral authorship — even without AI, a too-rigid system can homogenize. The second kills it by never becoming habit. BTI weights both equally.

The product owner cannot test either failure mode alone. Self-testing is contaminated — the developer designed the question flow and built the throughline, so cannot feel what an unprimed pastor feels when the system asks them, in week three, to articulate the redemptive thread in one sentence and the only sentence that comes is the one the question's grammar implies. Both modes have to be tested by pastors who didn't build it.

---

## The anchoring concerns

Two concerns, weighted equally. Every other dimension reads against both.

### Anchor 1 — Structural overreach

The directional principle, stated plainly: **the pastor's voice and theological frame must remain the pastor's.** The system asks; the pastor answers. Anything that inverts that — the pastor finding themselves writing the answer the question's shape implied, rather than the answer their reading of the text demanded — is a thesis-betraying failure.

Structural overreach shows up in three layers, and BTI watches all three:

1. **Felt overreach** — the pastor names it. "The question put a word in my mouth." "I wrote what felt like the obvious answer to that prompt, not what I actually thought." "The flow nudged me toward an angle I wouldn't have chosen." These come through the feedback tiers below.
2. **Behavioral overreach** — the pastor doesn't name it but the behavior shows it. Very short time on a structured question before typing. Repetitive vocabulary across sub-phase synthesis answers. Notebook usage low while structured-field volume is high (the pastor writing only what the system asked, never what they thought beside). These come through the automated signals below.
3. **Theological overreach** — the structure's emphases are overriding the pastor's frame. Reformed/PD-aligned reflexes being slowly homogenized into whatever theological move the system's question grammar most readily admits. This is the hardest layer to surface, and depends on signals the pastor is least equipped to notice in their own work — by the time it's drift, it feels like their own thinking. The theological frame check method below is the concrete answer to this layer.

*The pre-ARI charter framed Anchor 1 as "AI invasiveness" — the AI drafting paragraphs, deciding the shape of the work, replacing the pastor's voice. That risk is now architecturally impossible: there is no AI surface for the system to overreach through. What remains is the gentler version: a designed question flow can still shape the pastor's thinking, even when every word of output is theirs. This anchor watches the gentler version.*

### Anchor 2 — Workflow-fit

Stated plainly: **the tool has to become the way the pastor preps sermons, not a thing they visit on top of how they prep sermons.** A tool that doesn't earn a place in the week dies of neglect, no matter how well-designed its questions are.

Workflow-fit shows up in three layers too:

1. **Felt fit** — the pastor names it. "This feels right." "I keep wanting to come back to it." Or the inverse: "It's clunky." "It's in my way." "I forget it exists." These come through the feedback tiers.
2. **Behavioral fit** — the pastor doesn't name it but the behavior shows it. Sustained week-over-week use. Sermons started *and finished* in the tool. The tool open during normal prep hours, not just during "I should test SermonForge" sessions. These come through the automated signals.
3. **Integration fit** — the tool meets the pastor's existing workflow rather than demanding a new one. Detailed workflow-integration options are a future discussion; BTI surfaces the *signal* that integration matters, the *what* gets designed downstream.

BTI's job is to make all six layers visible — three of structural overreach, three of workflow-fit — and to weight them as paired anchors when reading any single piece of feedback.

---

## The cohort

A cohort of pastor friends, all known personally to the product owner. Recruitment is invitation-only. The cohort's defining property is **high trust** — every tester knows the developer, knows the project, and is opting in to deep observation in exchange for shaping the tool. Final cohort size is gated on Q7 below.

### What high trust gives BTI

- **Permission to instrument.** Telemetry events that would be invasive at scale are acceptable here, because the testers know what's being captured and why, and the data flows to one person they trust. Production builds will scale this back; beta does not have to.
- **Permission to ask for depth.** Closed-beta testers will give thirty-minute interviews and write paragraph-length feedback in a way an open-beta cohort would not. BTI's deepest tier exists because the cohort is small enough to honor it.

### What high trust costs BTI

Friends are bad at being users in three predictable ways. Each one has to be designed against, not hoped against:

- **Pulled punches.** A friend will say "this is great, really cool" instead of "I tried it twice and went back to my old workflow." The hardest feedback — the kind that kills the project if missed — is exactly the kind a friend rounds off.
- **Loyalty over-engagement.** A friend will use the tool *more* than they would naturally, because they want it to succeed. This pollutes workflow-fit signal upward — the behavioral data shows them reaching for it, but only because they were testing it.
- **Soft-pedaled overreach.** A friend who feels the question flow shaped their thinking is more likely to say "the questions were fine, I just took my own line" than "I wrote what the question implied, not what I thought." The very dimension BTI is built to catch is the one most blunted by friendship.

These don't disqualify the cohort — they *are* the cohort, and the alternative (recruiting strangers for a closed beta of an unfinished tool) is worse on every other axis. They just have to be designed against. Two design responses, both expanded later in this document:

1. **The tester-facing summary inverts the tester's job.** It explicitly asks them to be the kind of friend who tells the developer the tool is in their way, not the kind who tells the developer the tool is promising.
2. **Tier 3 prompts lean behavioral, not impressionistic.** "Did you open the app this week without me asking?" beats "How did the app feel this week?" Behavior is harder to soft-pedal than feeling.

### Cohort scale and feasibility

Tier 3 is the heart of the longitudinal signal — each round is roughly a thirty-minute exchange per tester (written, voice, or async). At 20-30 testers per round that is **10-15 hours of Tier 3 alone per round**, before Tier 2 review, telemetry analysis, feedback-routing decisions into the development backlog, the visible-loop digest back to the cohort, theological frame-check cross-reading, and the actual build work. With ACC, SFDI, SADI, SPRD, Mac distribution, and ARI all closed, BTI does not compete with another major in-flight initiative for the developer's hours — but the theology corpus (now orphaned by ARI per `ai-removal-initiative.md` D5) and any post-ARI design work surfaced by cohort feedback still draw on the same time budget, and BTI is itself a multi-month commitment.

Three viable shapes:

- **Smaller and deeper (10-15 testers).** Tier 3 fits in 5-7.5 hours per round. Every tester gets every round. Per-voice signal is sharper. Attrition hurts more — losing one tester is 7-10% of the cohort.
- **Larger and shallower (20-30 testers).** Tier 3 cannot cover everyone every round at full participation. Either rounds happen less often, or Tier 3 covers a rotating subset each round. Broader signal volume; per-voice signal is thinner. More attrition resilience.
- **Hybrid: 20-30 enrolled, rotating Tier 3 subset.** Everyone gets Tier 1 (in-app flag) and Tier 2 (pop-out form) continuously. Tier 3 rotates through subsets — say 8-10 testers per round — so every tester gets Tier 3 every two or three rounds. Closes some of the throughput gap without losing breadth.

The right answer depends on what the developer can sustain alongside ongoing maintenance, what theological frame-check participation looks like (another tester-burden vector — see below), what the visible-loop cadence to the cohort needs to be, and what active-cohort floor the program commits to for Stage 1 completion. These resolve together as Q7.

---

## What BTI will produce

Four deliverables, walked roughly in parallel:

1. **The production app, with feedback UI baked in.** There is no separate beta installer and no feature-flagged variant. The in-app feedback surfaces and telemetry described below live in the production app for every user. The cohort runs the same build as anyone else who downloads SermonForge — what makes them the cohort is recruitment, the privacy disclosure they consent to at first-run, and the Tier 3 cadence on top, not a different build.
2. **A tester-facing summary document** ([`docs/PROPOSALS/bti-tester-summary.md`](bti-tester-summary.md), with installation walkthrough at [`docs/PROPOSALS/bti-setup-note.md`](bti-setup-note.md)). Short, plain-language, written for the pastor — what they're signing up for, what's being captured, how to give feedback, and what the program asks of them. **The summary explicitly inverts the tester's job: it asks them to tell the developer when the tool is in their way, when they didn't reach for it, when the questions felt like they were shaping the answer — not to tell the developer the tool is promising or that it's coming along.** This inversion is the primary mitigation for friend-cohort pulled punches.
3. **A feedback intake and review system.** A capture path for every feedback tier, a review cadence the developer can sustain alongside other work, a routing decision for every finding, and a path from feedback into the development backlog (new tickets, sharpening of in-flight work, or explicit ratification of recently-shipped work).
4. **A living BTI document.** This charter starts the document. As the program runs, the document accumulates the dimensions tested, the patterns observed, the routing decisions made, the rulings made, and the production-side outcomes — including which telemetry events survive into production and which retire when the cohort closes.

---

## Feedback capture model

Three tiers for tester voice, plus a layer of automated signals running underneath. Each tier is designed for a different cost-per-interaction.

### Tier 1 — In-app flag (thirty seconds)

A small, persistent flag affordance at every workspace tab where the pastor authors structured content — Study, Blueprint, and Manuscript. Clicking it captures the moment: which surface, which sermon, which step, plus an optional one-line note. The pastor can send blank.

This tier is the heart of the system. It captures the moment of friction *as it happens*, not after the pastor has rationalized it away. A flag without a note still tells the developer where to look.

*Pre-ARI, the flag also mounted at every AI surface (AI Panel, per-tab AI affordances, proposal cards) and could optionally include the most recent AI exchange. Both are gone. The flag now captures pastoral moments only — no AI exchange to attach.*

### Tier 2 — Pop-out feedback form (five minutes)

A larger feedback surface, accessed from a "Send feedback…" entry in the sidebar, that opens as a modal. Structured but not bureaucratic. The form has a single-dimension picker (see the dimensions section below) and a free-text field. The pastor fills it out and sends.

This tier is where felt-but-not-immediate observations land — "the question flow felt heavier this week," "I keep skipping straight to the notebook and not answering the structured questions," "I trusted the system less today than yesterday." Things that don't fit a flag.

### Tier 3 — Async interview (thirty minutes)

A scheduled written or voice exchange — could be a Loom recording, a Google Doc, a Discord voice room, or a phone call. Periodic, not continuous. The developer writes a short prompt and the pastor responds in their own time and shape.

**Tier 3 prompts lean behavioral, not impressionistic.** "Did you open the app this week without me asking?" "When you didn't open it, what were you doing instead?" "Walk me through the last sermon prep session that didn't use the tool, and tell me why." "Read back through your last sub-phase synthesis answer — is that the sentence you would have written if I'd asked you the same question on a blank page, or is it the sentence the question's shape pulled out of you?" Concrete questions about what happened beat questions about how things felt — partly because behavior is harder for a friend to soft-pedal than feeling, partly because the answers tie directly to the behavioral signal layer of both anchors.

This tier is also where the *workflow-integration* dimension surfaces — the only tier slow enough for a pastor to articulate the shape of their existing prep workflow against the tool they're testing.

### Layer 0 — Automated signals (continuous)

Running underneath all three tiers. The cohort is high-trust, so beta telemetry can be fairly rich. Signals captured (full list disclosed in [`docs/REFERENCE/privacy.md`](../REFERENCE/privacy.md)):

- **`app-open`** — when the app launches.
- **`panel-time`** / **`field-time`** — how long a panel or field has focus, recorded in summary form (no keystrokes).
- **`sermon-create`** / **`sermon-finish`** — sermon-level lifecycle markers, with sermon ID.
- **`crash`** — when the app errors.

> Amended 2026-06-10: the `tour-step` event was removed from this list. The
> tour engine (and with it the `TOUR_STEP` emitter) was deleted in the
> 2026-05-17 tour cleanup; no source emits the event, so the charter no
> longer commits to tracking it.

Two separate decisions sit on top of this list: which signals to capture (Q3) and how to interpret each one once captured (Q3b). Q3b is not optional and not downstream of Q3 — short time-on-field could equally mean "the question landed and the pastor knew the answer immediately" or "the pastor wrote the obvious answer and moved on." Each retained signal needs both rulings, separately, before it tells the developer anything about a failure mode.

*Pre-ARI, this layer included `ai-press`, `ai-proposal`, AI accept-rate, time-on-field-before-AI-press, AI panel time vs. study work time, edit distance between AI proposal and saved field, AI calls per sermon, and context tier composition. All of those are gone — there is no AI to press. The `ai-press` and `ai-proposal` event constants are still defined in `electron/telemetry/events.js` but nothing emits them; cleanup of the event registry is a small follow-up item.*

Production builds will scale this back to a smaller set; the production scaledown is named at the end of this document.

### New post-ARI signal candidates

Two telemetry signals would directly serve the post-ARI Anchor 1 (structural overreach) but are not currently captured. Both are Phase 1.5 / Phase 2 candidates for Q3:

- **`structured-field-write`** vs. **`notebook-write`** balance — does the pastor only fill the structured fields the system asks for, or do they also write beside, in their own words, in the notebook? A tester whose notebook stays empty across weeks is producing only the answers the questions imply. Behavioral signal for theological-overreach risk that the writing-sample method below is the deeper test of.
- **`step-progression`** — entry into each sub-phase / step. Combined with `field-time`, surfaces whether testers walk the throughline as designed or skip and abandon. SPRD's 8+8+5+4 phase shape is structurally locked, but behavioral abandonment is still a workflow-fit failure mode worth seeing.

Neither signal exists today. Add them via Q3 if early Tier 1/Tier 2 feedback suggests they'd be load-bearing.

---

## Theological frame check method

Theological overreach is the layer of Anchor 1 the charter takes most seriously and the layer the rest of the feedback model is least equipped to catch. By the time frame drift is happening, it feels like the pastor's own thinking, not like external influence. The pastor cannot self-report it reliably. The other tiers lean on the pastor noticing — which is exactly what they're least able to do.

A concrete method, designed to surface drift even when the pastor cannot:

**Pre-program writing sample.** Before installing the beta build, the opted-in tester drafts a short exegetical pass on a specified text — fifteen to thirty minutes, no tools, just the pastor and the text. The developer keeps this as a baseline.

**Mid-program writing sample.** At a defined midpoint of the program, the same exercise on a different text of comparable shape. The pastor does this without consulting their first sample. Same time budget, no tools.

**Close-of-program writing sample.** A third sample at program close, again on a fresh text of comparable shape.

**Cross-reading by the developer.** The three samples are read together, not against each other on content but on *shape*: vocabulary range, theological moves the pastor makes by reflex, the structural arc of an exegetical paragraph, the points at which a tester who used to bring up X now brings up Y. The signal is shift, not quality. Three samples with the same fingerprint say the system did not displace the pastor's voice. Three samples with a fading fingerprint — vocabulary narrowing, structural moves homogenizing, theological emphases drifting toward whatever frame the question grammar most readily admits — say something is being displaced.

**Hypothesis shift, post-ARI.** Pre-ARI, this method was hunting for AI-driven voice drift. With AI removed, the method now hunts for *question-driven* voice drift: whether the prewritten question sequences in Study (SPRD's 8+8+5+4) and SADI's MPT/MPS flow shape the pastor's reflexes over weeks of use, even though every word of output is theirs. Same instrument, different hypothesis. The instrument is *more* important post-ARI, not less, because if drift exists it has to come from the only remaining authorship structure: the question flow.

**Opt-in.** This is a real burden. Three writing exercises on top of the rest of the program is a meaningful ask. Make it opt-in, surfaced explicitly in the tester-facing summary, with the cohort told that opting in is the deepest help they can give but that not opting in does not mean a lesser tester. Expect roughly a third to half of the cohort to participate; that's enough sample for the cross-reading to do useful work.

**Note on text choice.** Texts of comparable shape, not the same text, so the pastor isn't recalling their first pass. A short pre-program brief picks three texts of similar exegetical complexity from a pool, randomly assigned across the cohort.

---

## Feedback dimensions

The pop-out form (Tier 2) and the async interview (Tier 3) both work against a common set of dimensions. Testers don't have to cover all of them — they fill what's loaded for them — but the dimensions exist so the developer can read patterns across the cohort.

1. **Structural overreach** — Anchor 1. Did the question flow ever feel like it was putting a word in your mouth? Did you ever write what felt like the obvious answer to the prompt, rather than what you actually thought? Did the throughline ever push you toward a move you wouldn't have chosen?
2. **Workflow-fit** — Anchor 2. Did the tool fit into your week, or work against it? Are you reaching for it, or having to remind yourself to use it? What in your existing prep workflow does it not yet meet?
3. **Question quality** — relevance to the passage, depth, tone, theological soundness, whether each question forces real thinking or just collects an answer.
4. **Trust** — would you put a real upcoming sermon in this, or only a throwaway? Did anything happen this week that changed your trust level?
5. **Friction and surprise** — what slowed you down? What got in the way? What did you expect to be there and wasn't?
6. **Onboarding and first-run** — the tour, the setup screen, the first sermon. (This dimension fades after the tester's first few sessions.)
7. **Reliability and weirdness** — crashes, save concerns, anything that made you nervous about your data.
8. **Performance and feel** — did the app feel responsive? Did the question flow feel paced right — fast enough to be fluid, slow enough to be considered?
9. **Voice and frame** — does the system's structure feel aligned with your theological frame? Has your own voice in your sermons drifted over the weeks of use? (This is the felt-layer question; the writing-sample method is the deeper test.)
10. **What surprised you** — open dimension. Anything that didn't fit the others.

Dimensions 1 and 2 co-lead. Every other dimension is read against both — a question-quality complaint that's also a structural-overreach complaint reads differently than a pure quality complaint, and a friction complaint that's also a workflow-fit complaint reads differently than a one-off frustration.

*Pre-ARI dimension #3 was "AI response quality" and #9 was "Voice and frame" specifically about AI's theological frame. Both have been recast. The `FeedbackForm.jsx` dimensions list still uses the pre-ARI labels; updating it to match this section is a small follow-up code item.*

---

## Reading feedback across the cohort

Twenty to thirty pastors will not produce a chorus. Two pastors will say opposite things about the same surface — one will love the explicit sub-phase boundaries and another will find them rigid. The charter has to commit to a weighting heuristic in advance, or the loudest tester wins by default and the friend-cohort soft-pedaling problem compounds.

Four rules, applied in this order:

1. **Behavior beats stated when they conflict.** A tester who says they love the tool but opens it once a week is reporting workflow misfit, regardless of what they wrote in the form. A tester who says the question flow felt overreaching but their notebook is empty across weeks (i.e., they wrote only what the system asked) is reporting something more complicated than overreach. When stated and behavioral signals diverge, the behavioral signal carries more weight; the stated signal becomes a question to ask in the next Tier 3.
2. **Longitudinal trend beats single-session reaction.** Week one frustration is normal — every new tool is clunky for a week. Week four frustration is signal. Conversely, week one delight is normal — every new tool is exciting for a week. Week four sustained reach-for-it is signal. Single sessions get filed; trends get acted on.
3. **Anchor failures elevate at small N.** A single credible report of structural overreach or sustained workflow misfit is *not* outvoted by a chorus of "fine." The friend-cohort downside means anchor failures are systematically underreported; one credible report likely represents three the developer didn't hear. Anchor-positive surfaces still need a chorus to count as positive; anchor-failures don't need one to count as failures.
4. **Concrete specificity beats impressionistic adjectives.** "On Tuesday I wrote the Christ-Connection synthesis answer in fifteen seconds and when I read it back I'm not sure that's what I actually think — it's just the sentence the question's shape pulled out of me" beats "the questions feel a bit pushy." Both go in the file; only the first is actionable. Tier 3 prompts (behavioral lean) are designed to produce more of the first kind.

These rules are committed in the charter so the developer applies them before the data arrives, not after — a heuristic chosen post-hoc against feedback already read is just rationalization.

---

## Feedback-to-action pathway

The single fastest way to lose a high-trust tester is to make their feedback feel like it disappeared. This is a worse failure for BTI than losing a low-trust tester would be, because the high-trust testers are the ones most likely to stay long enough to surface the slow signals — workflow drift, theological drift, sustained workflow-fit — that the program needs most. The pathway from tester voice to product action is therefore load-bearing.

Two requirements, both committed from Phase 1:

**Every BTI finding gets a routing decision, on the record.** Each Tier 1 flag, Tier 2 form, and Tier 3 exchange is reviewed and routed into one of four buckets:

- *New development item.* Goes to the development backlog as a new ticket — a UI fix, a question-flow revision, a content correction, a copy revision, whatever the finding calls for.
- *Sharpens or unblocks something already in motion.* The finding settles a question on a deferred ARI design item (Phase 5 synthesis-question wording, Phase 6 outline-question sequence, theology corpus D5), or any other queued or in-flight work whose shape it helps clarify. This bucket also picks up findings that *ratify or challenge* recently-shipped work — feedback that doesn't generate new work but tells the developer whether ACC, SFDI, SADI, SPRD, or ARI itself landed as felt improvements.
- *BTI-only entry.* A pattern visible in the cohort but not yet sharp enough to ticket — kept in the living BTI document until it sharpens.
- *Note-and-defer.* Acknowledged, no action, with a stated reason. (Not a wastebasket — every note-and-defer reads like a real ruling, because the tester will see it routed there in the digest below.)

The routing decision is logged in the living BTI document. Nothing falls through.

**A visible loop runs back to the cohort.** Weekly or biweekly — cadence settles in Phase 0 alongside cohort scale — the cohort gets a short digest: here's what testers flagged, here's what landed in the build because of it, here's what's in the queue, here's what we decided not to do and why. The digest is the antidote to "did anyone read my flag?" It also doubles as a re-engagement nudge — testers who see their feedback shipping use the tool more.

The visible loop is built into the program from Phase 1, not added later if engagement flags. Adding it after engagement flags is too late.

---

## Tester attrition

A cohort of pastor-friends will not stay at full size. Some will drop off after week two. Others will go nominally-enrolled-but-silent — installed the build, never opened it, polite when asked. The completion criterion has to be defined against an *active* cohort, not the enrolled cohort.

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

**Stage 1 — Structured cohort program close.** When the cohort retires from the structured Tier 3 program. Production = beta means there is no build-to-build handoff; the cohort and the broader user base are running the same SermonForge throughout. Stage 1 close is therefore the end of the *structured observation*, not a build migration. Reaching this stage requires:

- Every active tester has run the app for a meaningful number of sermons.
- Both anchor dimensions (structural overreach and workflow-fit) trend positive across the active cohort, read through the weighting rules above.
- No unresolved red-flag findings on either anchor among active testers.
- The active cohort has held above its Q7 floor for at least four weeks.
- All BTI findings routed to the development backlog have been actioned, deferred-with-reason, or closed.
- The open questions in this charter are settled (or explicitly retired).

**Stage 2 — Steady-state in-app surfaces.** After Stage 1 close, the in-app feedback surfaces continue as production features — the cohort's voluntary departure does not retire the flag button or the pop-out form. What changes is the structured Tier 3 cadence (ends), the cohort-specific privacy framing (replaced by the production privacy disclosure already shipped at first-run from Phase 1), and the telemetry event set (possibly trimmed per Q8). Reaching this stage requires: a ruling on which signals survive (Q8); a ruling on whether any in-app feedback surface should retire or persist in a leaner form post-cohort.

Closing the program well — naming what was learned, naming what stays in production, naming what retires — is itself part of completion. The BTI document holds the close-out summary.

---

## Open questions

Decisions to work through together as the program scopes. Some genuinely gate Phase 2; others are better settled by the work itself or by early cohort signal. The list is the agenda, not a checklist.

- **Q1 — In-app feedback UI surface.** *Settled (post-ARI):* Flag button mounts at all three workspace authorship tabs — Study, Blueprint, and Manuscript. Pop-out form trigger: sidebar "Send feedback…" entry, modal in-process.
- **Q2 — Feedback transport.** *Settled:* Cloudflare Worker + D1 endpoint. Live.
- **Q3 — Telemetry event list.** *Mostly settled:* the seven events under Layer 0 above are captured. `ai-press` and `ai-proposal` are defined but unused — cleanup pending. Two new candidate signals (`structured-field-write` / `notebook-write` balance and `step-progression`) deferred to Phase 1.5 if early signal demands them.
- **Q3b — Telemetry interpretation rulings.** Each retained signal needs an interpretation rule named separately, before the signal arrives. Open per signal.
- **Q4 — Telemetry transport.** *Settled:* same Cloudflare Worker endpoint, batched, retries on offline.
- **Q5 — Beta build channel.** *Retired 2026-05-07.* Production IS the beta.
- **Q6 — Recruitment cadence.** All testers onboarded at once, or staggered? Staggered means cleaner first-run signal; all-at-once means a synchronized observation window. Settles in Phase 2.
- **Q7 — Cohort feasibility.** Smaller-and-deeper (10-15), larger-and-shallower (20-30), or hybrid (20-30 enrolled with rotating Tier 3 subset)? What review cadence and visible-loop digest cadence does the chosen scale support? What active-cohort floor does Stage 1 commit to? Settles in Phase 2.
- **Q8 — Production telemetry scaledown.** Which signals survive into production after Stage 1 close? What's the disclosure model at install time?
- **Q9 — First-run privacy disclosure.** *Settled:* extended `SetupScreen` with a Telemetry and Feedback section + opt-out toggle (default-on); long-form reference at `docs/REFERENCE/privacy.md`.

---

## Dependencies on other in-flight work

- **AI Clarity & Constraint** — closed 2026-05-01 / 2026-05-02; archived at `docs/ARCHIVE/ai-clarity-and-constraint.md`. Superseded by ARI: ACC's proposal pattern, differentiated error messages, "What I can see" panel, and centralized AI calls were the *constrain AI* path. ARI took the *remove AI* path. ACC's residue worth testing in BTI is what it normalized about the rest of the system — the audit log, the keystore, the structured save flow.
- **SFDI** — closed 2026-05-05; the Study throughline is structural and Process Contract #6 is binding. BTI tests whether the throughline actually deepens the work for a pastor who didn't build it: do the four named outcomes feel earned, does each sub-phase boundary's handoff actually carry, does Field 3's unified canvas read as one canvas question rather than three stapled worksheets.
- **SADI** — closed 2026-05-05; MPT/MPS plumbed as `SpotlightWorksheet` fields with the v19 `main_point_pair` envelope and a composite gate at the Step 2 → Step 3 boundary. BTI tests whether MPT and MPS feel earned by the Study throughline rather than reached-for at the top of the workspace, whether the gate's "satisfied another way" semantic on MPS Q2 reads as a real escape valve rather than a workaround.
- **SPRD** — closed; the 8+8+5+4 phase shape is locked. BTI's behavioral telemetry (Layer 0) tests whether testers actually move through the four phases or skip / abandon them; the friction dimension surfaces the felt experience of the phase walk.
- **Mac distribution** — closed 2026-05-07; v1.0.0 signed + notarized macOS DMG + signed Windows NSIS shipped. BTI inherits both signed installers as the production build.
- **ARI** — closed 2026-05-09 (charter at `docs/PROPOSALS/ai-removal-initiative.md`). BTI is the validation pass on the ARI-shaped product. Open ARI design questions (D1 outline-question sequence, D2 synthesis-question wording, D5 theology corpus) may sharpen against early cohort feedback — BTI's "Sharpens or unblocks something already in motion" routing bucket picks them up.

---

## How to start

The program runs in four phases.

**Phase 0 — Charter ratification and scoping.** *Closed.* Q1, Q2, Q5, Q9 settled. Charter rewritten 2026-05-09 for post-ARI product.

**Phase 1 — Production-app feedback surfaces, tester-facing summary.** *Built infrastructure shipped 2026-05-08; ARI-driven rewrite of tester-facing docs in progress 2026-05-09. Historical record of what shipped at [`docs/PROPOSALS/bti-build-mvp.md`](bti-build-mvp.md).* Flag button at workspace authorship surfaces (Study, Blueprint), pop-out form on sidebar, telemetry event capture, transport endpoint, token-gated inbox, first-run privacy disclosure all live. The [tester-facing summary](bti-tester-summary.md), [setup note](bti-setup-note.md), and [privacy doc](../REFERENCE/privacy.md) are being rewritten for the post-ARI shape (this charter's revision is part of that pass).

**Phase 1.5 — Pre-onboarding cleanup.** *Closed 2026-05-09.* `ai-press` / `ai-proposal` event constants removed from `electron/telemetry/events.js`; `FeedbackForm.jsx` dimensions updated to match the post-ARI section above; `FeedbackFlag` added to the Manuscript tab (three mounts settled). Optional Q3 telemetry additions (`structured-field-write` / `notebook-write` / `step-progression`) deferred to Phase 2 if early cohort signal demands them.

**Phase 2 — Cohort onboarding.** Q6 (recruitment cadence) and Q7 (cohort feasibility, including active-cohort floor) settle here, before any tester gets the build. Pastors are invited, given the build, given the tester-facing summary and privacy doc, given a short orientation on the three feedback tiers and what's being captured. Opted-in testers complete their pre-program writing sample. Then they use the app.

**Phase 3 — Running program.** Feedback flows in through all three tiers and Layer 0. The visible loop runs to the cohort weekly or biweekly. Findings route into the four buckets per the feedback-to-action pathway. Patterns get named in this living document. Mid-program writing samples land at the program midpoint; close samples land at program close. Tester attrition is handled per the section above. The program runs until Stage 1 close.

When ready to begin, name a starting point:

- "Settle BTI Q3" (or any other Q) — for ruling sessions.
- "Begin BTI Phase 1.5" — for the pre-onboarding cleanup.
- "Begin BTI Phase 2" — for cohort onboarding.

---

*End of BTI charter.*

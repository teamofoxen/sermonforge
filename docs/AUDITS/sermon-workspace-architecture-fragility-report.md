# SermonForge Sermon Workspace Architecture Fragility Report

## Purpose

This report states the architecture hypothesis to be tested by a follow-up audit.

The claim is not that SermonForge’s sermon workspace has a weak product philosophy. The product philosophy is coherent and disciplined: one pastor, one sermon, local-first, no AI authorship, no blocking gates, passage-first, and completion that informs without refusing movement.

The concern is that the current workspace architecture may be fragile at the seams where product law, documentation, persistence, field content, navigation, completion, and rendering meet.

The practical risk is drift. A small change could make the pastor see the wrong vocabulary, land in the wrong place, receive a false completion signal, lose confidence that work is safe, or face a prompt whose behavior no longer matches its words.

## Executive Diagnosis

Yes: the Workspace appears to have fragile architecture.

Not because the experience is conceptually weak. The concept is disciplined.

It is fragile because the implementation appears to rely on too many synchronized agreements:

- CORE vs Canon vs schema vs source comments
- field-level walk vs question-level contract
- multiple position columns plus `last_touched_position`
- multiple storage shapes under one writing surface
- completion rules split across composites, lenient checks, map state, handoff state, and Finish
- one large component coordinating load, save, navigation, thresholds, writing, export, and deletion
- content definitions that also carry behavioral rules

The architecture is not beyond repair, but it needs consolidation around true single sources of authority before more sermon-walk refinements are layered on top.

## 1. Authority Model Fragility

The workspace appears to have competing authority signals.

The desired hierarchy is simple:

```txt
CORE
  ↓
implementation contract
  ↓
docs and code that explain or consume the contract
```

But the current workspace may allow several rival authorities to influence implementation decisions:

- `docs/CORE.md`
- workspace canon documents
- system documents
- schema/reference documents
- source comments
- current runtime code

This becomes fragile when code comments or secondary docs imply that code overrides CORE, or that a CORE clause is stale. That creates a dangerous development pattern:

```txt
CORE says this.
Canon says code wins.
Schema still says the old thing.
Source comments say CORE is stale.
Runtime behavior does something else.
```

A future developer can then justify incompatible changes from different sources.

### Pastor-facing consequence

The pastor may see inconsistent names, completion states, or workflow behavior because the system no longer has one enforceable product law.

## 2. Completion Architecture Fragility

Completion is one of the highest-risk seams.

The workspace should have one completion truth consumed by:

- map
- Study → Anchor handoff
- Finish screen
- export status, if needed
- named outcome review
- any missing-work affordances

The fragile version is:

```txt
composite checks
+ lenient checks
+ local map logic
+ handoff-specific logic
+ Finish-specific logic
+ field-level answer heuristics
```

That means “complete” can become surface-dependent.

The clearest suspected fracture is Observation Set completeness. If CORE requires a Divisions / Thought Units composite but the implementation treats Obvious Point as sufficient, the pastor can receive a false completion signal.

### Pastor-facing consequence

The pastor may be told that a load-bearing artifact is complete when the canonical artifact is missing. That damages trust at exactly the moment he is asking, “Is this sermon ready?”

## 3. Navigation and Position Fragility

The workspace appears to carry several overlapping position concepts:

- current stage
- current sub-phase
- last study sub-phase
- last assembly sub-phase
- last manuscript sub-phase
- last touched position
- threshold seen flags

Some of these may be legitimate resume helpers, but only one thing should decide where the pastor is right now.

The safer model is:

```txt
one canonical WorkspacePosition
+ derived resume helpers
+ one navigation reducer/service
```

The fragile model is when UI code, persistence code, spine code, and threshold code can all write or infer position in different ways.

### Pastor-facing consequence

The pastor could reopen in the wrong place, see the map and writing surface disagree, or lose confidence that the workspace knows where he is.

## 4. Persistence and Local-First Safety Fragility

The pastor must always be able to answer: “Is my work safe?”

That requires clear separation among:

- saving
- saved
- save failed
- retry
- load failed
- sermon not found
- corrupt local state
- destructive action
- undo, if supported

A fragile architecture collapses different failure states into one visible message. For example, a load failure that appears as “Sermon not found” tells the pastor his work may be gone, even if the real issue is a recoverable loading error.

### Pastor-facing consequence

A local-first app loses its strongest promise if the pastor cannot tell whether his work is safe.

## 5. Field and Question Model Fragility

CORE’s conceptual model is:

```txt
Field
  contains ordered Questions
Question
  receives an Answer
Answer
  may be blank, answered, or not applicable where allowed
```

The fragile implementation pattern is:

```txt
chevrons advance by field
some fields contain several prompts
legacy hints are normalized into fake primary questions
some regions store answers differently from others
```

This creates a mismatch between the promise of “one question at a time” and the actual rendered experience of stacked multi-question fields.

### Pastor-facing consequence

The pastor is promised guided movement but may experience a worksheet. He has to decide what is current instead of being led through the next question.

## 6. Data Shape Fragility

The workspace appears to use several answer/storage patterns:

- Study answer envelopes
- cumulative synthesis table rows
- `main_point_pair`
- possible mirrored `mpt` / `mps` export fields
- outline shape
- body / functional element shape
- manuscript door shape
- notebook shape

Different shapes are not automatically bad, but they become fragile when one writing surface has to understand them all directly.

The safer model is:

```txt
one canonical answer store
+ typed structured answer values
+ serialization/export adapters at the boundary
```

The fragile model is when each region has its own persistence world and the main workspace component manually coordinates them.

### Pastor-facing consequence

Different parts of the sermon may behave differently: saving, N/A, completion, export, or review may not feel like one coherent workspace.

## 7. Component Boundary Fragility

The main workspace shell appears to coordinate too many responsibilities:

- loading
- series context
- save state
- debounced persistence
- close flushing
- navigation
- thresholds
- field teaching state
- answer writes
- canvas writes
- outline writes
- manuscript writes
- export
- mark-as-preached
- delete
- map jumps
- finish jumps
- handoff jumps

This creates a “god component” risk. The component becomes the place where unrelated responsibilities meet, so a change in one area can affect another.

The safer model is:

```txt
SermonWorkspaceShell
  useWorkspaceLoad
  useWorkspaceSave
  useWorkspaceNavigation
  useWorkspaceCompletion
  useWorkspaceThresholds
  useWorkspaceMutations
```

Then rendering components consume selectors and dispatch named actions rather than making domain decisions.

### Pastor-facing consequence

A change to navigation should not accidentally affect save behavior, threshold behavior, or completion reporting. The current concentration makes those accidental couplings more likely.

## 8. Content Definitions Carrying Behavioral Rules

Prompt files appear to contain not only pastor-facing text, but also behavioral configuration:

- N/A allowance
- N/A label
- completion behavior
- map behavior
- gating behavior
- special renderer behavior

This makes copy editing risky. A theological wording improvement can accidentally alter completion, N/A semantics, or map state.

The safer model separates:

```txt
prompt content
behavior configuration
completion rules
rendering rules
persistence rules
```

### Pastor-facing consequence

The pastor may see wording whose behavior no longer matches the underlying rule, or a behavior whose label no longer explains it plainly.

## 9. What the New Shape Should Look Like

The target architecture should look like this:

```txt
docs/CORE.md
    ↓
domain/workspaceContract.ts
    - canonical names
    - stages / phases / fields / questions
    - named outcomes
    - threshold definitions
    - answer types
    - N/A semantics

domain/workspaceWalk.ts
    - ordered question nodes
    - Back / Next sequence
    - threshold placement

domain/completionRules.ts
    - question completion
    - field completion
    - named outcome completion
    - sermon completion

domain/navigationReducer.ts
    - current position
    - resume behavior
    - map jumps
    - handoff / finish transitions

domain/answerStore.ts
    - one answer envelope
    - typed structured values
    - N/A preservation

domain/serialization.ts
    - persistence mapping
    - export derivations
    - legacy schema adapters

hooks/
    - load
    - save
    - navigation
    - completion
    - mutations

components/
    - render only
    - consume selectors
    - dispatch named actions
```

The pastor should experience this as:

```txt
One vocabulary.
One walk.
One save story.
One completion truth.
One position.
One kind of field/question/answer.
```

## 10. What Should Feel Different in Development

Developing the workspace should feel less like touching a live wire and more like working inside a stable grammar.

Today, a developer may need to ask:

```txt
If I change this prompt, does it affect completion?
Does Finish still agree?
Does the map still agree?
Does export still work?
Is this old vocabulary allowed?
Is the schema stale?
Is this CORE or just code history?
```

In the healthier shape, the questions become narrower:

```txt
Am I changing product law, content, behavior, rendering, persistence, or a derived view?
```

The new shape should make small changes safer, debugging clearer, tests easier, refactors more incremental, and pastor-facing contradictions harder to introduce.

## 11. Clean Replacements for the Fragile Seams

Instead of:

```txt
CORE vs Canon vs schema vs source comments
```

Use:

```txt
CORE → typed workspace contract → docs and code checked against contract
```

Instead of:

```txt
field-level walk vs question-level contract
```

Use:

```txt
question-level walk, with fields as visual/grouping containers
```

Instead of:

```txt
multiple position columns plus last_touched_position
```

Use:

```txt
one canonical WorkspacePosition, with derived resume helpers
```

Instead of:

```txt
multiple storage shapes under one writing surface
```

Use:

```txt
one answer store with typed structured answer values
```

Instead of:

```txt
completion rules split across composites, lenient checks, map state, handoff state, and Finish
```

Use:

```txt
one completion engine consumed by map, handoff, Finish, and export
```

Instead of:

```txt
one large component coordinating load, save, navigation, thresholds, writing, export, and deletion
```

Use:

```txt
thin workspace shell plus hooks/reducers/selectors/services
```

Instead of:

```txt
content definitions that also carry behavioral rules
```

Use:

```txt
prompt content separate from behavior, completion, rendering, and persistence rules
```

## 12. Key Principle

The new shape should make it hard for future work to create a pastor-facing contradiction.

A developer should not be able to accidentally make:

```txt
CORE say one thing,
the map say another,
Finish say another,
the field prompt imply another,
and persistence save yet another.
```

The ideal architecture forces each layer to answer to the same domain model.

That is the main remediation target.

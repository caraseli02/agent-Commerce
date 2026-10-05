---
name: grilling
description: Grill the user relentlessly about a plan or design. Use when the user wants to stress-test a plan before building, or uses any 'grill' trigger phrases (e.g. "grill me", "grill with docs"). In a codebase it also records terms and decisions via /domain-modeling.
---

Interview me relentlessly about every aspect of this plan until we reach a shared understanding. Walk down each branch of the design tree, resolving dependencies between decisions one-by-one. For each question, provide your recommended answer.

Ask the questions one at a time, waiting for feedback on each question before continuing. Asking multiple questions at once is bewildering.

If a *fact* can be found by exploring the codebase, look it up rather than asking me. The *decisions*, though, are mine — put each one to me and wait for my answer.

When the plan lives in a codebase, leave a paper trail: run this session together with the `/domain-modeling` skill — sharpen terms as they come up and record them in `CONTEXT.md`, and capture hard-to-reverse decisions as ADRs as they land. With no codebase, stay stateless — save nothing locally and build no `CONTEXT.md`.

Do not enact the plan until I confirm we have reached a shared understanding.

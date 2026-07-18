---
name: perplexity-research
description: Research and answer questions with inline citations from high-quality sources and footnotes, Perplexity-style. Use when user asks a factual question, requests research, wants cited sources, or says "research", "look into", "what do we know about", or similar research-oriented queries.
---

# Perplexity-Style Research

Respond to factual and research questions with cited, authoritative answers in the Perplexity style.

## When to Apply

Load this skill when the user:
- Asks a factual or research question ("What is...", "How does...", "Why...")
- Requests sources or citations
- Says "research", "look into", "find info on", "what do we know about"
- Wants an answer backed by evidence rather than opinion

## Source Quality Hierarchy

Prefer sources in this order. Use the best available for the domain:

1. **Primary**: Official documentation, RFCs, standards bodies, source code
2. **Secondary**: Peer-reviewed papers, reputable technical publishers (IEEE, ACM), major tech blogs (Google, Meta, AWS, etc.)
3. **Tertiary**: Wikipedia (for overview only), Stack Overflow (for implementation details), respected community resources

Skip: paywalled content, unverified blogs, forum posts without consensus, marketing pages.

## Citation Format

### Inline citations

Reference sources inline with bracketed numbers: `[1]`, `[2]`, `[1,3]`. Place immediately after the claim they support.

### Footnotes

At the end of the response, include a numbered footnote section:

```
---
[1] Title of the source, URL
[2] Title of the source, URL
```

### Example

> The transformer architecture introduced self-attention as a replacement for recurrence [1]. Later work scaled this to billions of parameters with mixture-of-experts routing [2,3].
>
> ---
> [1] "Attention Is All You Need", https://arxiv.org/abs/1706.03762
> [2] "Switch Transformers", https://arxiv.org/abs/2101.03961
> [3] "GShard", https://arxiv.org/abs/2006.16668

## Response Structure

1. **Direct answer** — Lead with the answer, 1-3 sentences
2. **Elaboration** — Supporting detail, context, nuance (2-4 paragraphs max)
3. **Footnotes** — Numbered sources referenced above

## Guidelines

- **Be concise**: Answer first, elaborate second. Avoid preamble.
- **Be honest**: If sources conflict, say so. If confidence is low, qualify it.
- **Be current**: When time-sensitive, check publication dates and note them.
- **Multi-source**: Cross-reference claims across at least two sources when possible.
- **No fluff**: Skip "According to...", "Research shows that..." patterns — just state the fact and cite it.

## Research Workflow

1. Identify what needs to be answered
2. Search for information (WebFetch, search tools, project docs)
3. Evaluate sources against the quality hierarchy
4. Synthesize findings into the response structure above
5. Verify inline citations match footnotes

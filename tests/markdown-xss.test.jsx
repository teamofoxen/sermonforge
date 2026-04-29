// M-P7 M7 — verifies ReactMarkdown does not interpret raw HTML in AI output.
//
// AIPanel/InlineAIResponse render assistant messages via:
//   <ReactMarkdown>{msg.content}</ReactMarkdown>
//
// react-markdown escapes raw HTML by default (no rehype-raw plugin). This test
// is a regression guard — if anyone ever wires rehype-raw or
// dangerouslySetInnerHTML into that path, this test fails before user data
// can be used as a script-injection vector.
//
// Uses ReactDOMServer.renderToString rather than jsdom so the test runs in
// Vitest's default node environment with no extra deps.

import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import ReactMarkdown from "react-markdown";

describe("ReactMarkdown — assistant message rendering", () => {
  it("escapes raw <script> tags rather than executing them", () => {
    const malicious = "Hello <script>window.__pwned = true;</script> world";
    const html = renderToString(<ReactMarkdown>{malicious}</ReactMarkdown>);
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("escapes <img onerror> attributes", () => {
    const malicious = "Look: <img src=x onerror=\"alert(1)\">";
    const html = renderToString(<ReactMarkdown>{malicious}</ReactMarkdown>);
    expect(html).not.toMatch(/<img[^>]*onerror/i);
    expect(html).toContain("&lt;img");
  });

  it("still renders normal markdown formatting", () => {
    const safe = "**bold** and *italic* and [link](https://example.com)";
    const html = renderToString(<ReactMarkdown>{safe}</ReactMarkdown>);
    expect(html).toContain("<strong>bold</strong>");
    expect(html).toContain("<em>italic</em>");
    expect(html).toContain('href="https://example.com"');
  });
});

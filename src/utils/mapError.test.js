import { describe, it, expect } from "vitest";
import mapError, { rawMessage } from "./mapError";

describe("mapError — one voice for failure (Mutation #5)", () => {
  it("strips Electron's invoke-wrapper prefix before classifying", () => {
    expect(rawMessage("Error invoking remote method 'spine': Error: EBUSY: resource busy")).toBe(
      "EBUSY: resource busy"
    );
    expect(rawMessage(new Error("plain"))).toBe("plain");
    expect(rawMessage(undefined)).toBe("");
  });

  it("translates file-lock codes into the blocking-program sentence", () => {
    const msg = mapError("EBUSY: resource busy or locked, rename 'C:\\x\\sermonforge.db.tmp'", "save");
    expect(msg).toMatch(/antivirus or OneDrive/);
    expect(msg).not.toMatch(/EBUSY/);
  });

  it("names the Word document for export-context locks", () => {
    expect(mapError("EPERM: operation not permitted", "export")).toMatch(/Word document/);
  });

  it("translates network failures", () => {
    expect(mapError("fetch failed")).toMatch(/internet/);
    expect(mapError(new Error("getaddrinfo ENOTFOUND api.esv.org"))).toMatch(/internet/);
  });

  it("translates ESV API statuses without leaking HTTP codes", () => {
    expect(mapError("ESV API HTTP 401")).toMatch(/key/i);
    expect(mapError("ESV API HTTP 429")).toMatch(/busy/);
    expect(mapError("ESV API HTTP 503")).toMatch(/isn't answering/);
    expect(mapError("ESV API HTTP 401")).not.toMatch(/401|HTTP/);
  });

  it("translates disk-full", () => {
    expect(mapError("ENOSPC: no space left on device")).toMatch(/disk is full/);
  });

  it("falls back to a per-context plain sentence, never the raw string", () => {
    const msg = mapError("SqliteError: UNIQUE constraint failed: sermons.id", "create");
    expect(msg).toMatch(/Could not create the sermon/);
    expect(msg).not.toMatch(/UNIQUE|Sqlite/);
  });

  it("unwraps IPC-wrapped engine strings end to end", () => {
    const wrapped = "Error invoking remote method 'sermon-export-manuscript': Error: EBUSY: locked";
    expect(mapError(wrapped, "export")).toMatch(/Word document/);
  });
});

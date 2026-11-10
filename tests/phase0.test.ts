import { describe, expect, it } from "vitest";
import { readTouch, sourceLabel } from "@/lib/attribution";
import { csvField } from "@/lib/csv";
import { conversion } from "@/lib/demand";

describe("first-touch attribution", () => {
  it("reads UTM tags, normalized", () => {
    expect(readTouch("https://watchcrop.app/?utm_source=Reddit&utm_medium=post&utm_campaign=r-watches", "")).toEqual({
      utmSource: "reddit",
      utmMedium: "post",
      utmCampaign: "r-watches",
      referrerHost: undefined,
    });
  });

  it("keeps an external referrer host, without www", () => {
    expect(readTouch("https://watchcrop.app/", "https://www.watchuseek.com/threads/123").referrerHost).toBe("watchuseek.com");
  });

  it("ignores same-site referrers (internal navigation)", () => {
    expect(readTouch("https://watchcrop.app/play", "https://watchcrop.app/").referrerHost).toBeUndefined();
  });

  it("labels by utm_source, then referrer, then direct", () => {
    expect(sourceLabel({ utmSource: "reddit", referrerHost: "t.co" })).toBe("reddit");
    expect(sourceLabel({ referrerHost: "t.co" })).toBe("t.co");
    expect(sourceLabel({})).toBe("direct");
  });
});

describe("waitlist CSV", () => {
  it("quotes and escapes fields", () => {
    expect(csvField('a "quoted", value')).toBe('"a ""quoted"", value"');
    expect(csvField(null)).toBe('""');
  });

  it("defuses spreadsheet formulas", () => {
    expect(csvField("=HYPERLINK(\"x\")")).toBe('"\'=HYPERLINK(""x"")"');
    expect(csvField("+1")).toBe('"\'+1"');
  });
});

describe("conversion", () => {
  it("is a whole percent, or null with no visits", () => {
    expect(conversion({ visits: 40, signups: 3 })).toBe(8);
    expect(conversion({ visits: 0, signups: 0 })).toBeNull();
  });
});

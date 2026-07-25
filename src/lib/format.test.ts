import { describe, expect, it } from "vitest";
// Not: test dosyaları tsconfig'ten hariç; vitest'in çözebilmesi için uzantısız import.
import { formatDuration, parseTimeToMs, progressBar } from "./format";

describe("formatDuration", () => {
  it("0, negatif ve tanımsız değerler için 0:00 döner", () => {
    expect(formatDuration(0)).toBe("0:00");
    expect(formatDuration(-5)).toBe("0:00");
    expect(formatDuration(undefined)).toBe("0:00");
  });

  it("dakika:saniye biçimler", () => {
    expect(formatDuration(5_000)).toBe("0:05");
    expect(formatDuration(90_000)).toBe("1:30");
  });

  it("saat:dakika:saniye biçimler", () => {
    expect(formatDuration(3_723_000)).toBe("1:02:03");
  });
});

describe("parseTimeToMs", () => {
  it("saniye, dakika:saniye ve saat:dakika:saniye ayrıştırır", () => {
    expect(parseTimeToMs("90")).toBe(90_000);
    expect(parseTimeToMs("1:30")).toBe(90_000);
    expect(parseTimeToMs("1:02:03")).toBe(3_723_000);
  });

  it("boşlukları kırpar", () => {
    expect(parseTimeToMs("  45  ")).toBe(45_000);
  });

  it("geçersiz girdi için null döner", () => {
    expect(parseTimeToMs("")).toBeNull();
    expect(parseTimeToMs("abc")).toBeNull();
    expect(parseTimeToMs("1:2:3:4")).toBeNull();
  });
});

describe("progressBar", () => {
  it("süre 0 ise sabit uzunlukta boş çubuk verir", () => {
    expect(progressBar(0, 0, 20)).toHaveLength(20);
  });

  it("ilerleme işaretçisi (🔘) içerir", () => {
    expect(progressBar(50_000, 100_000, 20)).toContain("🔘");
  });
});

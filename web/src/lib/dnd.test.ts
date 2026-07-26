import { expect, test } from "vitest";
import { detectMove } from "./dnd";

test("aşağı taşımayı bulur", () => {
  // [0,1,2,3] içinde 0. öğe 2. konuma → yeni sıra [1,2,0,3]
  expect(detectMove([1, 2, 0, 3])).toEqual({ from: 0, to: 2 });
});

test("yukarı taşımayı bulur", () => {
  // 3. öğe 1. konuma → [0,3,1,2]
  expect(detectMove([0, 3, 1, 2])).toEqual({ from: 3, to: 1 });
});

test("değişiklik yoksa null döner", () => {
  expect(detectMove([0, 1, 2, 3])).toBeNull();
});

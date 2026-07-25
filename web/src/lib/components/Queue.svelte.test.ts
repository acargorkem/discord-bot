import { page } from "@vitest/browser/context";
import { render } from "vitest-browser-svelte";
import { expect, test } from "vitest";
import Queue from "./Queue.svelte";

test("kuyruktaki parçaları listeler", async () => {
  render(Queue, {
    queue: [{ title: "İlk Parça", author: "X", uri: null, duration: 1000 }],
  });
  await expect.element(page.getByText("İlk Parça")).toBeInTheDocument();
});

test("boş kuyrukta mesaj gösterir", async () => {
  render(Queue, { queue: [] });
  await expect.element(page.getByText("Kuyruk boş.")).toBeInTheDocument();
});

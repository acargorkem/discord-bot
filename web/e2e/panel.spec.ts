import { expect, test } from "@playwright/test";

test("giriş yapılmamışsa login ekranı görünür", async ({ page }) => {
  await page.route("**/api/auth/me", (route) => route.fulfill({ status: 401 }));
  await page.goto("/");
  await expect(
    page.getByRole("link", { name: "Discord ile giriş yap" }),
  ).toBeVisible();
});

test("giriş yapılmışsa çalan parça panelde görünür", async ({ page }) => {
  await page.route("**/api/auth/me", (route) =>
    route.fulfill({ json: { id: "1", username: "Ali" } }),
  );
  await page.route("**/api/now-playing", (route) =>
    route.fulfill({
      json: {
        nowPlaying: {
          title: "E2E Şarkı",
          author: "Sanatçı",
          uri: null,
          duration: 100_000,
          position: 0,
          isStream: false,
          artworkUrl: null,
          paused: false,
          volume: 100,
          repeatMode: "off",
        },
      },
    }),
  );
  await page.route("**/api/queue", (route) => route.fulfill({ json: { queue: [] } }));

  await page.goto("/");
  await expect(page.getByText("E2E Şarkı")).toBeVisible();
});

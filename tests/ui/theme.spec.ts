import { expect, test } from "@playwright/test";
import { APP_URL } from "./helpers";

test("first-run theme picker applies the chosen theme and remembers it", async ({ page }) => {
  await page.goto(APP_URL);
  await expect(page.locator("textarea")).toHaveCount(0);
  await expect(page.getByText("A calculator you write in.")).toBeVisible();
  await expect(page.getByText("Your sheets are saved only in this browser")).toBeVisible();

  await page.getByRole("button", { name: "Light" }).click();
  await page.getByRole("button", { name: /Phosphor/ }).click();

  const html = page.locator("html");
  await expect(page.locator("textarea")).toBeVisible();
  await expect(html).toHaveAttribute("data-theme", "phosphor-light");

  await page.reload();
  await expect(page.locator("textarea")).toBeVisible();
  await expect(html).toHaveAttribute("data-theme", "phosphor-light");
});

test("the intro only shows before a theme is chosen", async ({ page }) => {
  await page.goto(APP_URL);
  await page.getByRole("button", { name: /Midnight/ }).click();
  await page.locator("textarea").press("Escape");
  await expect(page.getByText("Choose a color scheme")).toBeVisible();
  await expect(page.getByText("A calculator you write in.")).toHaveCount(0);
});

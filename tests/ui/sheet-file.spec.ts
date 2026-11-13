import { expect, test } from "@playwright/test";
import { APP_URL, seedTheme } from "./helpers";

test.beforeEach(async ({ page }) => {
  await seedTheme(page);
  await page.goto(APP_URL);
});

test("a backup brings the sheets back after the storage is cleared; a bad file changes nothing", async ({ page }, testInfo) => {
  await page.getByRole("button", { name: "New" }).click();
  await page.locator("textarea").fill("trip = $300\ntrip * 2");
  await page.getByText("Untitled").first().dblclick();
  await page.keyboard.press("Control+a");
  await page.keyboard.type("Trip budget");
  await page.keyboard.press("Enter");
  await expect(page.getByText("Trip budget")).toBeVisible();

  await page.getByText("Trip budget").click({ button: "right" });
  const textDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export as text" }).click();
  expect((await textDownload).suggestedFilename()).toBe("Trip budget.txt");

  const menu = page.getByRole("button", { name: "Backup" });

  await menu.click();
  const downloading = page.waitForEvent("download");
  await page.getByRole("menuitem", { name: "Back up all sheets" }).click();
  const download = await downloading;
  expect(download.suggestedFilename()).toMatch(/^napkinmath-\d{4}-\d{2}-\d{2}\.napkin$/);
  const backup = testInfo.outputPath("backup.napkin");
  await download.saveAs(backup);

  await page.evaluate(() => localStorage.removeItem("napkinmath:sheets:v1"));
  await page.reload();
  await expect(page.getByText("Trip budget")).toHaveCount(0);

  const input = page.getByTestId("import-file");
  await input.setInputFiles({ name: "notes.json", mimeType: "application/json", buffer: Buffer.from("{}") });
  await expect(page.getByRole("alert")).toHaveText("This is not a NapkinMath backup file.");
  await expect(page.getByText("Trip budget")).toHaveCount(0);

  await input.setInputFiles(backup);
  await expect(page.getByRole("status")).toHaveText("Added 2 sheets.");
  await page.getByText("Trip budget").click();
  await expect(page.locator("textarea")).toHaveValue("trip = $300\ntrip * 2");

  // The same backup again changes nothing.
  await input.setInputFiles(backup);
  await expect(page.getByRole("status")).toHaveText("No changes: these sheets are already here.");
  await expect(page.getByText("Trip budget")).toHaveCount(1);
});

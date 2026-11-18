import { test, expect, type Page } from "@playwright/test";

test.describe.configure({ timeout: 120_000 });

const API_BASE = process.env.API_BASE_URL ?? "http://localhost:8090";

async function loginAs(page: Page, email: string) {
  await page.goto("/login", { waitUntil: "networkidle" });
  await page.waitForSelector("#login-email");
  await page.waitForTimeout(1200);
  await page.fill("#login-email", email);
  await page.fill("#login-password", "password");
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), {
    timeout: 30_000,
  });
  await page.waitForTimeout(1200);
}

test.describe("Then & Now API mode", () => {
  test("editor submits and an administrator publishes; the public read updates", async ({
    browser,
    request,
  }) => {
    const title = `The railway that built Nairobi — API ${Date.now()}`;
    const editorContext = await browser.newContext();
    const editor = await editorContext.newPage();

    await loginAs(editor, "editor@example.com");
    await editor.goto("/then-now", { waitUntil: "networkidle" });
    await editor.waitForTimeout(1800);

    await expect(editor.getByText("Live API", { exact: true })).toBeVisible();
    await expect(
      editor.getByRole("link", {
        name: /Nairobi Railway Museum|Nairobi War Cemetery|African Heritage House|Nabongo Cultural Centre/,
      }),
    ).toHaveCount(4);

    await editor
      .getByRole("link", { name: /Nairobi Railway Museum/ })
      .first()
      .click();
    await editor.waitForTimeout(1800);
    await expect(
      editor.getByRole("heading", { name: "Nairobi Railway Museum" }),
    ).toBeVisible();
    await editor.getByRole("tab", { name: "Experiences" }).click();
    await editor.waitForTimeout(1200);
    await editor.getByRole("link", { name: "Open" }).first().click();
    await editor.waitForTimeout(2200);

    await editor.getByLabel("Title").fill(title);
    await editor.waitForTimeout(600);
    await editor.getByRole("button", { name: "Save draft" }).click();
    await expect(
      editor.getByText("Saved", { exact: true }).first(),
    ).toBeVisible({ timeout: 10_000 });
    await editor.getByRole("button", { name: "Submit for review" }).click();
    await editor
      .getByRole("dialog")
      .getByRole("button", { name: "Submit for review" })
      .click();
    await expect(editor.getByText(/Frozen for review/).first()).toBeVisible({
      timeout: 10_000,
    });
    await editorContext.close();

    const adminContext = await browser.newContext();
    const admin = await adminContext.newPage();
    await loginAs(admin, "grace@example.com");
    await admin.goto("/then-now/review", { waitUntil: "networkidle" });
    await admin.waitForTimeout(1800);
    await expect(
      admin.getByRole("heading", { name: "Review queue" }),
    ).toBeVisible();

    await admin
      .getByRole("link", { name: /The railway that built Nairobi/ })
      .first()
      .click();
    await admin.waitForTimeout(1800);
    await admin.getByRole("button", { name: "Assign to me" }).click();
    await expect(admin.getByText("Assigned to you.")).toBeVisible();
    await admin.getByRole("button", { name: "Approve revision" }).click();
    await admin.waitForTimeout(1200);
    await admin.getByRole("button", { name: "Publish now" }).click();
    await admin
      .getByRole("dialog")
      .getByRole("button", { name: "Publish now" })
      .click();
    await expect(admin.getByText(/Live v\d/).first()).toBeVisible({
      timeout: 15_000,
    });
    await adminContext.close();

    const response = await request.get(
      `${API_BASE}/v1/public/then-now/sites/nairobi-railway-museum`,
    );
    expect(response.ok()).toBe(true);
    const payload = (await response.json()) as {
      site?: { experience?: { title?: string } };
    };
    expect(payload.site?.experience?.title).toBe(title);
  });
});

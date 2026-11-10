import type { Locator, Page } from 'playwright'

export async function selectChoice(page: Page, trigger: Locator, label: string) {
  await trigger.click()
  await page.getByRole('option', { name: label, exact: true }).click()
}

import type { Locator, Page } from 'playwright'

export async function selectChoice(page: Page, trigger: Locator, label: string) {
  await trigger.click()
  await page.getByRole('option', { name: label, exact: true }).click()
}

/** Types a model name into Settings, whatever the provider's model list contains. */
export async function typeTextModel(page: Page, model: string) {
  const custom = page.locator('#text-model-custom')
  if (!await custom.count()) await selectChoice(page, page.locator('#text-model'), 'Type a model name…')
  await custom.fill(model)
}

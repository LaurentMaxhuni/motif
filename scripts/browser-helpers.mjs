export async function selectChoice(page, trigger, label) {
  await trigger.click()
  await page.getByRole('option', { name: label, exact: true }).click()
}

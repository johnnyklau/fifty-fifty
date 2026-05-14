import { test, expect, type Page } from '@playwright/test'

async function getCanvasBox(page: Page) {
  // Use the Konva canvas element directly so coordinates match canvas (0,0) exactly.
  // .canvas-wrapper has a 1px border that would offset every coordinate by 1px.
  const box = await page.locator('canvas').first().boundingBox()
  if (!box) throw new Error('Canvas not found')
  return box
}

async function drawStroke(
  page: Page,
  from: { x: number; y: number },
  to: { x: number; y: number },
) {
  const box = await getCanvasBox(page)
  await page.mouse.move(box.x + from.x, box.y + from.y)
  await page.mouse.down()
  await page.mouse.move(box.x + to.x, box.y + to.y, { steps: 20 })
  await page.mouse.up()
}

test.describe('fifty-fifty game', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('shows draw phase on load', async ({ page }) => {
    await expect(page.locator('.phase-label')).toHaveText('Draw')
    await expect(page.getByRole('button', { name: 'Done Drawing' })).toBeVisible()
    await expect(page.locator('.swatch')).toHaveCount(9)
  })

  test('advances to cut phase after Done Drawing', async ({ page }) => {
    await page.getByRole('button', { name: 'Done Drawing' }).click()
    await expect(page.locator('.phase-label')).toHaveText('Cut')
    await expect(page.getByRole('button', { name: 'Submit' })).toBeVisible()
  })

  test('shows error when submitting an empty canvas', async ({ page }) => {
    await page.getByRole('button', { name: 'Done Drawing' }).click()
    await page.getByRole('button', { name: 'Submit' }).click()
    await expect(page.getByText(/canvas is empty/i)).toBeVisible()
  })

  test('shows error when cut line misses all pixels on one side', async ({ page }) => {
    // Draw only on the right half — default cut at x=0 puts everything on the right
    await drawStroke(page, { x: 400, y: 200 }, { x: 700, y: 400 })
    await page.getByRole('button', { name: 'Done Drawing' }).click()
    await page.getByRole('button', { name: 'Submit' }).click()
    await expect(page.getByText(/both sides/i)).toBeVisible()
  })

  test('full flow: draw → cut → result → play again', async ({ page }) => {
    // Draw a horizontal stroke that spans both sides of a diagonal cut
    await drawStroke(page, { x: 100, y: 300 }, { x: 700, y: 300 })
    await page.getByRole('button', { name: 'Done Drawing' }).click()

    // Drag endpoint A from near (0,0) to (400,0), creating a diagonal cut.
    // With A=(400,0) and B=(0,600): pixels at x < 200 → left, x > 200 → right.
    // Our stroke covers x=100–700 so both sides have pixels.
    // Start 4px inside the circle (radius 8) to ensure we hit the drag target.
    const box = await getCanvasBox(page)
    await page.mouse.move(box.x + 4, box.y + 4)
    await page.mouse.down()
    await page.mouse.move(box.x + 404, box.y + 4, { steps: 20 })
    await page.mouse.up()

    await page.getByRole('button', { name: 'Submit' }).click()

    await expect(page.locator('.phase-label')).toHaveText('Result')
    await expect(page.locator('.result-split')).toBeVisible()
    await expect(page.locator('.result-score')).toBeVisible()

    await page.getByRole('button', { name: 'Play Again' }).click()
    await expect(page.locator('.phase-label')).toHaveText('Draw')
  })
})

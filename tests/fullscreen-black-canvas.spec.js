import { expect, test } from '@playwright/test';

async function samplePixels(page, points) {
  return page.evaluate((samplePoints) => {
    const gameCanvas = document.querySelector('canvas');
    const context = gameCanvas.getContext('2d', { willReadFrequently: true });

    return samplePoints.map(([x, y]) => Array.from(context.getImageData(x, y, 1, 1).data));
  }, points);
}

async function waitForCanvasPaint(page) {
  await page.evaluate(
    () =>
      new Promise((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(resolve));
      })
  );
}

async function countBrightPixels(page, bounds) {
  return page.evaluate(({ x, y, width, height }) => {
    const gameCanvas = document.querySelector('canvas');
    const context = gameCanvas.getContext('2d', { willReadFrequently: true });
    let brightPixels = 0;

    for (let row = y; row < y + height; row += 1) {
      for (let column = x; column < x + width; column += 1) {
        const [red, green, blue, alpha] = context.getImageData(column, row, 1, 1).data;

        if (red > 180 && green > 180 && blue > 180 && alpha === 255) {
          brightPixels += 1;
        }
      }
    }

    return brightPixels;
  }, bounds);
}

async function measureJumpForKey(page, key) {
  await page.waitForFunction(() => window.__POINTSHIFT_DEBUG__?.getState?.());
  await page.waitForFunction(() => window.__POINTSHIFT_DEBUG__.getState().grounded === true);

  const grounded = await page.evaluate(() => window.__POINTSHIFT_DEBUG__.getState());

  await page.keyboard.press(key);
  const jumpArc = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const started = window.__POINTSHIFT_DEBUG__.getState();
        let minY = started.player.y;
        let sawAirborne = false;
        let frames = 0;

        function sample() {
          const state = window.__POINTSHIFT_DEBUG__.getState();
          minY = Math.min(minY, state.player.y);
          sawAirborne = sawAirborne || !state.grounded;
          frames += 1;

          if (sawAirborne && state.grounded) {
            resolve({
              landed: true,
              sawAirborne,
              jumpHeight: started.player.y - minY,
              peakY: minY,
              state
            });
            return;
          }

          if (frames > 180) {
            resolve({
              landed: false,
              sawAirborne,
              jumpHeight: started.player.y - minY,
              peakY: minY,
              state
            });
            return;
          }

          requestAnimationFrame(sample);
        }

        requestAnimationFrame(sample);
      })
  );

  return { grounded, jumpArc };
}

test('Phaser canvas fills the viewport with a pure black background above the horizon', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto('/');

  const canvas = page.locator('canvas');
  await expect(canvas).toHaveCount(1);

  const box = await canvas.boundingBox();
  expect(box).toEqual({ x: 0, y: 0, width: 1024, height: 768 });

  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(0, 0, 0)');
  await expect(canvas).toHaveCSS('display', 'block');

  const sample = await samplePixels(page, [
    [0, 0],
    [16, 16],
    [1023, 700]
  ]);

  expect(sample).toEqual([
    [0, 0, 0, 255],
    [0, 0, 0, 255],
    [0, 0, 0, 255]
  ]);
});

test('white pixel-style UI text matches the marked layout', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto('/');
  await page.locator('canvas').waitFor();

  await page.waitForFunction(() => window.__POINTSHIFT_DEBUG__?.getState?.());
  await waitForCanvasPaint(page);

  const state = await page.evaluate(() => window.__POINTSHIFT_DEBUG__.getState());
  expect(state.uiTexts).toEqual(
    expect.objectContaining({
      remark: expect.objectContaining({
        text:
          'Due to certain factors, this game is very simple and suggested. Please note that this is not your fault, nor is it our fault. But some things still require some time.',
        color: '#ffffff',
        alpha: 1
      }),
      title: expect.objectContaining({ text: 'Point Shift', color: '#ffffff', alpha: 1 }),
      author: expect.objectContaining({ text: 'Ariakage', color: '#ffffff', alpha: 1 }),
      level: expect.objectContaining({ text: 'LEVEL 1', color: '#ffffff', alpha: 1 })
    })
  );

  expect(state.uiTexts.remark.x).toBe(24);
  expect(state.uiTexts.remark.y).toBe(24);
  expect(state.uiTexts.remark.fontSize).toBe(12);
  expect(state.uiTexts.remark.bounds.height).toBeGreaterThan(28);
  expect(state.uiTexts.title.x).toBeGreaterThan(470);
  expect(state.uiTexts.title.x).toBeLessThan(554);
  expect(state.uiTexts.title.y).toBeGreaterThan(220);
  expect(state.uiTexts.title.y).toBeLessThan(300);
  expect(state.uiTexts.title.fontSize).toBe(36);
  expect(state.uiTexts.author.y).toBeGreaterThan(state.uiTexts.title.y + 60);
  expect(state.uiTexts.author.y).toBeLessThan(state.uiTexts.title.y + 95);
  expect(state.uiTexts.author.fontSize).toBe(22);
  expect(state.uiTexts.level.x).toBeGreaterThan(880);
  expect(state.uiTexts.level.y).toBeLessThan(90);
  expect(state.uiTexts.remark.bounds.x + state.uiTexts.remark.bounds.width).toBeLessThan(
    state.uiTexts.level.bounds.x - 16
  );

  await expect.poll(() => countBrightPixels(page, state.uiTexts.remark.bounds)).toBeGreaterThan(100);
  await expect.poll(() => countBrightPixels(page, state.uiTexts.title.bounds)).toBeGreaterThan(120);
  await expect.poll(() => countBrightPixels(page, state.uiTexts.author.bounds)).toBeGreaterThan(80);
  await expect.poll(() => countBrightPixels(page, state.uiTexts.level.bounds)).toBeGreaterThan(60);
});

test('intro text fades out after the player starts moving', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto('/');
  await page.locator('canvas').waitFor();

  await page.waitForFunction(() => window.__POINTSHIFT_DEBUG__?.getState?.());
  const initial = await page.evaluate(() => window.__POINTSHIFT_DEBUG__.getState());
  expect(initial.introTextAlpha).toBe(1);
  expect(initial.uiTexts.title.alpha).toBe(1);
  expect(initial.uiTexts.author.alpha).toBe(1);
  expect(initial.uiTexts.remark.alpha).toBe(1);
  expect(initial.uiTexts.level.alpha).toBe(1);

  await page.keyboard.down('a');
  await page.waitForTimeout(500);
  await page.keyboard.up('a');

  const fading = await page.evaluate(() => window.__POINTSHIFT_DEBUG__.getState());
  expect(fading.introTextAlpha).toBeGreaterThan(0);
  expect(fading.introTextAlpha).toBeLessThan(1);
  expect(fading.uiTexts.remark.alpha).toBe(1);
  expect(fading.uiTexts.level.alpha).toBe(1);

  await page.waitForFunction(() => window.__POINTSHIFT_DEBUG__.getState().introTextAlpha === 0);

  const faded = await page.evaluate(() => window.__POINTSHIFT_DEBUG__.getState());
  expect(faded.uiTexts.title.alpha).toBe(0);
  expect(faded.uiTexts.author.alpha).toBe(0);
  expect(faded.uiTexts.remark.alpha).toBe(1);
  expect(faded.uiTexts.level.alpha).toBe(1);
});

test('player is a 1x1 unit white square labeled Dot and leaves a trail while moving', async ({ page }) => {
  await page.setViewportSize({ width: 480, height: 360 });
  await page.goto('/');
  await page.locator('canvas').waitFor();

  await page.waitForFunction(() => window.__POINTSHIFT_DEBUG__?.getState?.());
  await waitForCanvasPaint(page);

  const initial = await page.evaluate(() => window.__POINTSHIFT_DEBUG__.getState());
  expect(initial.unit).toBe(25);
  expect(initial.nickname).toBe('Dot');
  expect(initial.player.width).toBe(25);
  expect(initial.player.height).toBe(25);
  expect(initial.grounded).toBe(false);
  expect(initial.player.y).toBeLessThan(initial.horizon.y - initial.player.height);

  const playerPixels = await samplePixels(page, [
    [initial.player.x, initial.player.y],
    [initial.player.x + initial.player.width - 1, initial.player.y],
    [initial.player.x, initial.player.y + initial.player.height - 1],
    [initial.player.x + initial.player.width - 1, initial.player.y + initial.player.height - 1],
    [initial.player.x - 1, initial.player.y],
    [initial.player.x + initial.player.width, initial.player.y]
  ]);

  expect(playerPixels).toEqual([
    [255, 255, 255, 255],
    [255, 255, 255, 255],
    [255, 255, 255, 255],
    [255, 255, 255, 255],
    [0, 0, 0, 255],
    [0, 0, 0, 255]
  ]);

  const nicknamePixels = await page.evaluate(({ x, y, width }) => {
    const gameCanvas = document.querySelector('canvas');
    const context = gameCanvas.getContext('2d', { willReadFrequently: true });
    let litPixels = 0;
    const centerX = Math.round(x + width / 2);

    for (let row = y - 18; row < y - 3; row += 1) {
      for (let column = centerX - 14; column <= centerX + 14; column += 1) {
        const [red, green, blue, alpha] = context.getImageData(column, row, 1, 1).data;

        if (red > 0 || green > 0 || blue > 0 || alpha !== 255) {
          litPixels += 1;
        }
      }
    }

    return litPixels;
  }, initial.player);

  expect(nicknamePixels).toBeGreaterThan(8);

  const horizonPixels = await samplePixels(page, [
    [0, initial.horizon.y],
    [240, initial.horizon.y],
    [479, 359],
    [240, initial.horizon.y - 1]
  ]);

  expect(initial.horizon.height).toBe(3);
  expect(horizonPixels).toEqual([
    [255, 255, 255, 255],
    [255, 255, 255, 255],
    [255, 255, 255, 255],
    [0, 0, 0, 255]
  ]);

  await page.keyboard.down('a');
  await page.waitForTimeout(250);
  await page.keyboard.up('a');
  await page.waitForTimeout(50);
  await waitForCanvasPaint(page);

  const movedLeft = await page.evaluate(() => window.__POINTSHIFT_DEBUG__.getState());
  expect(movedLeft.player.x).toBeLessThan(initial.player.x);
  expect(movedLeft.trailCount).toBeGreaterThan(0);
  expect(movedLeft.trailStyle).toEqual(
    expect.objectContaining({
      mode: 'pixel-fade',
      maxAlpha: expect.any(Number),
      minAlpha: expect.any(Number),
      maxScale: expect.any(Number),
      minScale: expect.any(Number)
    })
  );
  expect(movedLeft.trailStyle.maxAlpha).toBeLessThanOrEqual(0.42);
  expect(movedLeft.trailStyle.minAlpha).toBeGreaterThanOrEqual(0.04);
  expect(movedLeft.trailStyle.maxScale).toBeLessThan(1);

  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(250);
  await page.keyboard.up('ArrowRight');
  await page.waitForTimeout(50);
  await waitForCanvasPaint(page);

  const movedRight = await page.evaluate(() => window.__POINTSHIFT_DEBUG__.getState());
  expect(movedRight.player.x).toBeGreaterThan(movedLeft.player.x);
});

test('w and arrow up jump without fading the intro text', async ({ page }) => {
  for (const key of ['w', 'ArrowUp']) {
    await page.setViewportSize({ width: 240, height: 180 });
    await page.goto('/');
    await page.locator('canvas').waitFor();

    const { grounded, jumpArc } = await measureJumpForKey(page, key);
    expect(grounded.introTextAlpha).toBe(1);
    expect(jumpArc.landed).toBe(true);
    expect(jumpArc.sawAirborne).toBe(true);
    expect(jumpArc.jumpHeight).toBeGreaterThanOrEqual(21);
    expect(jumpArc.jumpHeight).toBeLessThanOrEqual(25);
    expect(jumpArc.state.introTextAlpha).toBe(1);
    expect(jumpArc.state.uiTexts.title.alpha).toBe(1);
    expect(jumpArc.state.uiTexts.author.alpha).toBe(1);
  }
});

test('right door is two units tall and transitions into an empty level2 scene', async ({ page }) => {
  await page.setViewportSize({ width: 480, height: 360 });
  await page.goto('/');
  await page.locator('canvas').waitFor();
  await page.waitForFunction(() => window.__POINTSHIFT_DEBUG__?.getState?.());

  const initial = await page.evaluate(() => window.__POINTSHIFT_DEBUG__.getState());
  expect(initial.gameState).toBe('level1');
  expect(initial.door).toEqual(
    expect.objectContaining({
      x: 455,
      width: 25,
      height: 50,
      style: 'black-white-pixel-outline'
    })
  );
  expect(initial.door.y + initial.door.height).toBe(initial.horizon.y);

  const doorPixels = await samplePixels(page, [
    [initial.door.x, initial.door.y],
    [initial.door.x + initial.door.width - 1, initial.door.y],
    [initial.door.x + initial.door.width - 1, initial.door.y + initial.door.height - 1],
    [initial.door.x + Math.floor(initial.door.width / 2), initial.door.y + Math.floor(initial.door.height / 2)]
  ]);

  expect(doorPixels).toEqual([
    [255, 255, 255, 255],
    [255, 255, 255, 255],
    [255, 255, 255, 255],
    [0, 0, 0, 255]
  ]);

  await page.waitForFunction(() => window.__POINTSHIFT_DEBUG__.getState().grounded === true);
  await page.keyboard.down('ArrowRight');
  await page.waitForFunction(() => window.__POINTSHIFT_DEBUG__.getState().gameState === 'level2');
  await page.keyboard.up('ArrowRight');

  const transitioning = await page.evaluate(() => window.__POINTSHIFT_DEBUG__.getState());
  expect(transitioning.transition.active).toBe(true);
  expect(transitioning.transition.direction).toBe('right-to-left');
  expect(transitioning.transition.offsetX).toBeLessThan(0);

  await page.waitForFunction(() => window.__POINTSHIFT_DEBUG__.getState().transition.active === false);

  const level2 = await page.evaluate(() => window.__POINTSHIFT_DEBUG__.getState());
  expect(level2.gameState).toBe('level2');
  expect(level2.sceneEmpty).toBe(true);
  expect(level2.visibleGameplayObjects).toBe(0);
});

test('player starts airborne and falls onto the horizon', async ({ page }) => {
  await page.setViewportSize({ width: 240, height: 180 });
  await page.goto('/');
  await page.locator('canvas').waitFor();

  await page.waitForFunction(() => window.__POINTSHIFT_DEBUG__?.getState?.());
  await waitForCanvasPaint(page);

  const airborne = await page.evaluate(() => window.__POINTSHIFT_DEBUG__.getState());
  expect(airborne.grounded).toBe(false);
  expect(airborne.player.y).toBeLessThan(airborne.horizon.y - airborne.player.height);

  await page.waitForFunction(() => window.__POINTSHIFT_DEBUG__.getState().grounded === true);
  await waitForCanvasPaint(page);

  const landed = await page.evaluate(() => window.__POINTSHIFT_DEBUG__.getState());
  expect(landed.grounded).toBe(true);
  expect(landed.velocity.y).toBe(0);
  expect(landed.player.y + landed.player.height).toBe(landed.horizon.y);

  const landedPixels = await samplePixels(page, [
    [landed.player.x, landed.player.y],
    [landed.player.x + landed.player.width - 1, landed.player.y + landed.player.height - 1],
    [landed.player.x, landed.horizon.y],
    [landed.player.x, landed.horizon.y - 1]
  ]);

  expect(landedPixels).toEqual([
    [255, 255, 255, 255],
    [255, 255, 255, 255],
    [255, 255, 255, 255],
    [255, 255, 255, 255]
  ]);
});

test('space makes the grounded player jump and then land again', async ({ page }) => {
  await page.setViewportSize({ width: 240, height: 180 });
  await page.goto('/');
  await page.locator('canvas').waitFor();

  const { grounded, jumpArc } = await measureJumpForKey(page, 'Space');
  expect(grounded.grounded).toBe(true);
  expect(grounded.player.y + grounded.player.height).toBe(grounded.horizon.y);

  expect(jumpArc.landed).toBe(true);
  expect(jumpArc.sawAirborne).toBe(true);
  expect(jumpArc.jumpHeight).toBeGreaterThanOrEqual(21);
  expect(jumpArc.jumpHeight).toBeLessThanOrEqual(25);
  expect(jumpArc.peakY).toBeLessThan(grounded.player.y);
  expect(jumpArc.state.grounded).toBe(true);
  expect(jumpArc.state.velocity.y).toBe(0);
  expect(jumpArc.state.player.y + jumpArc.state.player.height).toBe(jumpArc.state.horizon.y);
});

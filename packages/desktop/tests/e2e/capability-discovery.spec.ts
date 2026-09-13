import { expect, test } from '@playwright/test';
import { closeElectronApp, launchElectronApp, waitForAppReady, type RunningElectronApp } from './helpers/electron-app';

/**
 * The suggestion card on the start screen.
 *
 * Exercised through the real app because the point of the card is where and
 * when it appears: a jsdom render proves the markup, not that a maker meets it
 * on the way into their work rather than in the middle of it.
 */
test.describe('capability discovery', () => {
  let running: RunningElectronApp;

  test.beforeEach(async () => {
    running = await launchElectronApp();
  });

  test.afterEach(async () => {
    await closeElectronApp(running);
  });

  /** Someone six projects in who has never dropped a guide plane. */
  async function seedSeasonedUsage(): Promise<void> {
    await running.window.evaluate(async () => {
      await window.electronAPI.setPreference('capabilityUsage', {
        usage: {
          projectsSeen: 6,
          recentPartCounts: [8, 9, 8, 10, 12, 8],
          usedIn: {
            stock_assignment: 6,
            cut_lists: 5,
            groups: 4,
            custom_cuts: 3,
            joinery: 2,
            glue_up_panels: 1,
            assemblies: 1
          },
          dismissed: []
        },
        seen: {
          'a.carvd': ['stock_assignment', 'cut_lists', 'groups', 'custom_cuts', 'joinery'],
          'b.carvd': ['stock_assignment', 'cut_lists', 'groups', 'custom_cuts', 'joinery'],
          'c.carvd': ['stock_assignment', 'cut_lists', 'groups', 'custom_cuts', 'glue_up_panels'],
          'd.carvd': ['stock_assignment', 'cut_lists', 'groups', 'assemblies'],
          'e.carvd': ['stock_assignment', 'cut_lists'],
          'f.carvd': ['stock_assignment']
        }
      });
    });
    await running.window.reload();
    await waitForAppReady(running.window);
  }

  test('says nothing to someone who has barely started', async () => {
    const { window } = running;
    await waitForAppReady(window);
    // A fresh install has no evidence to reason from, and a suggestion made
    // out of nothing is just an advertisement.
    await expect(
      window.getByText('Drop a guide plane and align parts to it instead of measuring each one.')
    ).toHaveCount(0);
  });

  test('offers the one capability this maker has never reached for', async () => {
    const { window } = running;
    await seedSeasonedUsage();

    const pitch = window.getByText('Drop a guide plane and align parts to it instead of measuring each one.');
    await expect(pitch).toBeVisible();
    await expect(window.getByRole('button', { name: 'Show me how' })).toBeVisible();

    // Shown once, then it waits a week: the stamp is what makes it weekly
    // rather than every time the start screen is opened.
    await expect
      .poll(async () =>
        window.evaluate(async () => {
          const stored = (await window.electronAPI.getPreference('capabilityUsage')) as {
            usage?: { lastSuggestedAt?: string };
          } | null;
          return stored?.usage?.lastSuggestedAt ?? null;
        })
      )
      .not.toBeNull();
  });

  test('stays gone once it is turned down, across a restart', async () => {
    const { window } = running;
    await seedSeasonedUsage();

    await window.getByRole('button', { name: "Don't suggest this" }).click();
    await expect(
      window.getByText('Drop a guide plane and align parts to it instead of measuring each one.')
    ).toHaveCount(0);

    await window.reload();
    await waitForAppReady(window);
    await expect(
      window.getByText('Drop a guide plane and align parts to it instead of measuring each one.')
    ).toHaveCount(0);
  });
});

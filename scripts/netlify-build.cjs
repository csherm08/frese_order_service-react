/**
 * Netlify runs `npm run build`; NETLIFY=true and NETLIFY_SITE_NAME are set per site.
 * If NEXT_PUBLIC_ORDER_SITE is not set in the Netlify UI / netlify.toml, we pick:
 *   - plugpower — site name contains "plugpower" or "plug-power"
 *   - main — otherwise
 * Local builds (no NETLIFY) run `next build` only.
 */

const { spawnSync } = require('child_process');

function runNextBuild(env) {
  const result = spawnSync('npx', ['next', 'build'], {
    stdio: 'inherit',
    env,
    shell: true,
  });
  process.exit(result.status !== null && result.status !== undefined ? result.status : 1);
}

const env = { ...process.env };

if (env.NETLIFY !== 'true') {
  runNextBuild(env);
}

const orderSiteSet =
  env.NEXT_PUBLIC_ORDER_SITE && String(env.NEXT_PUBLIC_ORDER_SITE).trim() !== '';

if (!orderSiteSet) {
  const name = (env.NETLIFY_SITE_NAME || '').toLowerCase();
  const isPlugPower =
    name.includes('plugpower') ||
    name.includes('plug-power') ||
    name.includes('plug_power');
  if (isPlugPower) {
    env.NEXT_PUBLIC_ORDER_SITE = 'plugpower';
    if (!env.NEXT_PUBLIC_SITE_TITLE || !String(env.NEXT_PUBLIC_SITE_TITLE).trim()) {
      env.NEXT_PUBLIC_SITE_TITLE = "Frese's — Plug Power";
    }
  } else {
    env.NEXT_PUBLIC_ORDER_SITE = 'main';
    if (!env.NEXT_PUBLIC_SITE_TITLE || !String(env.NEXT_PUBLIC_SITE_TITLE).trim()) {
      env.NEXT_PUBLIC_SITE_TITLE = "Frese's Bakery";
    }
  }
}

runNextBuild(env);

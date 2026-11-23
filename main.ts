// Deterministic entry point for the Solara Bay submission.
// Copies the offline static game and its four captures into the output directory, then
// asks the untouched kit library to serialise a canonical, byte-stable dossier.
import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const root = fileURLToPath(new URL('.', import.meta.url));
const output = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(output, { recursive: true });
cpSync(join(root, 'game'), join(output, 'game'), { recursive: true });

const targetShots = join(output, 'screenshots');
mkdirSync(targetShots, { recursive: true });
const sourceShots = join(root, 'screenshots');
if (existsSync(sourceShots)) cpSync(sourceShots, targetShots, { recursive: true });

const dossier = buildDossier(output, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(output, 'dossier.json'), dossier);

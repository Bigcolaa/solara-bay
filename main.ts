// Solara Bay entrypoint: export the deterministic dossier, write it when run directly.
import { buildDossier } from './vendor/makefun-game.ts';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const DOSSIER_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};
const here = dirname(fileURLToPath(import.meta.url));

/** Same game/ and screenshots/ bytes always produce the same dossier bytes. */
export function buildGameDossier(): Uint8Array { return buildDossier(here, DOSSIER_CAPS); }
export const dossier: Uint8Array = buildGameDossier();
const parsed = JSON.parse(new TextDecoder('utf-8').decode(dossier)) as { text: string };
export const dossierText: string = parsed.text;
export const dossierTextBytes: number = Buffer.byteLength(dossierText, 'utf8');

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  const out = process.env.OUTPUT_DIR || '/output';
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, 'dossier.json'), dossier);
  console.log(`dossier.json: ${dossier.length} bytes, text ${dossierTextBytes} bytes`);
}

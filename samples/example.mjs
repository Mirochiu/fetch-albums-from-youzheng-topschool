import fs from 'node:fs/promises';
import { createClientAsync } from 'fetch-albums-from-youzheng-topschool';

const USER = process.env['USERNAME'];
const PASS = process.env['PASSWORD'];
if (!USER || !PASS) {
  console.debug('not found user or pass');
  process.exit(1);
}

const classClient = await createClientAsync(USER, PASS);

const json = await classClient.fetchAlbumsInClass();
const outpath = `albums.json`;

await fs.writeFile(outpath, JSON.stringify(json, null, 2));
console.log(`write to ${outpath}`);

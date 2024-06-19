import fs from 'node:fs/promises';
import { createClientAsync } from 'fetch-albums-from-youzheng-topschool';

const USER = process.env['USERNAME'];
const PASS = process.env['PASSWORD'];
if (!USER || !PASS) {
  console.debug('not found user or pass');
  process.exit(1);
}

const client = await createClientAsync(USER, PASS);

const classAlbums = await client.fetchAlbumsInClass();
await fs.writeFile(`albums.json`, JSON.stringify(classAlbums, null, 2));
console.log(`write to albums.json`);

const schoolAlbums = await client.fetchAlbumsInSchool();
await fs.writeFile(`schoolAlbums.json`, JSON.stringify(schoolAlbums, null, 2));
console.log(`write to schoolAlbums.json`);

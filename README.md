# fetch-albums-from-youzheng-topschool

## installation

`npm install fetch-albums-from-youzheng-topschool`

## upgrade

`npm install fetch-albums-from-youzheng-topschool@latest`

## usage

```javascript
import fs from 'node:fs/promises';
import { createClientAsync } from 'fetch-albums-from-youzheng-topschool';

const client = await createClientAsync('<your-acc>', '<your-pwd>');

const albums = await classClient.fetchAlbumsInClass();
await fs.writeFile(`albums.json`, JSON.stringify(albums, null, 2));

const schoolAlbums = await client.fetchAlbumsInSchool();
await fs.writeFile(`schoolAlbums.json`, JSON.stringify(schoolAlbums, null, 2));
```

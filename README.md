# fetch-albums-from-youzheng-topschool

## installation

`npm install fetch-albums-from-youzheng-topschool`

## upgrade

`npm install fetch-albums-from-youzheng-topschool@latest`

## usage

```javascript
import fs from 'node:fs/promises';
import { createClientAsync } from 'fetch-albums-from-youzheng-topschool';

const username = '<your-acc>';
const password = '<your-pwd>';
const client = createClient(username, password);
const albums = await classClient.fetchAlbumsInClass();
await fs.writeFile(`albums.json`, JSON.stringify(albums, null, 2));
```

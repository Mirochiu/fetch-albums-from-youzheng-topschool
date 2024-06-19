import fs from 'node:fs';
import { URL } from 'node:url';
import { JSDOM } from 'jsdom';
import dayjs from 'dayjs';

const DEBUG = false;

const HOSTNAME = 'youzheng.topschool.tw';
const BASE_URL = `https://${HOSTNAME}`;
const LOGIN_URL = `${BASE_URL}/Login`;
const VERIFY_TOKEN_NAME = '__RequestVerificationToken';
const BACK_URL = `${BASE_URL}/Login/Blank?returnUrl=%2FActivity%2FClass-Albums`;

// https://youzheng.topschool.tw/Activity/Class-Albums
// https://youzheng.topschool.tw/Activity/Class-Albums?PageIndex=2
// https://youzheng.topschool.tw/Activity/Class-Album-Detail?albumId=1195558&pageIndex=1

const handleResponse = async (response) => {
    if (response.ok) {
        return {
            status: response.status,
            content: await response.text(),
            cookies: response.headers.getSetCookie(),
        };
    }

    if (response.status !== 302) {
        throw new Error(`error code:${response.status}`);
    }

    const getRedirectUrl = (response) => {
        let location;
        if (response.headers.has('location'))
            location = response.headers.get('location');
        if (response.headers.has('Location'))
            location = response.headers.get('Location');
        if (location && !location.startsWith('http')) {
            return `${BASE_URL}${location}`;
        }
        return location;
    };

    const redirectUrl = getRedirectUrl(response);
    if (DEBUG) console.debug(`302 redirectUrl:${redirectUrl}`);
    if (!redirectUrl) {
        throw new Error('302 not found redirect location');
    }

    return {
        status: response.status,
        Referer: response.url,
        redirectUrl,
        cookies: response.headers.getSetCookie(),
    };
};

const getUrlContent = async (url, headerOptions) => {
    const headers = {
        ...headerOptions,
    };

    const response = await fetch(url, {
        'headers': headers,
        'body': null,
        'method': 'GET',
        'redirect': 'manual',
    });

    return await handleResponse(response);
};

const cookiesToString = (cookies = []) => cookies.map(c => c.split(';')[0]).join('; ');

const readCookieStringFromFile = (filePath) => {
    if (!filePath) return null;
    try {
        // TODO: check the expire time
        const content = fs.readFileSync(filePath, 'utf-8');
        return cookiesToString(content.split('\n').map(l => l.trim()).filter(Boolean));
    }
    catch (error) {
        if (DEBUG) console.debug(`not found cookie file:${filePath}, ${error.code}`);
    }
    return null;
};

const postUrl = async (url, kvpairs, headerOptions) => {
    const headers = {
        'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
        ...headerOptions,
    }
    let body = [];
    for (let property in kvpairs) {
        const encodedKey = encodeURIComponent(property);
        const encodedValue = encodeURIComponent(kvpairs[property]);
        body.push(encodedKey + '=' + encodedValue);
    }
    body = body.join('&');
    const response = await fetch(url, {
        'headers': headers,
        'body': body,
        'method': 'POST',
        'redirect': 'manual',
    });

    return await handleResponse(response);
};

const getVerifyTokenFromString = (htmlString) => {
    let beg, end;

    beg = htmlString.indexOf(VERIFY_TOKEN_NAME);
    if (beg === -1) return null;
    beg = beg + VERIFY_TOKEN_NAME.length;

    const ATTR = 'value="';
    beg = htmlString.indexOf(ATTR, beg);
    if (beg === -1) return null;
    beg = beg + ATTR.length;

    end = htmlString.indexOf('"', beg);
    if (end === -1) return null;

    return htmlString.substring(beg, end);
};

const getLoginToken = async (Referer) => {
    // 正常來說loginUrl就可以直接登入, 這裡是額外跳, 然後另外存取/Login加入內容, 變成要另外知道它會跑/Login
    const resp = await getUrlContent(LOGIN_URL, Referer ? { Referer } : undefined);
    if (resp.status != 200) {
        throw new Error(`${resp.status} ${LOGIN_URL}`);
    }

    if (DEBUG) fs.writeFileSync('pre-login.html', resp.content);
    const verifyTokenInForm = getVerifyTokenFromString(resp.content);
    if (!verifyTokenInForm) {
        throw new Error(`not found verifyToken:${VERIFY_TOKEN_NAME
            } in form, please check pre-login.html`);
    }
    const cookieString = cookiesToString(resp.cookies);
    if (!cookieString.includes(VERIFY_TOKEN_NAME)) {
        throw new Error(`not found verifyToken:${VERIFY_TOKEN_NAME
            } in cookieString:${cookieString}`);
    }
    return {
        form: verifyTokenInForm,
        cookieString: cookieString,
    }
};

const extractUrl = (u) => {
    if (u) {
        const p = u.indexOf('url(');
        const l = u.lastIndexOf(')');
        if (p >= 0 && l >= 0) {
            return u.substring(p + 4, l);
        }
    }
    return undefined;
};

const getInfoOfAlbumCards = (document) => {
    const splitName = '\n相簿說明: ';
    const allTitles = Array.from(document.querySelectorAll('.margin10[title]'))
        .map(el => {
            const full = el.title;
            const p = full.indexOf(splitName);
            let title = removePrefix(
                p === -1 ? full.substring(0) : full.substring(0, p),
                '相簿名稱: ');
            let desc = p === -1 ? '' : full.substring(p + splitName.length);
            if (desc.startsWith(title)) {
                title = desc;
                desc = '';
            }
            return { title, desc };
        });

    if (!allTitles?.length) return [];

    return Array.from(document.querySelectorAll('a.albumbgphoto'))
        .map((el, idx) => ({
            title: allTitles[idx].title,
            desc: allTitles[idx].desc,
            url: new URL(el.href, BASE_URL).toString(),
            thumbnailUrl: extractUrl(el.style['background-image']),
        }));
};

const getInfoOfCards = (document) => {
    const titles = Array.from(document.querySelectorAll('.info')).map(x => x.textContent.trim());

    if (!titles?.length) return [];

    return Array.from(document.querySelectorAll('a.albumbgphoto'))
        .map((el, idx) => ({
            title: titles[idx],
            url: new URL(el.href, BASE_URL).toString(),
            thumbnailUrl: extractUrl(el.style['background-image']),
        }));
};

const removePrefix = (s, t) => {
    if (t && s.startsWith(t))
        return s.substring(t.length);
    return s;
}

const caseInsensitiveSearchParams = (params) => new URLSearchParams(
    Array.from(params, ([key, value]) => [key.toLowerCase(), value])
);

export const albumsHtml2json = (htmlString) => {
    const dom = new JSDOM(htmlString);
    const { window } = dom;
    const { document } = window;

    const albums = getInfoOfAlbumCards(document);

    let allPages = 1;
    const urlEls = Array.from(document.querySelectorAll('.pagination a[href]'))
    if (urlEls.length) {
        const params = caseInsensitiveSearchParams(
            new URL(urlEls.pop().href, BASE_URL).searchParams
        );
        if (!params.has('pageindex')) {
            throw new Error(`not found page index in url`);
        }
        allPages = Number(params.get('pageindex'));
    }

    return {
        date: dayjs().format(),
        allPages: allPages,
        readAlbums: albums.length,
        albums: albums,
    };
};

export const photosHtml2json = (htmlString) => {
    const dom = new JSDOM(htmlString);
    const { window } = dom;
    const { document } = window;

    const photos = getInfoOfCards(document);

    const currentPageUrl = document.querySelector('.titleline > .fb-like[data-href]')?.dataset.href;
    const albumId = currentPageUrl ? new URL(currentPageUrl, BASE_URL).searchParams.get('albumId') : undefined;

    const albumTitle = document.querySelector('.row > .row > h2')?.textContent || undefined;

    let totalPages = 1;
    const urlEls = Array.from(document.querySelectorAll('.pagination a[href]'))
    if (urlEls.length) {
        const params = caseInsensitiveSearchParams(
            new URL(urlEls.pop().href, BASE_URL).searchParams
        );
        if (!params.has('pageindex')) {
            throw new Error(`not found page index in url`);
        }
        totalPages = Number(params.get('pageindex'));
    }

    return {
        date: dayjs().format(),
        totalPages: totalPages,
        totalPhotos: photos.length,
        albumId: Number(albumId),
        albumTitle: removePrefix(albumTitle, '相簿名稱: '),
        photos: photos,
    };
};

export const createClientAsync = async (user, pass) => {
    if (!user) throw new Error(`should given user`);
    if (!pass) throw new Error(`should given pass`);

    const verifyToken = await getLoginToken(BACK_URL);

    const resp = await postUrl(LOGIN_URL,
        {
            [VERIFY_TOKEN_NAME]: verifyToken.form,
            account: user,
            password: pass,
            'X-Requested-With': 'XMLHttpRequest',
        },
        {
            'cookie': verifyToken.cookieString,
            'Referer': BACK_URL,
            'Referrer-Policy': 'strict-origin-when-cross-origin',
        }
    );
    if (resp.status !== 200) {
        throw new Error('login failed');
    }

    if (!Array.isArray(resp.cookies) || resp.cookies.length < 1) {
        throw new Error('login user/password error');
        // <span class="field-validation-error text-danger text-center" data-valmsg-for="error" data-valmsg-replace="true">帳號或密碼錯誤</span>
    }

    // <script>; parent.location.reload(1)</script>
    const cookieString = cookiesToString(resp.cookies);

    const client = {
        cookieString,
        baseUrl: BASE_URL,
        isThisWebsite(url) {
            if (typeof url === 'string') {
                if (url.startsWith(BASE_URL)) {
                    const { hostname } = new URL(url);
                    return hostname === HOSTNAME;
                }
            }
            return false;
        },
        async fetch(url) {
            if (!this.isThisWebsite(url)) throw new Error(`url is not on this site`);
            const resp = await getUrlContent(url, { 'cookie': this.cookieString });
            if (resp.status !== 200) {
                throw new Error(`status(${resp.status}) not okay ${url}`);
            }
            return resp;
        },
        async fetchWithPath(path) {
            if (typeof path !== 'string') throw new Error('invalid type for url');
            switch (path[0]) {
                case '/': case '?': case '#': break;
                default: throw new Error('invalid path for url');
            }
            const url = `${this.baseUrl}${path}`;
            return await this.fetch(url);
        },
        async fetchAlbumsInSchool(pageIndex = 1) {
            const path = `/Activity/School-Albums?PageIndex=${pageIndex}`;
            const resp = await this.fetchWithPath(path);
            return albumsHtml2json(resp.content);
        },
        async fetchAlbumsInClass(pageIndex = 1) {
            const path = `/Activity/Class-Albums?PageIndex=${pageIndex}`;
            const resp = await this.fetchWithPath(path);
            return albumsHtml2json(resp.content);
        },
        async fetchPhotosInClassAlbum(albumId, pageIndex = 1) {
            if (!albumId) throw new Error(`should give albumId`);
            const path = `/Activity/Class-Album-Detail?albumId=${albumId}&pageIndex=${pageIndex}`;
            const resp = await this.fetchWithPath(path);
            return resp;
        },
        async fetchPhotosInSchoolAlbum(albumId, pageIndex = 1) {
            if (!albumId) throw new Error(`should give albumId`);
            const path = `/Activity/School-Album-Detail?albumId=${albumId}&pageIndex=${pageIndex}`;
            const resp = await this.fetchWithPath(path);
            return resp;
        },
        async getJsonOfClassAlbum(albumId) {
            if (!albumId) throw new Error(`should give albumId`);
            const { content } = await this.fetchPhotosInClassAlbum(albumId);
            const photosInfo = photosHtml2json(content);
            if (!photosInfo.totalPages) throw new Error('not found totalPages');
            photosInfo.user = user;
            photosInfo.albumId = albumId;
            for (let page = 2; page <= photosInfo.totalPages; page += 1) {
                const { content } = await this.fetchPhotosInClassAlbum(albumId, page);
                const { photos } = photosHtml2json(content);
                photosInfo.photos = photosInfo.photos.concat(photos);
                photosInfo.totalPhotos = photosInfo.photos.length;
            }
            return photosInfo;
        },
        async getJsonForAllClassAlbums() {
            const albumsInfo = await this.fetchAlbumsInClass();
            if (!albumsInfo.allPages) throw new Error('not found allPages');
            albumsInfo.user = user;
            delete albumsInfo.readAlbums;
            for (let page = 2; page <= albumsInfo.allPages; page += 1) {
                const info = await this.fetchAlbumsInClass(page);
                albumsInfo.albums = albumsInfo.albums.concat(info.albums);
                albumsInfo.totalAlbums = albumsInfo.albums.length;
            }
            return albumsInfo;
        },
    };

    return client;
}

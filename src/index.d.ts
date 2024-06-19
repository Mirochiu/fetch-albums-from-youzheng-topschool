declare module "fetch-albums-from-youzheng-topschool" {
    type AlbumType = {
        title: string;
        desc: string;
        url: string;
        thumbnailUrl: string;
    };
    type AlbumListType = {
        date: string;
        allPages: number;
        readAlbums: number;
        albums: AlbumType,
    };
    type ModifiedAlbumListType = Omit<AlbumListType, 'readAlbums'> & {
        user: string;
        totalAlbums: number;
    };
    type PhotoType = {
        title: string;
        url: string;
        thumbnailUrl: string;
    };
    type PhotoListType = {
        date: string;
        totalPages: number;
        totalPhotos: number;
        albumId: number;
        albumTitle: string;
        photos: PhotoType[],
    };
    type ExtendPhotoListType = PhotoListType & {
        user: string;
        totalPhotos: number;
    };
    type ResponseBase = {
        status: number;
        cookies: string[];
    };
    type ResponseOkay = ResponseBase & {
        content: string;
    };
    type ResponseRedirect = ResponseBase & {
        Referer?: string;
        redirectUrl?: string;
    };
    type FetchResponse = ResponseOkay | ResponseRedirect;
    type AlbumIdType = number | string;
    type PageIndexType = number | string;
    type ClientType = {
        cookieString: string;
        baseUrl: string;
        isThisWebsite(url: string): boolean;
        fetch(url: string): Promise<FetchResponse>;
        fetchWithPath(path: string): Promise<FetchResponse>;
        fetchAlbumsInSchool(pageIndex?: PageIndexType): Promise<AlbumListType>;
        fetchAlbumsInClass(pageIndex?: PageIndexType): Promise<AlbumListType>;
        fetchPhotosInClassAlbum(albumId: AlbumIdType, pageIndex?: PageIndexType): Promise<FetchResponse>;
        fetchPhotosInSchoolAlbum(albumId: AlbumIdType, pageIndex?: PageIndexType): Promise<FetchResponse>;
        getJsonOfClassAlbum(albumId: AlbumIdType): Promise<ExtendPhotoListType>;
        getJsonForAllClassAlbums(): Promise<ModifiedAlbumListType>;
    };
    export function photosHtml2json(htmlString: string): PhotoListType;
    export function albumsHtml2json(htmlString: string): AlbumListType;
    export function createClientAsync(username: string, password: string): Promise<ClientType>;
    export default createClientAsync;
}

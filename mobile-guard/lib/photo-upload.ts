export type PreparedPhoto = {
    uri: string;
    mime: 'image/jpeg';
};

export async function preparePhotoForUpload(sourceUri: string): Promise<PreparedPhoto> {
    if (!sourceUri) {
        throw new Error('PHOTO_SOURCE_URI_REQUIRED');
    }

    return {
        uri: sourceUri,
        mime: 'image/jpeg',
    };
}

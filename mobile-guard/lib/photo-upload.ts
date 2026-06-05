import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

export type PreparedPhoto = {
    uri: string;
    mime: 'image/jpeg';
};

const TARGET_WIDTH = 900;
const TARGET_QUALITY = 0.6;

export async function preparePhotoForUpload(sourceUri: string): Promise<PreparedPhoto> {
    if (!sourceUri) {
        throw new Error('PHOTO_SOURCE_URI_REQUIRED');
    }

    try {
        const result = await ImageManipulator.manipulateAsync(
            sourceUri,
            [{ resize: { width: TARGET_WIDTH } }],
            {
                compress: TARGET_QUALITY,
                format: SaveFormat.JPEG,
                base64: false,
            }
        );

        return {
            uri: result?.uri || sourceUri,
            mime: 'image/jpeg',
        };
    } catch (error) {
        console.log('⚠️ preparePhotoForUpload failed, using source URI', {
            message: error instanceof Error ? error.message : 'Unknown photo prepare error',
        });

        return {
            uri: sourceUri,
            mime: 'image/jpeg',
        };
    }
}

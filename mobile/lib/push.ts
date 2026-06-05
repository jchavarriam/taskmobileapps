import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { apiCall } from './api';

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

function getExpoProjectId(): string | undefined {
    const constantsWithEas = Constants as typeof Constants & {
        easConfig?: { projectId?: string };
        expoConfig?: { extra?: { eas?: { projectId?: string } } };
    };

    return (
        constantsWithEas.easConfig?.projectId ||
        constantsWithEas.expoConfig?.extra?.eas?.projectId
    );
}

export async function registerResidentPushToken() {
    const existingPermissions = await Notifications.getPermissionsAsync();
    let finalStatus = existingPermissions.status;

    if (finalStatus !== 'granted') {
        const requestedPermissions = await Notifications.requestPermissionsAsync();
        finalStatus = requestedPermissions.status;
    }

    if (finalStatus !== 'granted') {
        return;
    }

    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.DEFAULT,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#1E3A8A',
        });
    }

    const projectId = getExpoProjectId();
    if (!projectId) {
        console.warn('Push registration skipped: missing EAS projectId in app config');
        return;
    }

    const expoPushToken = (await Notifications.getExpoPushTokenAsync({ projectId })).data;

    await apiCall('/api/resident/push-token', {
        method: 'POST',
        body: JSON.stringify({
            expoPushToken,
            platform: Platform.OS,
        }),
    });
}

export async function deactivateResidentPushTokens() {
    await apiCall('/api/resident/push-token', {
        method: 'DELETE',
    });
}

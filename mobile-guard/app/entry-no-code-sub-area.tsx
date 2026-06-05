import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getCachedSiteMap, getSiteMap } from '@/lib/api';

type SubAreaOption = { id: string; name: string };

export default function EntryNoCodeSubAreaScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();

    const visitorName = String(params.visitorName || '');
    const areaId = String(params.areaId || '');
    const areaName = String(params.areaName || '');

    const [subAreas, setSubAreas] = useState<SubAreaOption[]>([]);
    const [selectedSubArea, setSelectedSubArea] = useState<string>('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadSubAreas();
    }, [areaId]);

    const loadSubAreas = async () => {
        try {
            const cached = getCachedSiteMap();
            if (!cached) {
                setLoading(true);
            }

            const res: any = cached ?? await getSiteMap();
            const areaRows = res?.site?.areas ?? res?.areas ?? [];
            const selectedArea = areaRows.find((a: any) => a.id === areaId);
            const list = Array.isArray(selectedArea?.subAreas)
                ? selectedArea.subAreas.map((sub: any) => ({ id: sub.id, name: sub.name }))
                : [];

            setSubAreas(list);

            if (list.length === 0) {
                router.replace({
                    pathname: '/entry-no-code-sector',
                    params: {
                        visitorName,
                        areaId,
                        areaName,
                    },
                });
            }
        } catch (err) {
            Alert.alert('Error', 'No se pudieron cargar los sub-sectores');
        } finally {
            setLoading(false);
        }
    };

    const handleContinue = () => {
        if (!selectedSubArea) {
            Alert.alert('Error', 'Por favor seleccione un sub-sector');
            return;
        }

        const selectedSubAreaData = subAreas.find((s) => s.id === selectedSubArea);
        if (!selectedSubAreaData) {
            Alert.alert('Error', 'Sub-sector no válido');
            return;
        }

        router.replace({
            pathname: '/entry-no-code-sector',
            params: {
                visitorName,
                areaId,
                areaName,
                subAreaId: selectedSubArea,
                subAreaName: selectedSubAreaData.name,
            },
        });
    };

    if (loading) {
        return (
            <View style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator color="#1E3A8A" size="large" />
                    <Text style={styles.loadingText}>Cargando sub-sectores...</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Text style={styles.back}>Atrás</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Entrada sin Código</Text>
                <View style={{ width: 60 }} />
            </View>

            <View style={styles.content}>
                <View style={styles.instructionContainer}>
                    <Text style={styles.instructionTitle}>Selección de Sub-sector</Text>
                    <Text style={styles.instructionSubtitle}>Área: {areaName}</Text>
                </View>

                <View style={styles.listContainer}>
                    <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
                        {subAreas.map((subArea) => (
                            <TouchableOpacity
                                key={subArea.id}
                                style={[styles.item, selectedSubArea === subArea.id && styles.itemSelected]}
                                onPress={() => setSelectedSubArea(subArea.id)}
                            >
                                <Text style={[styles.itemText, selectedSubArea === subArea.id && styles.itemTextSelected]}>
                                    {subArea.name}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                <TouchableOpacity
                    style={[styles.continueButton, !selectedSubArea && styles.disabledButton]}
                    onPress={handleContinue}
                    disabled={!selectedSubArea}
                >
                    <Text style={styles.continueButtonText}>Continuar</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    header: {
        height: 64,
        paddingHorizontal: 16,
        paddingTop: 18,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#1E3A8A',
    },
    back: { color: '#93C5FD', fontWeight: '800', width: 60, fontSize: 16 },
    headerTitle: { color: '#fff', fontWeight: '900', fontSize: 18 },
    content: { flex: 1, padding: 20 },
    instructionContainer: { alignItems: 'center', marginBottom: 20 },
    instructionTitle: { fontSize: 24, fontWeight: 'bold', color: '#1E3A8A', marginBottom: 8, textAlign: 'center' },
    instructionSubtitle: { fontSize: 16, color: '#64748B', textAlign: 'center' },
    listContainer: { flex: 1, marginBottom: 20 },
    list: { flex: 1 },
    item: {
        backgroundColor: '#F8FAFC',
        borderWidth: 2,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        minHeight: 60,
        justifyContent: 'center',
    },
    itemSelected: { backgroundColor: '#1E3A8A', borderColor: '#1E3A8A' },
    itemText: { fontSize: 16, fontWeight: '700', color: '#0F172A', textAlign: 'center' },
    itemTextSelected: { color: '#fff' },
    continueButton: {
        backgroundColor: '#1E3A8A',
        borderRadius: 12,
        padding: 18,
        alignItems: 'center',
    },
    disabledButton: { backgroundColor: '#94A3B8' },
    continueButtonText: { color: '#fff', fontWeight: '900', fontSize: 18 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: 16, fontSize: 16, color: '#64748B', fontWeight: '600' },
});

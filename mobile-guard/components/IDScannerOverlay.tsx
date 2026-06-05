import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

// Responsive design
const isSmallScreen = width < 375;
const isMediumScreen = width >= 375 && width < 414;
const isLargeScreen = width >= 414;

// Responsive dimensions
const getScanBoxWidth = () => {
  if (isSmallScreen) return 280;
  if (isMediumScreen) return 320;
  if (isLargeScreen) return 360;
  return 320;
};

const getScanBoxHeight = () => {
  if (isSmallScreen) return 180;
  if (isMediumScreen) return 200;
  if (isLargeScreen) return 220;
  return 200;
};

const getFontSize = (size: 'small' | 'medium' | 'large') => {
  const baseSizes = {
    small: { small: 12, medium: 14, large: 16 },
    medium: { small: 14, medium: 16, large: 18 },
    large: { small: 16, medium: 18, large: 20 }
  };
  
  if (isSmallScreen) return baseSizes.small[size];
  if (isMediumScreen) return baseSizes.medium[size];
  if (isLargeScreen) return baseSizes.large[size];
  return baseSizes.medium[size];
};

// ID Card standard ratio (CR80 card: 85.6mm x 53.98mm)
const SCAN_BOX_WIDTH = getScanBoxWidth();
const SCAN_BOX_HEIGHT = getScanBoxHeight();

// Calculate positions for the transparent hole
const overlayTop = (height - SCAN_BOX_HEIGHT) / 2;
const overlayLeft = (width - SCAN_BOX_WIDTH) / 2;

interface Props {
  title?: string;
  subtitle?: string;
  status?: string;
  statusType?: 'ready' | 'detecting' | 'success' | 'error';
  documentType?: 'front' | 'back';
  showScanLine?: boolean;
  showTips?: boolean;
  onCapture?: () => void;
  isCapturing?: boolean;
}

export const IDScannerOverlay: React.FC<Props> = ({
  title = 'Escanear Documento',
  subtitle = 'Coloque su documento dentro del marco',
  status = 'Alinear documento',
  statusType = 'ready',
  documentType = 'front',
  showScanLine = true,
  showTips = true,
  onCapture,
  isCapturing = false,
}) => {
  // Animated scan line
  const scanLineAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (showScanLine) {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(scanLineAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(scanLineAnim, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
      return () => animation.stop();
    }
  }, [showScanLine]);

  const scanLineTranslate = scanLineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, SCAN_BOX_HEIGHT - 4],
  });

  return (
    <View style={styles.container}>
      {/* Top Overlay */}
      <View style={[styles.overlay, styles.overlayTop]}>
        {/* Document Type Icon */}
        <View style={styles.iconContainer}>
          <Ionicons name="card-outline" size={40} color="#FFFFFF" />
        </View>

        {/* Title */}
        <Text style={[styles.title, { fontSize: getFontSize('large') }]}>{title}</Text>
        <Text style={[styles.subtitle, { fontSize: getFontSize('medium') }]}>{subtitle}</Text>

              </View>

      {/* Middle Row */}
      <View style={styles.middleRow}>
        {/* Left Overlay */}
        <View style={[styles.overlay, styles.overlaySide]} />

        {/* Transparent Scan Box with Corners */}
        <View style={styles.scanBox}>
          {/* Corner Brackets */}
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />

          {/* Scan Line Animation */}
          {showScanLine && statusType === 'ready' && (
            <Animated.View
              style={[
                styles.scanLine,
                {
                  transform: [{ translateY: scanLineTranslate }],
                },
              ]}
            />
          )}

          {/* Capture Button */}
          {statusType === 'ready' && onCapture && (
            <View style={styles.centerGuide}>
              <TouchableOpacity
                style={[styles.captureButton, isCapturing && styles.captureButtonDisabled]}
                onPress={onCapture}
                disabled={isCapturing}
              >
                <View style={styles.captureButtonInner}>
                  {isCapturing ? (
                    <Ionicons name="hourglass-outline" size={30} color="#FFFFFF" />
                  ) : (
                    <Ionicons name="camera" size={30} color="#FFFFFF" />
                  )}
                </View>
              </TouchableOpacity>
              <Text style={styles.captureHint}>
                {isCapturing ? 'Procesando...' : 'CAPTURAR'}
              </Text>
            </View>
          )}

          {/* Detecting Indicator */}
          {statusType === 'detecting' && (
            <View style={styles.detectingContainer}>
              <Ionicons name="scan-outline" size={50} color="#00FF00" />
              <Text style={styles.detectingText}>Detectando...</Text>
            </View>
          )}

          {/* Success Indicator */}
          {statusType === 'success' && (
            <View style={styles.successContainer}>
              <Ionicons name="checkmark-circle" size={60} color="#00FF00" />
            </View>
          )}
        </View>

        {/* Right Overlay */}
        <View style={[styles.overlay, styles.overlaySide]} />
      </View>

      {/* Bottom Overlay */}
      <View style={[styles.overlay, styles.overlayBottom]}>
        {/* Status Box */}
        <View
          style={[
            styles.statusBox,
            statusType === 'detecting' && styles.statusDetecting,
            statusType === 'success' && styles.statusSuccess,
            statusType === 'error' && styles.statusError,
          ]}
        >
          <Ionicons
            name={
              statusType === 'success'
                ? 'checkmark-circle'
                : statusType === 'error'
                ? 'close-circle'
                : statusType === 'detecting'
                ? 'scan'
                : 'card'
            }
            size={20}
            color="#FFFFFF"
            style={styles.statusIcon}
          />
          <Text style={styles.statusText}>{status}</Text>
        </View>

        {/* Tips Section */}
        {showTips && statusType === 'ready' && (
          <View style={styles.tipsContainer}>
            <Text style={styles.tipsTitle}>Consejos para mejores resultados:</Text>
            <View style={styles.tipRow}>
              <Ionicons name="sunny-outline" size={16} color="#AAAAAA" />
              <Text style={styles.tipText}>Asegure buena iluminación</Text>
            </View>
            <View style={styles.tipRow}>
              <Ionicons name="flashlight-outline" size={16} color="#AAAAAA" />
              <Text style={styles.tipText}>Evite reflejos y sombras</Text>
            </View>
            <View style={styles.tipRow}>
              <Ionicons name="tablet-landscape-outline" size={16} color="#AAAAAA" />
              <Text style={styles.tipText}>Mantenga el documento plano</Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },

  // Dark overlay sections
  overlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  overlayTop: {
    height: overlayTop,
    width: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 20,
  },
  overlayBottom: {
    height: overlayTop,
    width: '100%',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 25,
  },
  overlaySide: {
    width: overlayLeft,
    height: SCAN_BOX_HEIGHT,
  },

  // Middle row containing scan box
  middleRow: {
    flexDirection: 'row',
    height: SCAN_BOX_HEIGHT,
  },

  // Transparent scan box
  scanBox: {
    width: SCAN_BOX_WIDTH,
    height: SCAN_BOX_HEIGHT,
    backgroundColor: 'transparent',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderStyle: 'dashed',
  },

  // Corner bracket base style
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: '#FFFFFF',
  },

  // Individual corner positions
  cornerTL: {
    top: -2,
    left: -2,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 8,
  },
  cornerTR: {
    top: -2,
    right: -2,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 8,
  },
  cornerBL: {
    bottom: -2,
    left: -2,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 8,
  },
  cornerBR: {
    bottom: -2,
    right: -2,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 8,
  },

  // Scan line animation
  scanLine: {
    position: 'absolute',
    left: 10,
    right: 10,
    height: 2,
    backgroundColor: '#007AFF',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
  },

  // Center guide
  centerGuide: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Capture button
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0, 122, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#FFFFFF',
    marginBottom: 15,
  },
  captureButtonDisabled: {
    opacity: 0.5,
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureHint: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },

  // Detecting state
  detectingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detectingText: {
    color: '#00FF00',
    fontSize: 14,
    marginTop: 8,
    fontWeight: '600',
  },

  // Success state
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 255, 0, 0.1)',
  },

  // Icon container
  iconContainer: {
    marginBottom: 15,
  },

  // Text styles
  title: {
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
    fontSize: 24, // Will be overridden by responsive style
  },
  subtitle: {
    color: '#CCCCCC',
    textAlign: 'center',
    fontSize: 14, // Will be overridden by responsive style
  },

  // Document side indicator
  sideIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  sideDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: 10,
  },
  sideDotActive: {
    backgroundColor: '#007AFF',
  },
  sideText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },

  // Status box
  statusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 25,
    minWidth: 200,
    justifyContent: 'center',
  },
  statusDetecting: {
    backgroundColor: 'rgba(0, 122, 255, 0.4)',
  },
  statusSuccess: {
    backgroundColor: 'rgba(0, 200, 0, 0.4)',
  },
  statusError: {
    backgroundColor: 'rgba(255, 59, 48, 0.4)',
  },
  statusIcon: {
    marginRight: 10,
  },
  statusText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },

  // Tips section
  tipsContainer: {
    marginTop: 25,
    alignItems: 'center',
  },
  tipsTitle: {
    color: '#AAAAAA',
    fontSize: 12,
    marginBottom: 12,
    fontWeight: '600',
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  tipText: {
    color: '#888888',
    fontSize: 12,
    marginLeft: 8,
  },
});

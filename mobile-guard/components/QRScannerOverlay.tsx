import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

// Responsive design
const isSmallScreen = width < 375;
const isMediumScreen = width >= 375 && width < 414;
const isLargeScreen = width >= 414;

// Responsive dimensions
const getScanBoxSize = () => {
  if (isSmallScreen) return 240;
  if (isMediumScreen) return 280;
  if (isLargeScreen) return 320;
  return 280;
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

// QR Code scanning box size
const SCAN_BOX_SIZE = getScanBoxSize();

// Calculate positions for the transparent hole
const overlayTop = (height - SCAN_BOX_SIZE) / 2;
const overlayLeft = (width - SCAN_BOX_SIZE) / 2;

interface Props {
  title?: string;
  subtitle?: string;
  status?: string;
  statusType?: 'ready' | 'success' | 'error';
}

export const QRScannerOverlay: React.FC<Props> = ({
  title = 'Scan QR Code',
  subtitle = 'Align QR code within the frame',
  status = 'Ready to scan',
  statusType = 'ready',
}) => {
  return (
    <View style={styles.container}>
      {/* Top Overlay */}
      <View style={[styles.overlay, styles.overlayTop]}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
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
        </View>

        {/* Right Overlay */}
        <View style={[styles.overlay, styles.overlaySide]} />
      </View>

      {/* Bottom Overlay */}
      <View style={[styles.overlay, styles.overlayBottom]}>
        <View
          style={[
            styles.statusBox,
            statusType === 'success' && styles.statusSuccess,
            statusType === 'error' && styles.statusError,
          ]}
        >
          <Text style={styles.statusText}>{status}</Text>
        </View>
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
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  overlayTop: {
    height: overlayTop,
    width: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 30,
  },
  overlayBottom: {
    height: overlayTop,
    width: '100%',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 30,
  },
  overlaySide: {
    width: overlayLeft,
    height: SCAN_BOX_SIZE,
  },

  // Middle row containing scan box
  middleRow: {
    flexDirection: 'row',
    height: SCAN_BOX_SIZE,
  },

  // Transparent scan box
  scanBox: {
    width: SCAN_BOX_SIZE,
    height: SCAN_BOX_SIZE,
    backgroundColor: 'transparent',
    position: 'relative',
  },

  // Corner bracket base style
  corner: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderColor: '#00FF00',
  },

  // Individual corner positions
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },

  // Text styles
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#CCCCCC',
  },

  // Status box
  statusBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
    minWidth: 200,
    alignItems: 'center',
  },
  statusSuccess: {
    backgroundColor: 'rgba(0, 200, 0, 0.4)',
  },
  statusError: {
    backgroundColor: 'rgba(255, 0, 0, 0.4)',
  },
  statusText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
    textAlign: 'center',
  },
});

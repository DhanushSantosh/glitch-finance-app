import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Pressable, Text, View } from "react-native";
import { createStyles, theme } from "../../theme";
import { subscribeToToasts, ToastMessage } from "./toastBus";

type ToastViewportProps = {
  bottomOffset?: number;
};

export const ToastViewport = ({ bottomOffset = 28 }: ToastViewportProps) => {
  const [activeToast, setActiveToast] = useState<ToastMessage | null>(null);
  const activeToastRef = useRef<ToastMessage | null>(null);
  const queueRef = useRef<ToastMessage[]>([]);
  const autoDismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDismissingRef = useRef(false);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(14)).current;

  useEffect(() => {
    activeToastRef.current = activeToast;
  }, [activeToast]);

  useEffect(() => {
    const unsubscribe = subscribeToToasts((toast) => {
      if (!activeToastRef.current) {
        setActiveToast(toast);
        return;
      }

      queueRef.current = [...queueRef.current, toast];
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const dismissToast = () => {
    if (!activeToastRef.current || isDismissingRef.current) {
      return;
    }

    isDismissingRef.current = true;

    if (autoDismissTimerRef.current) {
      clearTimeout(autoDismissTimerRef.current);
      autoDismissTimerRef.current = null;
    }

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: 140,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      }),
      Animated.timing(translateY, {
        toValue: 10,
        duration: 140,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      })
    ]).start(() => {
      isDismissingRef.current = false;

      if (queueRef.current.length === 0) {
        setActiveToast(null);
        return;
      }

      const [nextToast, ...rest] = queueRef.current;
      queueRef.current = rest;
      setActiveToast(nextToast);
    });
  };

  useEffect(() => {
    if (!activeToast) {
      return undefined;
    }

    opacity.setValue(0);
    translateY.setValue(14);
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 170,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 170,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      })
    ]).start();

    const durationMs = activeToast.durationMs ?? 3000;
    autoDismissTimerRef.current = setTimeout(() => {
      dismissToast();
    }, durationMs);

    return () => {
      if (autoDismissTimerRef.current) {
        clearTimeout(autoDismissTimerRef.current);
        autoDismissTimerRef.current = null;
      }
    };
  }, [activeToast]);

  useEffect(
    () => () => {
      if (autoDismissTimerRef.current) {
        clearTimeout(autoDismissTimerRef.current);
        autoDismissTimerRef.current = null;
      }
    },
    []
  );

  if (!activeToast) {
    return null;
  }

  return (
    <View pointerEvents="box-none" style={[styles.overlay, { bottom: bottomOffset }]}>
      <Animated.View
        style={{
          opacity,
          transform: [{ translateY }]
        }}
      >
        <Pressable
          accessibilityRole="alert"
          accessibilityLabel={activeToast.title ? `${activeToast.title}. ${activeToast.message}` : activeToast.message}
          onPress={dismissToast}
          style={[
            styles.toastBase,
            activeToast.tone === "success" ? styles.successToast : null,
            activeToast.tone === "warn" ? styles.warnToast : null,
            activeToast.tone === "error" ? styles.errorToast : null
          ]}
        >
          {activeToast.title ? <Text style={styles.toastTitle}>{activeToast.title}</Text> : null}
          <Text style={styles.toastMessage}>{activeToast.message}</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
};

const styles = createStyles(() => ({
  overlay: {
    position: "absolute",
    left: theme.spacing.lg,
    right: theme.spacing.lg,
    bottom: theme.spacing.lg,
    zIndex: 2000
  },
  toastBase: {
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.color.borderStrong,
    backgroundColor: theme.color.bgElevated,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.xs,
    ...theme.elevation.card
  },
  successToast: {
    borderColor: theme.color.statusSuccess
  },
  warnToast: {
    borderColor: theme.color.statusWarn
  },
  errorToast: {
    borderColor: theme.color.statusError
  },
  toastTitle: {
    color: theme.color.textPrimary,
    fontSize: theme.typography.bodySmall,
    fontWeight: "800",
    letterSpacing: 0.4
  },
  toastMessage: {
    color: theme.color.textSecondary,
    fontSize: theme.typography.bodySmall,
    fontWeight: "600"
  }
}));

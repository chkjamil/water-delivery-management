// Client-only helper — best-effort GPS capture for delivery proof. Never
// throws and never blocks the caller: resolves to null on denial, timeout,
// or an unsupported browser, so completing a delivery is never gated on
// location succeeding (see completeStop()/markDelivered()'s "audit trail,
// not a hard block" design).

export interface CapturedLocation {
  lat: number;
  lng: number;
  accuracy: number;
}

export function captureLocation(timeoutMs = 8000): Promise<CapturedLocation | null> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      resolve(null);
      return;
    }
    const timer = setTimeout(() => resolve(null), timeoutMs);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(timer);
        resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy });
      },
      () => {
        clearTimeout(timer);
        resolve(null);
      },
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 0 }
    );
  });
}

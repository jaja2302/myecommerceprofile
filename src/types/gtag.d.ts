interface Window {
  gtag?: (
    command: string,
    action: string,
    params?: {
      [key: string]: string | number | boolean | null | undefined | Record<string, unknown>;
    }
  ) => void;
} 
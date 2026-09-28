import { WebviewMessage } from '../types';

interface VsCodeApi {
  postMessage(message: unknown): void;
  getState(): unknown;
  setState(state: unknown): void;
}

declare function acquireVsCodeApi(): VsCodeApi;

let vscodeInstance: VsCodeApi | null = null;

export function getVsCodeApi(): VsCodeApi {
  if (!vscodeInstance) {
    try {
      vscodeInstance = acquireVsCodeApi();
    } catch {
      // Fallback for standalone browser development preview
      vscodeInstance = {
        postMessage: (msg: unknown) => {
          console.warn('[VSCode Mock] postMessage:', msg);
        },
        getState: () => ({}),
        setState: (state: unknown) => {
          console.warn('[VSCode Mock] setState:', state);
        },
      };
    }
  }
  return vscodeInstance;
}

export function postToExtension(message: WebviewMessage): void {
  const api = getVsCodeApi();
  api.postMessage(message);
}

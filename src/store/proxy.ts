import { create } from "zustand";
import { Proxy, ProxyTesterOptions, TestStatus } from "@/types";

type ProxyTesterState = {
  loadedProxies: Proxy[];
  testedProxies: Proxy[];
  isLoading: boolean;
  options: ProxyTesterOptions;
  testStatus: TestStatus;
  abortController: AbortController | null;
};

type ProxyTesterActions = {
  replaceAllProxies: (proxies: Proxy[]) => void;
  clearAll: () => void;
  setOptions: (option: Partial<ProxyTesterOptions>) => void;
  setTestStatus: (status: TestStatus) => void;
  removeTestedProxy: (proxy: Proxy) => void;

  // New test lifecycle actions
  prepareForTest: (controller: AbortController) => void;
  stopTest: () => void;
  addTestResult: (result: Proxy) => void;
  finalizeTest: () => void;
  
  // Pro Mode actions
  testProxyProMode: (proxy: string) => Promise<any>;
  testProxiesProModeBatch: (proxies: string[], onProgress?: (result: any) => void) => Promise<any[]>;
};

const initialState: ProxyTesterState = {
  loadedProxies: [],
  testedProxies: [],
  isLoading: false,
  options: {
    ipLookup: false,
    latencyCheck: true,
    targetUrl: "https://www.google.com",
    proMode: false,
  },
  testStatus: "idle",
  abortController: null,
};

export const useProxyTesterStore = create<
  ProxyTesterState & ProxyTesterActions
>()((set, get) => ({
  ...initialState,

  replaceAllProxies: (proxies) => set({ loadedProxies: proxies }),
  setTestStatus: (status) => set({ testStatus: status }),
  clearAll: () =>
    set({
      testedProxies: [],
      loadedProxies: [],
      isLoading: false,
    }),

  stopTest: () => {
    const { abortController, testStatus } = get();
    if (abortController && testStatus === "testing") {
      abortController.abort();
      set({ testStatus: "stopping", abortController: null });
    }
  },

  setOptions: (newOptions: Partial<ProxyTesterOptions>) =>
    set((state) => ({
      options: {
        ...state.options,
        ...newOptions,
      },
    })),

  prepareForTest: (controller: AbortController) => {
    set({
      testStatus: "testing",
      testedProxies: [],
      abortController: controller,
    });
  },

  removeTestedProxy: (proxy) =>
    set((state) => ({
      testedProxies: state.testedProxies.filter((p) => p.raw !== proxy.raw),
      loadedProxies: state.loadedProxies.filter((p) => p.raw !== proxy.raw),
    })),

  addTestResult: (result) =>
    set((state) => {
      // Check if this proxy already exists in testedProxies
      const existingIndex = state.testedProxies.findIndex(p => p.raw === result.raw);
      
      if (existingIndex >= 0) {
        // Update existing proxy
        const updatedProxies = [...state.testedProxies];
        updatedProxies[existingIndex] = result;
        return { testedProxies: updatedProxies };
      } else {
        // Add new proxy
        return { testedProxies: [...state.testedProxies, result] };
      }
    }),

  finalizeTest: () => set({ isLoading: false, testStatus: "finished" }),

  // Pro Mode specific actions
  testProxyProMode: async (proxy: string) => {
    const state = get();
    if (!state.options.proMode) {
      throw new Error("Pro Mode is not enabled");
    }

    try {
      const response = await fetch("/api/test-proxy-pro", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          proxy,
          options: state.options,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error("Pro Mode test failed:", error);
      throw error;
    }
  },

  testProxiesProModeBatch: async (proxies: string[], onProgress?: (result: any) => void) => {
    const state = get();
    if (!state.options.proMode) {
      throw new Error("Pro Mode is not enabled");
    }

    const response = await fetch("/api/test-proxies-pro-batch", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        proxies,
        options: state.options,
        concurrencyLimit: 10, // Default concurrency
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("No response body reader available");
    }

    const decoder = new TextDecoder();
    const results: any[] = [];

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              results.push(data);
              if (onProgress) {
                onProgress(data);
              }
            } catch (e) {
              console.warn("Failed to parse SSE data:", line);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    return results;
  },
}));

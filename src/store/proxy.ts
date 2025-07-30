import { create } from "zustand";
import { ProModeOptions, Proxy, ProxyTesterOptions, TestStatus } from "@/types";

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
};

const initialState: ProxyTesterState = {
  loadedProxies: [],
  testedProxies: [],
  isLoading: false,
  options: {
    activeMode: "simple",
    simpleMode: {
      ipLookup: true,
      latencyCheck: true,
    },
    targetUrl: "https://www.google.com",
    proMode: {
      connectionsPerProxy: 3,
      testAllConnections: false,
      detailedMetrics: false,
      connectionPooling: true,
      retryCount: 3,
      customTimeout: 15000,
    },
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
      testStatus: "idle",
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
      const existingIndex = state.testedProxies.findIndex(
        (p) => p.raw === result.raw
      );

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
}));

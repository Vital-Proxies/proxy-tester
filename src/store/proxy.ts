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
};

const initialState: ProxyTesterState = {
  loadedProxies: [],
  testedProxies: [],
  isLoading: false,
  options: {
    ipLookup: false,
    latencyCheck: true,
    targetUrl: "https://www.google.com",
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
    set((state) => ({
      testedProxies: [...state.testedProxies, result],
    })),

  finalizeTest: () => set({ isLoading: false, testStatus: "finished" }),
}));

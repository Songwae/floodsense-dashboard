/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Base URL of the real FloodSense backend, e.g. https://api.floodsense.gh/v1
   * Leave unset to run the dashboard on generated demo data.
   */
  readonly VITE_API_BASE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}


/// <reference types="node" />
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
// import process from 'process'; // Removed this line

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, (process as NodeJS.Process).cwd(), '');

  return {
    plugins: [react()],
    define: {
      // Expose environment variables to your client-side code
      // Make sure to stringify them for correct replacement.
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
      // You can add other process.env variables you want to expose here, for example:
      // 'process.env.SOME_OTHER_VARIABLE': JSON.stringify(env.SOME_OTHER_VARIABLE),
    },
    server: {
      port: 3000, // Optional: you can define a specific port
      open: true    // Optional: automatically open the app in the browser
    }
  };
});

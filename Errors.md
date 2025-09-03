[17:44:24.515] Running build in Washington, D.C., USA (East) – iad1
[17:44:24.516] Build machine configuration: 2 cores, 8 GB
[17:44:24.540] Cloning github.com/korcevoy1994/voievod-supabase (Branch: main, Commit: 9278fdc)
[17:44:25.153] Cloning completed: 613.000ms
[17:44:26.963] Restored build cache from previous deployment (HxKnrbr5J8VJMndenFU3cxP6ANiP)
[17:44:27.634] Running "vercel build"
[17:44:28.057] Vercel CLI 46.1.1
[17:44:28.579] Running "install" command: `npm install`...
[17:44:35.994] 
[17:44:35.995] added 38 packages, and audited 501 packages in 7s
[17:44:35.996] 
[17:44:35.996] 159 packages are looking for funding
[17:44:35.997]   run `npm fund` for details
[17:44:36.020] 
[17:44:36.021] 2 vulnerabilities (1 moderate, 1 high)
[17:44:36.021] 
[17:44:36.022] To address all issues, run:
[17:44:36.022]   npm audit fix
[17:44:36.022] 
[17:44:36.022] Run `npm audit` for details.
[17:44:36.061] Detected Next.js version: 15.4.5
[17:44:36.062] Running "npm run build"
[17:44:36.185] 
[17:44:36.186] > voev@0.1.0 build
[17:44:36.186] > next build
[17:44:36.186] 
[17:44:37.209]  ⚠ Invalid next.config.ts options detected: 
[17:44:37.210]  ⚠     Unrecognized key(s) in object: 'swcMinify'
[17:44:37.210]  ⚠ See more info here: https://nextjs.org/docs/messages/invalid-next-config
[17:44:37.317]    ▲ Next.js 15.4.5
[17:44:37.318]    - Experiments (use with caution):
[17:44:37.319]      ✓ optimizeCss
[17:44:37.319]      · optimizePackageImports
[17:44:37.320] 
[17:44:37.426]    Creating an optimized production build ...
[17:44:42.150] 
[17:44:42.153] 
[17:44:42.153] Retrying 1/3...
[17:44:42.159] 
[17:44:42.159] 
[17:44:42.159] Retrying 1/3...
[17:44:42.163] 
[17:44:42.163] 
[17:44:42.163] Retrying 1/3...
[17:44:42.164] 
[17:44:42.164] 
[17:44:42.164] Retrying 1/3...
[17:44:42.166] 
[17:44:42.166] 
[17:44:42.166] Retrying 1/3...
[17:44:42.166] 
[17:44:42.166] 
[17:44:42.166] Retrying 1/3...
[17:44:42.167] 
[17:44:42.167] 
[17:44:42.167] Retrying 1/3...
[17:44:59.889] <w> [webpack.cache.PackFileCacheStrategy] Serializing big strings (108kiB) impacts deserialization performance (consider using Buffer instead and decode when needed)
[17:45:00.124]  ⚠ Compiled with warnings in 2000ms
[17:45:00.127] 
[17:45:00.127] ./node_modules/@supabase/supabase-js/dist/module/index.js
[17:45:00.127] A Node.js API is used (process.version at line: 17) which is not supported in the Edge Runtime.
[17:45:00.127] Learn more: https://nextjs.org/docs/api-reference/edge-runtime
[17:45:00.127] 
[17:45:00.127] Import trace for requested module:
[17:45:00.128] ./node_modules/@supabase/supabase-js/dist/module/index.js
[17:45:00.128] ./node_modules/@supabase/ssr/dist/module/createServerClient.js
[17:45:00.128] __barrel_optimize__?names=createServerClient!=!./node_modules/@supabase/ssr/dist/module/index.js
[17:45:00.128] 
[17:45:00.128] ./node_modules/@supabase/supabase-js/dist/module/index.js
[17:45:00.128] A Node.js API is used (process.version at line: 18) which is not supported in the Edge Runtime.
[17:45:00.128] Learn more: https://nextjs.org/docs/api-reference/edge-runtime
[17:45:00.128] 
[17:45:00.128] Import trace for requested module:
[17:45:00.128] ./node_modules/@supabase/supabase-js/dist/module/index.js
[17:45:00.128] ./node_modules/@supabase/ssr/dist/module/createServerClient.js
[17:45:00.128] __barrel_optimize__?names=createServerClient!=!./node_modules/@supabase/ssr/dist/module/index.js
[17:45:00.128] 
[17:45:00.128] ./node_modules/@supabase/supabase-js/dist/module/index.js
[17:45:00.129] A Node.js API is used (process.version at line: 21) which is not supported in the Edge Runtime.
[17:45:00.129] Learn more: https://nextjs.org/docs/api-reference/edge-runtime
[17:45:00.129] 
[17:45:00.129] Import trace for requested module:
[17:45:00.129] ./node_modules/@supabase/supabase-js/dist/module/index.js
[17:45:00.129] ./node_modules/@supabase/ssr/dist/module/createServerClient.js
[17:45:00.129] __barrel_optimize__?names=createServerClient!=!./node_modules/@supabase/ssr/dist/module/index.js
[17:45:00.134] 
[17:45:12.677]  ✓ Compiled successfully in 31.0s
[17:45:12.682]    Skipping validation of types
[17:45:12.682]    Skipping linting
[17:45:12.950]    Collecting page data ...
[17:45:17.548]    Generating static pages (0/43) ...
[17:45:18.045] Error occurred prerendering page "/404". Read more: https://nextjs.org/docs/messages/prerender-error
[17:45:18.046] [Error: Cannot find module 'critters'
[17:45:18.049] Require stack:
[17:45:18.049] - /vercel/path0/node_modules/next/dist/compiled/next-server/pages.runtime.prod.js
[17:45:18.050] - /vercel/path0/.next/server/pages/_document.js
[17:45:18.050] - /vercel/path0/node_modules/next/dist/server/require.js
[17:45:18.050] - /vercel/path0/node_modules/next/dist/server/load-components.js
[17:45:18.050] - /vercel/path0/node_modules/next/dist/build/utils.js
[17:45:18.051] - /vercel/path0/node_modules/next/dist/build/worker.js
[17:45:18.051] - /vercel/path0/node_modules/next/dist/compiled/jest-worker/processChild.js] {
[17:45:18.051]   code: 'MODULE_NOT_FOUND',
[17:45:18.051]   requireStack: [Array]
[17:45:18.051] }
[17:45:18.052] Export encountered an error on /_error: /404, exiting the build.
[17:45:18.082]  ⨯ Next.js build worker exited with code: 1 and signal: null
[17:45:18.118] Error: Command "npm run build" exited with 1
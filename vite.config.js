import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const appIndex = fileURLToPath(new URL("./apps/web/index.html", import.meta.url));
const heatmapCssPath = fileURLToPath(new URL("./apps/web/styles/heatmap.css", import.meta.url));

function yttSingleFileExportSanitizer() {
  const legacyFramePattern = /<iframe([^>]*?)\sdata-src="legacy\/([^"]+)"([^>]*)><\/iframe>/g;

  return {
    name: "ytt-single-file-export-sanitizer",
    enforce: "post",
    transformIndexHtml(html) {
      const heatmapCss = readFileSync(heatmapCssPath, "utf8");
      return html
        .replace(/\s*<link\s+rel="stylesheet"\s+href="styles\/heatmap\.css"\s*>\s*/i, "\n")
        .replace("</style>", `\n\n/* === Production Heatmap Module CSS === */\n${heatmapCss}\n  </style>`)
        .replace(legacyFramePattern, (_match, before, fileName, after) => {
          const safeName = fileName.replace(/</g, "&lt;").replace(/>/g, "&gt;");
          const srcdoc = [
            "<!doctype html><html><head><meta charset='utf-8'>",
            "<style>body{margin:0;background:#05070c;color:#c9a86a;font:14px system-ui;padding:24px;line-height:1.6}",
            "strong{color:#f5d978}</style></head><body>",
            `<strong>Legacy prototype preserved in repo:</strong><br>${safeName}<br><br>`,
            "This single-file production export excludes legacy iframe HTML so production views do not depend on local files or inherit prototype/mock financial values.",
            "</body></html>"
          ].join("");
          return `<iframe${before}${after} srcdoc="${srcdoc.replace(/&/g, "&amp;").replace(/"/g, "&quot;")}"></iframe>`;
        })
        .replace(/\s(?:href|src|data-src)=["'](?:[A-Za-z]:[\\/]|file:\/\/\/)[^"']*["']/g, "");
    },
  };
}

export default defineConfig({
  root: "apps/web",
  publicDir: false,
  plugins: [
    yttSingleFileExportSanitizer(),
    viteSingleFile(),
  ],
  build: {
    outDir: "../../dist",
    emptyOutDir: true,
    rollupOptions: {
      input: appIndex,
      external: [/^https:\/\/s3\.tradingview\.com\/tv\.js$/],
    },
    cssCodeSplit: false,
    assetsInlineLimit: 100000000,
  },
});

import * as fs from 'fs';
import * as path from 'path';

export const loadWebView = () => {
  let counterHtml = fs
    .readFileSync(path.join(__dirname, 'web', 'diagram.html'))
    .toString();
  const mermaidScript = fs
    .readFileSync(path.join(__dirname, 'web', 'mermaid.min.js'))
    .toString();

  counterHtml = counterHtml.replace(
    '<!-- SCRIPT PLACEHOLDER -->',
    `<script> ${mermaidScript}</script>`
  );

  return counterHtml;
};

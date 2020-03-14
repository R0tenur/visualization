import * as fs from 'fs';
import * as path from 'path';

export const loadWebView = () => fs
  .readFileSync(path.join(__dirname, 'index.html'))
  .toString();

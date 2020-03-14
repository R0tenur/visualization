const fs = require('fs');
const path = require('path');

const jsPath = 'build/static/js';
const cssPath = 'build/static/css';

const fileContains =  (files, name) => {
    const fileName = files.find(f => f.includes(name) && !f.includes('-' + name));
    return fs.readFileSync(path.join(jsPath, fileName)).toString();
}

const buildWebView = () => {
    const jsFiles = fs.readdirSync(jsPath).filter(file => file.endsWith('.js'));

    const runtime = fileContains(jsFiles, 'runtime-main');
    const main =  fileContains(jsFiles, 'main');
    const two = fileContains(jsFiles, '2.');

    const styleFile = fs.readdirSync(cssPath).find(file => file.endsWith('.css'));
    const style = fs.readFileSync(path.join(cssPath, styleFile)).toString();

    let html = fs.readFileSync('./ui.html').toString();

    html = html.replace(
        '<!-- SCRIPT PLACEHOLDER -->',
        `
        <script>${runtime}</script>
        <script>${main}</script>
        <script>${two}</script>
        <style>${style}</style>
        `
    );

    fs.writeFileSync('../backend/out/index.html', html);
};

buildWebView()
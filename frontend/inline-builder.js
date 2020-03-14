const fs = require('fs');
const path = require('path');

const jsPath = 'build/static/js';


const fileContains =  (files, name) => {
    const fileName = files.find(f => f.includes(name) && !f.includes('-' + name));
    return fs.readFileSync(path.join(jsPath, fileName)).toString();
}

const buildWebView = () => {
    const files = fs.readdirSync(jsPath).filter(file => file.endsWith('.js'));

    const runtime = fileContains(files, 'runtime-main');
    const main =  fileContains(files, 'main');
    const two = fileContains(files, '2.');

    let html = fs.readFileSync('./ui.html').toString();

    html = html.replace(
        '<!-- SCRIPT PLACEHOLDER -->',
        `<script> ${runtime}</script>
        <script> ${main}</script>
        <script> ${two}</script>
        `
    );

    fs.writeFileSync('../backend/out/index.html', html);
};

buildWebView()
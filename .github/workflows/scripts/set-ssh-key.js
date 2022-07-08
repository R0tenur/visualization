const fs = require('fs').promises;
const path = require('path');

(async () => {
    const home = process.env['HOME'];
    const key = process.env['ACTION-SSH-KEY'];
    if (!home) {
        throw Error(`${homeEnv} is not defined`);
    }

    const dirName = path.resolve(home, ".ssh");

    const p = await fs.mkdir(dirName, {
        recursive: true,
        mode: 0o700,
    });

    await fs.writeFile(path.resolve(p, 'id_rsa'), key)

    console.log('done!');
})();



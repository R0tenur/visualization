const fs = require('fs').promises;
const openFileToObjext = async (fileName) => JSON.parse(await fs.readFile(fileName, 'utf-8'));
const findVisualizationItem = (extensionsGallery) => extensionsGallery.results[0].extensions.find(x => x.extensionId === '62');


const updateVersion = async (filename, newVersion) => {
    const extensionsGallery = await openFileToObjext(filename);
    const visualizationItem = findVisualizationItem(extensionsGallery);
    delete visualizationItem.versions[0].version;
    visualizationItem.versions[0] = {
        ...{ version: newVersion }, ...visualizationItem.versions[0]
    };

    await fs.writeFile(filename, JSON.stringify(extensionsGallery, null, '\t'));
}


(async () => {
    const packageJson = await openFileToObjext('../package.json');
    const version = packageJson.version;

    await updateVersion('./extensionsGallery.json', version);
    await updateVersion('./extensionsGallery-insider.json', version);

    console.log('done!');
})();



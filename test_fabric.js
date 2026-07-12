import fs from 'fs';
import path from 'path';
import https from 'https';

const mcVer = '1.20.1';
const loaderVer = '0.15.7';
const dir = path.join('./.minecraft/versions', `fabric-loader-${loaderVer}-${mcVer}`);
fs.mkdirSync(dir, { recursive: true });

https.get(`https://meta.fabricmc.net/v2/versions/loader/${mcVer}/${loaderVer}/profile/json`, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        fs.writeFileSync(path.join(dir, `fabric-loader-${loaderVer}-${mcVer}.json`), data);
        console.log('Fabric profile downloaded!');
    });
});

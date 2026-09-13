const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = path.resolve(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            if (!file.includes('node_modules')) {
                results = results.concat(walk(file));
            }
        } else {
            if (file.endsWith('.tsx')) {
                const content = fs.readFileSync(file, 'utf8');
                if (content.includes('alt=""') || content.includes('alt="image"') || content.includes('alt="img"')) {
                    results.push(file);
                }
            }
        }
    });
    return results;
}

console.log(walk('c:/projects/warren-connect/src'));

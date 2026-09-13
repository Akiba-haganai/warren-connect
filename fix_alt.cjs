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
                let content = fs.readFileSync(file, 'utf8');
                let originalContent = content;
                content = content.replace(/alt=""/g, 'alt="Descriptive image"');
                content = content.replace(/alt="image"/g, 'alt="Descriptive image"');
                content = content.replace(/alt="img"/g, 'alt="Descriptive image"');
                if (content !== originalContent) {
                    fs.writeFileSync(file, content, 'utf8');
                    results.push(file);
                }
            }
        }
    });
    return results;
}

const files = walk('c:/projects/warren-connect/src');
fs.writeFileSync('c:/projects/warren-connect/grep_alt.json', JSON.stringify(files));

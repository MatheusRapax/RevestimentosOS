const fs = require('fs');
const path = require('path');

const changelogPath = path.join(__dirname, '../CHANGELOG.md');
const outputPath = path.join(__dirname, '../src/data/latest-release.json');
const packagePath = path.join(__dirname, '../package.json');

const packageJson = require(packagePath);
const version = packageJson.version;

if (!fs.existsSync(changelogPath)) {
    console.warn('CHANGELOG.md not found.');
    return;
}

const changelog = fs.readFileSync(changelogPath, 'utf8');

// A regex to capture everything under the current version header
// Example match: "### [1.1.0] ... " until the next version header
const headerRegexStr = `(?:^|\\n)##?#? \\[?(?:v)?${version.replace(/\./g, '\\.')}\\]?[^\\n]*\\n([\\s\\S]*?)(?=\\n##?#? \\[?\\d|$)`;
const regex = new RegExp(headerRegexStr);
const match = changelog.match(regex);

let content = '';
if (match && match[1]) {
    content = match[1].trim();
} else {
    // If we can't find the exact segment, let's just get everything up to the next version header
    const fallbackRegex = /(?:^|\n)##?#?.*?\n([\s\S]*?)(?=\n##?#? \[\d|$)/;
    const fallbackMatch = changelog.match(fallbackRegex);
    content = fallbackMatch && fallbackMatch[1] ? fallbackMatch[1].trim() : 'Nenhuma nota de versão disponível.';
}

const outputData = {
    version,
    content
};

const dataDir = path.dirname(outputPath);
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2));
console.log(`Synced latest release notes for v${version} to src/data/latest-release.json`);

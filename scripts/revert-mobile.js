const fs = require('fs');
const path = require('path');

function processHtmlFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let originalValue = content;

    // Remove stylesheets
    content = content.replace(/<link[^>]*href="[^"]*mobile\.css"[^>]*>/g, '');
    content = content.replace(/<link[^>]*href="[^"]*mobile-jobs\.css"[^>]*>/g, '');
    content = content.replace(/<link[^>]*href="[^"]*mobile-fixes\.css"[^>]*>/g, '');

    // Remove scripts
    content = content.replace(/<script[^>]*src="[^"]*mobile-global-nav\.js"[^>]*><\/script>/g, '');
    content = content.replace(/<script[^>]*src="[^"]*mobile-fixes\.js"[^>]*><\/script>/g, '');

    // Remove mobile root block 1 (if exists)
    content = content.replace(/<div id="mobile-root"[^>]*>\s*<\/div>/g, '');

    // Remove mobile root block 2 (if exists)
    content = content.replace(/<div id="mobile-dashboard-root"[^>]*>\s*<\/div>/g, '');

    // Unwrap <div class="desktop-only"> and its trailing comment <!-- END desktop-only -->
    // Since there can be multiple or nested ones, we'll replace the starting tag and ending tag/comment
    content = content.replace(/<div class="desktop-only">/g, '');
    content = content.replace(/<\/div>\s*<!-- END desktop-only -->/g, '');

    if (content !== originalValue) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log("Cleaned: " + filePath);
    }
}

function traverseDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            if (!fullPath.includes('node_modules') && !fullPath.includes('.git') && !fullPath.includes('.vscode')) {
                traverseDir(fullPath);
            }
        } else if (fullPath.endsWith('.html')) {
            processHtmlFile(fullPath);
        }
    }
}

const rootDir = 'C:\\Users\\Dhanush\\OneDrive\\Desktop\\hlpu';
traverseDir(rootDir);
console.log("Done");

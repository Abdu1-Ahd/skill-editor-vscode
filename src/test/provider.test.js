const assert = require('assert');
const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

// MOCK VSCODE
const vscodeMock = {
    EventEmitter: class {
        constructor() { this.event = () => {}; }
        fire() {}
    },
    Disposable: class { constructor(cb) { this.cb = cb; } },
    FileType: { Unknown: 0, File: 1, Directory: 2, SymbolicLink: 64 },
    FileChangeType: { Changed: 1, Created: 2, Deleted: 3 },
    FileSystemError: {
        FileNotFound: (uri) => new Error(`FileNotFound: ${uri}`),
        FileExists: (uri) => new Error(`FileExists: ${uri}`)
    }
};

const Module = require('module');
const originalRequire = Module.prototype.require;
Module.prototype.require = function(arg) {
    if (arg === 'vscode') return vscodeMock;
    return originalRequire.apply(this, arguments);
};

const { SkillFileSystemProvider } = require('../../out/skill-fs-provider.js');

async function runTests() {
    console.log("Starting tests for SkillFileSystemProvider...");
    const provider = new SkillFileSystemProvider();
    const testZipPath = path.join(__dirname, 'test.skill');

    // Setup: Create a test zip
    if (fs.existsSync(testZipPath)) fs.unlinkSync(testZipPath);
    const zip = new AdmZip();
    zip.addFile("SKILL.md", Buffer.from("# Test Skill"));
    zip.addFile("src/index.js", Buffer.from("console.log('hello');"));
    zip.writeZip(testZipPath);

    const mockUri = (internalPath) => ({
        authority: testZipPath,
        path: internalPath
    });

    try {
        // Test 1: stat root
        let stat = provider.stat(mockUri('/'));
        assert.strictEqual(stat.type, vscodeMock.FileType.Directory);
        console.log("✅ stat root directory works.");

        // Test 2: stat file
        stat = provider.stat(mockUri('/SKILL.md'));
        assert.strictEqual(stat.type, vscodeMock.FileType.File);
        assert.strictEqual(stat.size, 12);
        console.log("✅ stat existing file works.");

        // Test 3: readDirectory
        let entries = provider.readDirectory(mockUri('/'));
        assert.strictEqual(entries.length, 2); // SKILL.md and src
        let hasSrc = entries.some(e => e[0] === 'src' && e[1] === vscodeMock.FileType.Directory);
        assert.ok(hasSrc);
        console.log("✅ readDirectory works.");

        // Test 4: readFile
        let content = provider.readFile(mockUri('/SKILL.md'));
        assert.strictEqual(Buffer.from(content).toString(), "# Test Skill");
        console.log("✅ readFile works.");

        // Test 5: writeFile (create)
        provider.writeFile(mockUri('/new.txt'), Buffer.from("New File"), { create: true, overwrite: false });
        content = provider.readFile(mockUri('/new.txt'));
        assert.strictEqual(Buffer.from(content).toString(), "New File");
        console.log("✅ writeFile (create) works.");

        // Test 6: writeFile (overwrite)
        provider.writeFile(mockUri('/new.txt'), Buffer.from("Updated File"), { create: false, overwrite: true });
        content = provider.readFile(mockUri('/new.txt'));
        assert.strictEqual(Buffer.from(content).toString(), "Updated File");
        console.log("✅ writeFile (overwrite) works.");

        // Test 7: rename
        provider.rename(mockUri('/new.txt'), mockUri('/renamed.txt'), { overwrite: false });
        try {
            provider.readFile(mockUri('/new.txt'));
            assert.fail("Should have thrown FileNotFound");
        } catch (e) {
            assert.ok(e.message.includes('FileNotFound'));
        }
        content = provider.readFile(mockUri('/renamed.txt'));
        assert.strictEqual(Buffer.from(content).toString(), "Updated File");
        console.log("✅ rename works.");

        // Test 8: delete
        provider.delete(mockUri('/renamed.txt'), { recursive: false });
        try {
            provider.readFile(mockUri('/renamed.txt'));
            assert.fail("Should have thrown FileNotFound");
        } catch (e) {
            assert.ok(e.message.includes('FileNotFound'));
        }
        console.log("✅ delete works.");

        console.log("All tests passed! 🚀");
    } catch (err) {
        console.error("❌ Test failed:", err);
        process.exit(1);
    } finally {
        if (fs.existsSync(testZipPath)) fs.unlinkSync(testZipPath);
    }
}

runTests();

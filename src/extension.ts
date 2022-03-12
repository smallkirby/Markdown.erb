import * as vscode from 'vscode';
import * as fs from 'fs';
const erb = require('erb');

interface TargetErb {
	erb: vscode.Uri;
	watcher: vscode.FileSystemWatcher;
}

class MarkdownErb {
	targetErbs: TargetErb[];

	constructor() {
		this.targetErbs = [];
	}

	addTargets(files: vscode.Uri[]) {
		files.forEach(file => {
			if (this.targetErbs.findIndex(now => now.erb === file)) {
				const newWatcher = {
					erb: file,
					watcher: vscode.workspace.createFileSystemWatcher(file.path),
				};
				newWatcher.watcher.onDidDelete(uri => onTargetDeleted(uri));
				newWatcher.watcher.onDidChange(uri => onTargetChanged(uri));
				this.targetErbs.push(newWatcher);
			}
		});
	}
}

const merb = new MarkdownErb();

const compileErb = async (target: vscode.Uri): Promise<string | null> => {
	const content = fs.readFileSync(target.path).toString();
	try {
		return await erb({
			timeout: 1000,
			template: content,
		});
	} catch (e) {
		return null;
	}
};

const onTargetDeleted = (uri: vscode.Uri) => {
	// TODO
};

const onTargetChanged = async (uri: vscode.Uri) => {
	const compiledContent = await compileErb(uri);
	if (compiledContent === null) return;
	const targetFilePath = uri.path.replace('\.md\.erb', '\.md');
	fs.writeFileSync(targetFilePath, compiledContent);
};

export const activate = (context: vscode.ExtensionContext) => {
	vscode.window.showInformationMessage('Markdown.erb enabled.');
	let disposable = vscode.commands.registerCommand('markdown-erb.startWatching', () => {
		startWatching();
	});

	context.subscriptions.push(disposable);
};

const findTargetFiles = async () => {
	return vscode.workspace.findFiles("**/**.md.erb");
};

const prepareCorrespondingMd = async (target: vscode.Uri): Promise<boolean> => {
	const correspondingMdPath = target.path.replace('\.md\.erb', '\.md');
	if (fs.existsSync(correspondingMdPath)) {
		if (fs.lstatSync(correspondingMdPath).isFile()) {
			return true;
		} else {
			return false;
		}
	} else {
		return true;
	}
};

const startWatching = async () => {
	// check target files and corresponding MD files
	const targetFiles = await findTargetFiles();
	for (const file of targetFiles) {
		if (!await prepareCorrespondingMd(file)) {
			vscode.window.showErrorMessage(`Failed to create correspoinding Markdown file of "${file.path}".`);
			return;
		}
	}

	// start watching target files
	merb.addTargets(targetFiles);
};

export const deactivate = () => { };

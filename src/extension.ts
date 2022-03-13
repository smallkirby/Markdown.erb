import * as vscode from 'vscode';
import { fsWatcher, erbManager, rootPath, ErbFile } from './fswatcher';
import { MarkdownErbTreeProvider } from './tree';
const erb = require('erb');

const erbTreeProvider = new MarkdownErbTreeProvider(rootPath, erbManager);

export const activate = async (_: vscode.ExtensionContext) => {
  // init ErbManager
  await erbManager.init();

  // register tree view
  vscode.window.createTreeView('markdownErbTreeview', {
    treeDataProvider: erbTreeProvider,
  });

  // register commands
  vscode.commands.registerCommand('markdown-erb.watchFile', (node: ErbFile) => {
    erbManager.watchErb(node, erbTreeProvider);
  });
  vscode.commands.registerCommand('markdown-erb.unwatchFile', (node: ErbFile) => {
    erbManager.unwatchErb(node, erbTreeProvider);
  });

  vscode.window.showInformationMessage('Markdown.erb enabled.');
};

export const deactivate = () => { };

import * as vscode from 'vscode';
import { fsWatcher, erbManager, rootPath, ErbFile } from './fswatcher';
import { MarkdownErbTreeProvider } from './tree';

const erbTreeProvider = new MarkdownErbTreeProvider(rootPath, erbManager);

export const activate = async (context: vscode.ExtensionContext) => {
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

  // subscribe events
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((event) => {
      erbManager.onChangeTextDocument(event.document.uri);
    })
  );

  vscode.window.showInformationMessage('Markdown.erb enabled.');
};

export const deactivate = () => { };

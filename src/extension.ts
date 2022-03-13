import * as vscode from 'vscode';
import { fsWatcher, erbManager, rootPath, ErbFile } from './fswatcher';
import { MarkdownErbTreeProvider } from './tree';
import { erbCompletionProvider } from './completion';

const erbTreeProvider = new MarkdownErbTreeProvider(rootPath, erbManager);

export const activate = async (context: vscode.ExtensionContext) => {
  // init ErbManager
  await erbManager.init();

  // watch filesystem
  fsWatcher.onDidCreate((uri) => {
    if (uri.path.endsWith('.md.erb')) {
      erbManager.addErb([new ErbFile(uri, false, null)], erbTreeProvider);
    }
  });

  fsWatcher.onDidDelete((uri) => {
    if (uri.path.endsWith('.md.erb')) {
      erbManager.removeErb(uri, erbTreeProvider);
    }
  });

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
  context.subscriptions.push(erbCompletionProvider);

  vscode.window.showInformationMessage('Markdown.erb enabled.');
};

export const deactivate = () => { };

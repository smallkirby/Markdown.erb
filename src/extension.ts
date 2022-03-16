import * as vscode from 'vscode';
import { erbWatcher, refWatcher, erbManager, rootPath, ErbFile } from './fswatcher';
import { MarkdownErbTreeProvider } from './tree';
import { erbCompletionProvider } from './completion';
import { subscribeToDocumentChanges } from './diagnostic';
import { erbPreprocessor } from './preprocessor';
import { initConfigurationWatcher } from './configuration';

const erbTreeProvider = new MarkdownErbTreeProvider(rootPath, erbManager);

export const activate = async (context: vscode.ExtensionContext) => {
  // init ErbManager
  await erbManager.init();
  await erbPreprocessor.init();

  // watch configuration
  initConfigurationWatcher(erbPreprocessor);

  // watch filesystem
  erbWatcher.onDidCreate((uri) => {
    if (uri.path.endsWith('.md.erb')) {
      erbManager.addErb([new ErbFile(uri, false, null)], erbTreeProvider);
    }
  });

  erbWatcher.onDidDelete((uri) => {
    if (uri.path.endsWith('.md.erb')) {
      erbManager.removeErb(uri, erbTreeProvider);
    }
  });

  refWatcher.onDidCreate((uri) => {
    erbPreprocessor.onRefFileCreated(uri);
  });

  refWatcher.onDidDelete((uri) => {
    erbPreprocessor.onRefFileDeleted(uri);
  });

  refWatcher.onDidChange((uri) => {
    erbPreprocessor.onRefFileChanged(uri);
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
      erbManager.onChangeTextDocument(event.document.uri, erbPreprocessor);
    })
  );
  context.subscriptions.push(erbCompletionProvider);

  // register diagnostic provider
  const erbDiagnostic = vscode.languages.createDiagnosticCollection('mderb');
  context.subscriptions.push(erbDiagnostic);
  subscribeToDocumentChanges(context, erbDiagnostic);
  vscode.languages.registerHoverProvider('erb', {
    provideHover(document, position, token) {
      return erbPreprocessor.provideMderbHover(document, position, token);
    },
  });

  vscode.window.showInformationMessage('Markdown.erb enabled.');
};

export const deactivate = () => { };

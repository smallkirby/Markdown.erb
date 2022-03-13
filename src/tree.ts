import * as vscode from 'vscode';
import { ErbFile, ErbFileManager } from './fswatcher';

const WATCHED_PARENT = new ErbFile(null, true, null);
const UNWATCHED_PARENT = new ErbFile(null, false, null);

export class MarkdownErbTreeProvider implements vscode.TreeDataProvider<ErbFile> {
  constructor(private workspaceRoot: string | null, private erbmanager: ErbFileManager) {}

  private _onDidChangeTreeData: vscode.EventEmitter<ErbFile| undefined | null | void> = new vscode.EventEmitter<ErbFile| undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<ErbFile| undefined | null | void> = this._onDidChangeTreeData.event;

  getTreeItem(element: ErbFile): vscode.TreeItem {
    return element;
  }

  getChildren(element?: ErbFile): Thenable<ErbFile[]> {
    if (!this.workspaceRoot) {
      vscode.window.showInformationMessage('Workspace is empty.');
      return Promise.resolve([]);
    }

    if (element) {
      if (element === WATCHED_PARENT) {
        return Promise.resolve(this.erbmanager.allWatchedErb);
      } else if (element === UNWATCHED_PARENT) {
        return Promise.resolve(this.erbmanager.allUnwatchedErb);
      } else {
        // child doesn't have child
        return Promise.resolve([]);
      }
    } else {
      return Promise.resolve([
        WATCHED_PARENT,
        UNWATCHED_PARENT,
      ]);
    }
  }

  refresh() {
    this._onDidChangeTreeData.fire();
  }
}

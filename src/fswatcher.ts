/*
  This file watches file system and manages existing .md.erb files.
*/

import * as vscode from 'vscode';
import * as path from 'path';
import { MarkdownErbTreeProvider } from './tree';

export const rootPath =
  vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0
    ? vscode.workspace.workspaceFolders[0].uri.fsPath
    : null;


type ErbFileContext = 'title' | 'erb-watched' | 'erb-unwatched';

export class ErbFile extends vscode.TreeItem {
  private _watched: boolean;
  public get watched() { return this._watched; } ;
  set _contextValue(cx: ErbFileContext) {
    this.contextValue = cx;
  }
  uri: vscode.Uri | null; // null uri means special file for this extension. it mustn't be added to ErbFileManager.
  mdUri: vscode.Uri | null;

  constructor(
    uri: vscode.Uri | null,
    watched: boolean,
    mdUri: vscode.Uri | null
  ) {
    if (uri === null) {
      super(watched ? 'WATCHED' : 'UNWATCHED', vscode.TreeItemCollapsibleState.Collapsed);
      this._watched = watched;
      this.uri = uri;
      this.mdUri = mdUri;
      this._contextValue = 'title';
    } else {
      const parsedPath = path.parse(uri.path);
      super(parsedPath.base, vscode.TreeItemCollapsibleState.None);
      this.description = uri.path.substring((rootPath !== null? rootPath : ' ').length);
      this.tooltip = uri.path;
      this._watched = watched;
      this.uri = uri;
      this.mdUri = mdUri;
      this._contextValue = 'erb-unwatched';
    }
  }

  watch(treeProvider: MarkdownErbTreeProvider) {
    this._watched = true;
    this._contextValue = 'erb-watched';
    treeProvider.refresh();
  }

  unwatch(treeProvider: MarkdownErbTreeProvider) {
    this._watched = false;
    this._contextValue = 'erb-unwatched';
    treeProvider.refresh();
  }
}

export class ErbFileManager {
  private erbFiles: ErbFile[];
  get allWatchedErb(): ErbFile[] {
    if (!this.inited) this.raiseUninitedError();
    return this.erbFiles.filter(erb => erb.watched);
  }
  get allUnwatchedErb(): ErbFile[] {
    if (!this.inited) this.raiseUninitedError();
    return this.erbFiles.filter(erb => !erb.watched);
  }
  private inited: boolean;

  constructor() {
    this.erbFiles = [];
    this.inited = false;
  }

  async init() {
    this.erbFiles = await getAllErb();
    this.inited = true;
  }

  addErb(erbs: ErbFile[]) {
    if (erbs.filter(erb => erb.uri === null).length !== 0)
      throw new ErbFileManagerInvalidFileException('File with url null is passed to ErbFileManager.');
    if (!this.inited) this.raiseUninitedError();
    this.erbFiles.concat(erbs);
    console.debug(`Added ${erbs.length} erb files.`);
  }

  watchErb(erb: ErbFile, treeProvider: MarkdownErbTreeProvider) {
    const target = this.erbFiles.find((cand) => cand.uri === erb.uri);
    if (target === undefined) {
      vscode.window.showErrorMessage(`Failed to find file: ${erb.uri!!.path}`);
      return;
    }
    target.watch(treeProvider);
  }

  unwatchErb(erb: ErbFile, treeProvider: MarkdownErbTreeProvider) {
    const target = this.erbFiles.find((cand) => cand.uri === erb.uri);
    if (target === undefined) {
      vscode.window.showErrorMessage(`Failed to find file: ${erb.uri!!.path}`);
      return;
    }
    target.unwatch(treeProvider);
  }

  private raiseUninitedError() {
    throw new ErbFileManagerUninitedException('ErbFileManager is not inited.');
  }
}

class ErbFileManagerUninitedException extends Error {
  constructor(msg: string) {
    super(msg);
  }
}

class ErbFileManagerInvalidFileException extends Error {
  constructor(msg: string) {
    super(msg);
  }
}

const getAllErb = async (): Promise<ErbFile[]> => {
  const targetFiles = await vscode.workspace.findFiles('**/*.md.erb');
  return targetFiles.map((uri) => {
    return new ErbFile(uri, false, null);
  });
};

export const fsWatcher = vscode.workspace.createFileSystemWatcher('**/*.md.erb');
export const erbManager = new ErbFileManager();

fsWatcher.onDidCreate((uri) => {
  erbManager.addErb([new ErbFile(uri, false, null)]);
});

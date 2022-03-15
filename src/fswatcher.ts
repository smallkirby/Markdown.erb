/*
  This file watches file system and manages existing .md.erb files.
*/

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
const erb = require('erb');
import { MarkdownErbTreeProvider } from './tree';
import { ErbmdPreprocessor } from './preprocessor';

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
  refpath: vscode.Uri | null;
  mdPath: string | null;

  constructor(
    uri: vscode.Uri | null,
    watched: boolean,
    mdUri: string | null
  ) {
    if (uri === null) {
      super(watched ? 'WATCHED' : 'UNWATCHED', vscode.TreeItemCollapsibleState.Collapsed);
      this._watched = watched;
      this.refpath = null;
      this.uri = uri;
      this.mdPath = mdUri;
      this._contextValue = 'title';
    } else {
      const parsedPath = path.parse(uri.path);
      super(parsedPath.base, vscode.TreeItemCollapsibleState.None);
      this.description = uri.path.substring((rootPath !== null? rootPath : ' ').length);
      this.tooltip = uri.path;
      this.refpath = null;
      this._watched = watched;
      this.uri = uri;
      this.mdPath = mdUri;
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

  private async doCompile(content: string): Promise<string | null> {
    try {
      return await erb({
        timeout: 500,
        template: content,
      });
    } catch (e) {
      return null;
    }
  }

  private writeMd(content: string) {
    if (this.mdPath === null) {
      this.mdPath = this.uri!!.path.replace('.md.erb', '.md');
    }
    fs.writeFileSync(this.mdPath, content);
  }

  async compileWrite(content: string) {
    const compiledMd = await this.doCompile(content);
    if (compiledMd === null) return;
    this.writeMd(compiledMd);
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

  addErb(erbs: ErbFile[], treeProvider: MarkdownErbTreeProvider) {
    if (erbs.filter(erb => erb.uri === null).length !== 0)
      throw new ErbFileManagerInvalidFileException('File with url null is passed to ErbFileManager.');
    if (!this.inited) this.raiseUninitedError();
    this.erbFiles = this.erbFiles.concat(erbs);
    console.debug(`Added ${erbs.length} erb files.`);
    treeProvider.refresh();
  }

  removeErb(uri: vscode.Uri, treeProvider: MarkdownErbTreeProvider) {
    const target = this.erbFiles.findIndex(erb => erb.uri!!.path === uri.path);
    if (target === -1) return;
    this.erbFiles.splice(target, 1);
    treeProvider.refresh();
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

  onChangeTextDocument(uri: vscode.Uri, preprocessor: ErbmdPreprocessor) {
    const document = vscode.window.activeTextEditor?.document;
    if (document === undefined) return;
    const target = this.erbFiles.find(erb => erb.uri!!.path === uri.path);
    if (target === undefined || !target.watched) return;

    const preprocessedContent = preprocessor.preprocess(document.getText(), target);

    target.compileWrite(preprocessedContent);
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

export const erbWatcher = vscode.workspace.createFileSystemWatcher('**/*.md.erb');
export const refWatcher = vscode.workspace.createFileSystemWatcher('**/*.mderb.json');
export const erbManager = new ErbFileManager();


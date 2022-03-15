import { readFileSync } from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { ErbFile } from './fswatcher';

const REFS_PLACEHOLDER = '$INCLUDEREFS$';

export interface RefEntry {
  text: string
  ref: string
  alias: string
}

const refent2md = (ref: RefEntry, index: number): string => {
  return `${index}. [${ref.text}](${ref.ref})<span id="${ref.alias}"></span>`;
};

const refs2md = (refs: RefEntry[]): string => {
  let reflines = [];
  for (const [ix, ref] of refs.entries()) {
    reflines.push(refent2md(ref, ix + 1));
  }
  return reflines.join('\n');
};

export class RefFile {
  uri: vscode.Uri;
  refs: RefEntry[];
  valid: boolean;

  constructor(
    uri: vscode.Uri,
  ) {
    this.uri = uri;
    this.refs = [];
    this.valid = true;
  }

  // @return: error message. empty if parse succeeds.
  parse(): string {
    this.refs = [];
    let errMsg = '';
    try {
      const content = readFileSync(this.uri.path).toString();
      const refs: RefEntry[] = JSON.parse(content);
      this.valid = true;
      this.refs = refs;
    } catch (e: any) {
      this.valid = false;
      errMsg = e.toString();
    }
    return errMsg;
  }
}

export class ErbmdPreprocessor {

  private refFiles: RefFile[];

  constructor() {
    this.refFiles = [];
  }

  async init() {
    this.refFiles = await getAllRefs();
    this.refFiles.forEach((ref) => {
      const err = ref.parse();
      if (err.length !== 0) {
        vscode.window.showErrorMessage(`Failed to parse ref file: ${err}`);
      }
    });
  }

  getCorrespondingRefFile(erb: ErbFile): RefFile | null {
    const target = this.refFiles.find((ref) => path.parse(ref.uri.path).dir === path.parse(erb.uri!!.path).dir);
    if (target === undefined) return null;
    else return target;
  }

  onRefFileChanged(uri: vscode.Uri) {
    const target = this.refFiles.find((ref) => ref.uri.path === uri.path);
    if (target === undefined) return;
    const errMsg = target.parse();
    if (errMsg.length !== 0) {
      vscode.window.showErrorMessage(`Failed to parse ref file: ${errMsg}`);
    }
  }

  onRefFileDeleted(uri: vscode.Uri) {
    const target = this.refFiles.findIndex((ref) => ref.uri.path === uri.path);
    if (target === -1) return;
    this.refFiles.splice(target, 1);
  }

  onRefFileCreated(uri: vscode.Uri) {
    const newRefFile = new RefFile(uri);
    this.refFiles.push(newRefFile);
    // here, don't parse it because it is empty. //
  }

  preprocess(content: string, erb: ErbFile): string {
    const refFile = this.getCorrespondingRefFile(erb);
    if (refFile === null) return content;
    if (!refFile.valid) return content;

    // replace PLACEHOLDER
    let newContent = content.replace(REFS_PLACEHOLDER, refs2md(refFile.refs));

    // replace [&]
    for (const [ix, ref] of refFile.refs.entries()) {
      newContent = newContent.replace(`[&${ref.alias}]`, `<a href="#${ref.alias}">(${ix+1}).</a>`);
    }

    return newContent;
  }

  findNickStartsWith(key: string, uri: vscode.Uri): string[] {
    const targetRef = this.refFiles.find((ref) => path.parse(ref.uri.path).dir === path.parse(uri!!.path).dir);
    if (targetRef === undefined) return [];
    return targetRef.refs.filter((ent) => ent.alias.startsWith(key)).map((ent) => ent.alias);
  }


  provideMderbHover(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): vscode.ProviderResult<vscode.Hover> {
    const targetRefFile = this.refFiles.find((ref) => path.parse(ref.uri.path).dir === path.parse(document.uri.path).dir);
    if (targetRefFile === undefined || !targetRefFile.valid) return { contents: [] };

    const line = document.lineAt(position).text;
    const preParts = line.substring(0, position.character).split('[&');
    const postParts = line.substring(position.character).split(']');
    if (preParts.length === 0 || preParts.length === 0) {
      return { contents: [] };
    }
    const keyword = preParts[preParts.length - 1] + postParts[0];
    const targetRef = targetRefFile.refs.find((ref) => ref.alias === keyword);
    if (targetRef === undefined) return { contents: [] };
    return {
      contents: [`${targetRef.text}: ${targetRef.ref}`],
    };
  };
}

const getAllRefs = async (): Promise<RefFile[]> => {
  const targetFiles = await vscode.workspace.findFiles('**/refs.mderb.json');
  return targetFiles.map((uri) => {
    return new RefFile(uri);
  });
};

export const erbPreprocessor = new ErbmdPreprocessor();

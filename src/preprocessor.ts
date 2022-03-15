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
  return `${index}. [${ref.text}](${ref.ref})`;
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
    try {
      const content = readFileSync(this.uri.path).toString();
      const refs: RefEntry[] = JSON.parse(content);
      this.valid = true;
      this.refs = refs;
      return '';
    } catch (e: any) {
      this.valid = false;
      return e.toString();
    }
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
    const target = this.refFiles.find((ref) => ref.uri === uri);
    if (target === undefined) return;
    target.parse();
  }

  onRefFileDeleted(uri: vscode.Uri) {
    const target = this.refFiles.findIndex((ref) => ref.uri === uri);
    if (target === -1) return;
    this.refFiles.splice(target, 1);
  }

  onRefFileCreated(uri: vscode.Uri) {
    const newRefFile = new RefFile(uri);
    this.refFiles.push(newRefFile);
    // here, don't parse it because it is empty. //
  }

  preprocess(content: string, erb: ErbFile): string {
    // replace PLACEHOLDER
    const refFile = this.getCorrespondingRefFile(erb);
    if (refFile === null) return content;

    let newContent = content.replace(REFS_PLACEHOLDER, refs2md(refFile.refs));
    return newContent;
  }
}

const getAllRefs = async (): Promise<RefFile[]> => {
  const targetFiles = await vscode.workspace.findFiles('**/refs.mderb.json');
  return targetFiles.map((uri) => {
    return new RefFile(uri);
  });
};

export const erbPreprocessor = new ErbmdPreprocessor();

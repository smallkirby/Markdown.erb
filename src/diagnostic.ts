import * as vscode from 'vscode';
import { spawnSync } from 'child_process';

const checkErbExists = (): boolean => {
  const whichResult = spawnSync('which', ['erb']);
  return whichResult.status === 0;
};

// compile erb file using native erb command.
// @return: empty string if compile succeeds.
// @return: no-empty string if compile fails, which contains error message from erb command.
// @return: null if erb native command not exist.
const compileErb = (prog: string): string | null => {
  if (!checkErbExists()) return null;
  const result = spawnSync('erb', {
    input: prog,
  });
  if (result.status === 0) {
    return '';
  } else {
    return result.stderr.toString();
  }
};

// example error message from erb here:
/*
./DOG.md.erb:5:in `<main>': undefined local variable or method `hoge' for main:Object (NameError)
        from /usr/lib/ruby/3.0.0/erb.rb:905:in `eval'
        from /usr/lib/ruby/3.0.0/erb.rb:905:in `result'
        from /usr/lib/ruby/3.0.0/erb.rb:890:in `run'
        from /usr/lib/ruby/gems/3.0.0/gems/erb-2.2.0/libexec/erb:154:in `run'
        from /usr/lib/ruby/gems/3.0.0/gems/erb-2.2.0/libexec/erb:174:in `<top (required)>'
        from /usr/bin/erb:23:in `load'
        from /usr/bin/erb:23:in `<main>'
*/
const analyzeErbError = (emsg: string, doc: vscode.TextDocument): vscode.Diagnostic | null => {
  const lines = emsg.split('\n');
  if (lines.length < 1) return null;
  const mainline = lines[0];

  const errorLocation = mainline.split(':in')[0];
  const lineNumber = Number(errorLocation.split(':')[1]) - 1;
  const range = new vscode.Range(lineNumber, 0, lineNumber, doc.lineAt(lineNumber).text.length);

  const diagnostic = new vscode.Diagnostic(range, 'ERROR', vscode.DiagnosticSeverity.Error);
  return diagnostic;
};

export const refreshDiagnostics = (doc: vscode.TextDocument, emojiDiagnostics: vscode.DiagnosticCollection): void => {
  const prog = doc.getText();
  const error = compileErb(prog);
  if (error === null || error === '') {
    emojiDiagnostics.set(doc.uri, []);
    return;
  }

  const diagnostic = analyzeErbError(error, doc);
  if (diagnostic !== null) {
    emojiDiagnostics.set(doc.uri, [diagnostic]);
  }
};

export const subscribeToDocumentChanges = (context: vscode.ExtensionContext, erbDiagnostic: vscode.DiagnosticCollection): void => {
  if (vscode.window.activeTextEditor) {
    refreshDiagnostics(vscode.window.activeTextEditor.document, erbDiagnostic);
  }
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(editor => {
      if (editor) {
        refreshDiagnostics(editor.document, erbDiagnostic);
      }
    })
  );

  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument(e => refreshDiagnostics(e.document, erbDiagnostic))
  );

  context.subscriptions.push(
    vscode.workspace.onDidCloseTextDocument(doc => erbDiagnostic.delete(doc.uri))
  );

};
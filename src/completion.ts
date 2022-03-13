import * as vscode from 'vscode';

export const erbCompletionProvider = vscode.languages.registerCompletionItemProvider(
  'erb',
  {
    provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
      // '<% variable %>' completion
      const openingCompletion = new vscode.CompletionItem('<%=', vscode.CompletionItemKind.Snippet);
      openingCompletion.insertText = new vscode.SnippetString('<%= ${1} %> ${2}');
      openingCompletion.command = {
        command: 'editor.action.triggerSuggest',
        title: 'Re-trigger completion',
      };
      // '<% variable %>' completion in case '<>' is auto completed by other party.
      const openingCompletionNoBracket = new vscode.CompletionItem('<%=', vscode.CompletionItemKind.Snippet);
      openingCompletionNoBracket.insertText = new vscode.SnippetString('%= ${1} %');
      openingCompletionNoBracket.command = {
        command: 'editor.action.triggerSuggest',
        title: 'Re-trigger completion',
      };

      // <%= ruby code %> completion
      const rcodeCompletion = new vscode.CompletionItem('<%=', vscode.CompletionItemKind.Snippet);
      rcodeCompletion.insertText = new vscode.SnippetString('<%\n${1}\n%>\n');
      // '<% ruby code %>' completion in case '<>' is auto completed by other party.
      const rcodeCompletionNoBracket = new vscode.CompletionItem('<%', vscode.CompletionItemKind.Snippet);
      rcodeCompletionNoBracket.insertText = new vscode.SnippetString('%\n${1}\n%');

      if (document.lineAt(position).text.substr(0, position.character).endsWith('<')) {
        return [
          openingCompletionNoBracket,
          rcodeCompletionNoBracket,
        ];
      } else {
        return [
          openingCompletion,
          rcodeCompletion,
        ];
      }
    },
  },
  '<'
);

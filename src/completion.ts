import * as vscode from 'vscode';
import { erbPreprocessor } from './preprocessor';

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
      // '<%= ruby code %>' completion in case '<>' is auto completed by other party.
      const rcodeCompletionNoBracket = new vscode.CompletionItem('<%', vscode.CompletionItemKind.Snippet);
      rcodeCompletionNoBracket.insertText = new vscode.SnippetString('%\n${1}\n%');

      // $INCLUDEREFS$ completion
      const includerefsCompletion = new vscode.CompletionItem('includerefs', vscode.CompletionItemKind.Snippet);
      includerefsCompletion.insertText = '$INCLUDEREFS$';

      // reference completion
      if (document.lineAt(position).text.includes('[&')) {
        const substr = document.lineAt(position).text.substring(0, position.character);
        const parts = substr.split('[&');
        if (parts.length !== 0) {
          const key = parts[parts.length - 1];
          if (!key.includes(' ') && !key.includes(']')) {
            const candNicks = erbPreprocessor.findNickStartsWith(key, document.uri);
            return candNicks.map((candNick) => {
              const newComp = new vscode.CompletionItem(candNick, vscode.CompletionItemKind.Keyword);
              newComp.insertText = candNick;
              return newComp;
            });
          }
        }
      }

      if (document.lineAt(position).text.substr(0, position.character).endsWith('<')) {
        return [
          openingCompletionNoBracket,
          rcodeCompletionNoBracket,
          includerefsCompletion,
        ];
      } else {
        return [
          openingCompletion,
          rcodeCompletion,
          includerefsCompletion,
        ];
      }
    },
  },
  '<'
);

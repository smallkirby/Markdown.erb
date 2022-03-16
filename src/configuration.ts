import * as vscode from 'vscode';
import { ErbmdPreprocessor } from './preprocessor';

interface ConfigChangedHandler {
  title: string,
  handler: (newVal: any) => void,
}

export const initConfigurationWatcher = (preprocessor: ErbmdPreprocessor) => {
  const configHandlers: ConfigChangedHandler[] = [
    {
      title: 'referenceRepresentation',
      handler: (newVal: any) => {
        preprocessor.onReferenceRepresentationChanged(newVal);
      },
    },
  ];

  vscode.workspace.onDidChangeConfiguration((event) => {
    if (event.affectsConfiguration('markdownerb')) {
      configHandlers.forEach((handler) => {
        if (event.affectsConfiguration('markdownerb.' + handler.title)) {
          const newVal = vscode.workspace.getConfiguration('markdownerb').get(handler.title);
          if (newVal !== null && newVal !== undefined) handler.handler(newVal);
        }
      });
    }
  });
};

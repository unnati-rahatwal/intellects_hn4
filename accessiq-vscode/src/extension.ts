import * as vscode from 'vscode';
import * as fs from 'fs';

interface ViolationQuickPickItem extends vscode.QuickPickItem {
  violation: any;
}

export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand('accessiq.importReport', async (contextUri?: vscode.Uri) => {
    
    // 1. Determine Target Code File
    let codeFileUri = contextUri;
    
    // If command wasn't triggered via context menu (e.g. Command Palette), fallback to active editor
    if (!codeFileUri) {
      if (vscode.window.activeTextEditor) {
        codeFileUri = vscode.window.activeTextEditor.document.uri;
      } else {
        vscode.window.showErrorMessage('No file targeted. Please Right-Click an open file or select one in the Explorer first.');
        return;
      }
    }

    // 2. Ask user to select the JSON report file
    const fileUri = await vscode.window.showOpenDialog({
      canSelectMany: false,
      openLabel: 'Import AccessIQ Report',
      filters: {
        'JSON Reports': ['json']
      }
    });

    if (!fileUri || fileUri.length === 0) {
      return;
    }

    try {
      // Read JSON
      const content = fs.readFileSync(fileUri[0].fsPath, 'utf8');
      const report = JSON.parse(content);

      if (!report.violations || !Array.isArray(report.violations)) {
        vscode.window.showErrorMessage('Invalid AccessIQ report format. Missing violations array.');
        return;
      }

      // Filter fixable
      const fixableViolations = report.violations.filter(
        (v: any) => v.aiRemediation && v.aiRemediation.status === 'GENERATED'
      );

      if (fixableViolations.length === 0) {
        vscode.window.showInformationMessage('No AI remediations available in this report.');
        return;
      }

      // Show quick pick
      const items: ViolationQuickPickItem[] = fixableViolations.map((v: any) => ({
        label: `$(wrench) Fix: ${v.ruleId}`,
        description: `Impact: ${v.impact}`,
        detail: v.description,
        violation: v
      }));

      const selected = await vscode.window.showQuickPick<ViolationQuickPickItem>(items, {
        placeHolder: `Select violations to auto-fix (${fixableViolations.length} available)`,
        matchOnDescription: true,
        matchOnDetail: true,
        canPickMany: true
      });

      if (!selected || selected.length === 0) {
        return;
      }

      const violationsToFix = selected.map(s => s.violation);
      await applyFixes(violationsToFix, codeFileUri);

    } catch (err) {
      vscode.window.showErrorMessage(`Failed to process report: ${err instanceof Error ? err.message : String(err)}`);
    }
  });

  context.subscriptions.push(disposable);
}

async function applyFixes(violations: any[], fileUri: vscode.Uri) {
  try {
    const document = await vscode.workspace.openTextDocument(fileUri);
    let text = document.getText();
    const edit = new vscode.WorkspaceEdit();
    
    let appliedCount = 0;
    const failedViolations: any[] = [];

    // Process each violation one by one and accumulate edits
    for (const violation of violations) {
      const snippet = violation.htmlSnippet;
      const fix = violation.aiRemediation?.remediatedCode;

      if (!snippet || !fix) {
        failedViolations.push(violation);
        continue;
      }

      const trimSnippet = snippet.trim();
      
      // Create a flexible regex that ignores differences in whitespace/newlines
      const parts = trimSnippet.split(/\s+/);
      const escapedParts = parts.map((p: string) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
      const pattern = escapedParts.join('\\s+');
      const regex = new RegExp(pattern, 'm');
      
      const match = text.match(regex);
      
      if (match && match.index !== undefined) {
        const matchLength = match[0].length;
        const startPos = document.positionAt(match.index);
        const endPos = document.positionAt(match.index + matchLength);
        const range = new vscode.Range(startPos, endPos);
        
        edit.replace(fileUri, range, fix);
        appliedCount++;
      } else {
        failedViolations.push(violation);
      }
    }

    if (appliedCount > 0) {
      const success = await vscode.workspace.applyEdit(edit);
      if (success) {
        vscode.window.showInformationMessage(`Successfully applied ${appliedCount} fixes in ${vscode.workspace.asRelativePath(fileUri)}`);
      } else {
        vscode.window.showErrorMessage(`Failed to write edits to the editor buffer.`);
      }
    }
    
    // If any failed to locate, warn the user
    if (failedViolations.length > 0) {
      vscode.window.showWarningMessage(
        `${failedViolations.length} violations could not be pinpointed reliably. You may need to patch them manually.`
      );
    }
    
  } catch (e) {
    vscode.window.showErrorMessage(`Error reading the target file: ${e instanceof Error ? e.message : String(e)}`);
  }
}

export function deactivate() {}

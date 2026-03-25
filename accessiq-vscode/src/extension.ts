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
      
      const match = findBestStringMatch(text, trimSnippet);
      
      if (match) {
        const startPos = document.positionAt(match.index);
        const endPos = document.positionAt(match.index + match.length);
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

// 3-Tier Resilient HTML Snippet Locator for Compiled/Rehydrated Source Code
function findBestStringMatch(text: string, snippet: string): { index: number, length: number } | null {
  // Tier 1: Flexible Whitespace & Wildcard Match
  let escapedParts = snippet.split(/\s+/).map(p => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  let pattern = escapedParts.join('\\s+').replace(/\\\.\\\.\\\./g, '[\\s\\S]*?');
  
  try {
    const regex = new RegExp(pattern, 'm');
    const exactMatch = text.match(regex);
    if (exactMatch && exactMatch.index !== undefined) {
      return { index: exactMatch.index, length: exactMatch[0].length };
    }
  } catch(e) {}

  // Tier 2: Head & Tail Match (Bypasses extreme inner truncations from Axe-core)
  const cleanSnippet = snippet.replace(/\.\.\.$/, '').trim();
  if (cleanSnippet.length > 25) {
    try {
      const head = cleanSnippet.substring(0, 15).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
      const tail = cleanSnippet.substring(cleanSnippet.length - 15).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
      const htPattern = new RegExp(head + '[\\s\\S]*?' + tail, 'm');
      const htMatch = text.match(htPattern);
      if (htMatch && htMatch.index !== undefined) {
        return { index: htMatch.index, length: htMatch[0].length };
      }
    } catch(e) {}
  }

  // Tier 3: Attribute Fingerprinting (Bypasses attribute reordering and quote swapping)
  const tagMatch = snippet.match(/^<([a-z0-9\-]+)/i);
  if (!tagMatch) return null;
  const tagName = tagMatch[1];
  
  const keys: string[] = [];
  const attrRegex = /="([^"]+)"/g; // extract exact attribute values as unique fingerprints
  let m;
  while ((m = attrRegex.exec(snippet)) !== null) {
    if (m[1].length > 3) keys.push(m[1]); 
  }

  if (keys.length === 0) return null; // No unique fingerprints to rely on safely
  
  const tagSearchRegex = new RegExp(`<${tagName}\\b[^>]*>`, 'gi');
  let bestScore = 0;
  let bestMatch = null;
  
  let sourceMatch;
  while ((sourceMatch = tagSearchRegex.exec(text)) !== null) {
    const tagSource = sourceMatch[0];
    let score = 0;
    for (const key of keys) {
      if (tagSource.includes(key)) score++;
    }
    
    if (score > bestScore) {
      bestScore = score;
      bestMatch = { index: sourceMatch.index, length: tagSource.length };
    }
  }
  
  // Only return if we met a reasonable confidence threshold
  if (bestMatch && bestScore >= Math.min(2, keys.length)) {
    return bestMatch;
  }
  
  return null;
}

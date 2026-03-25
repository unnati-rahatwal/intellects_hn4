"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = require("vscode");
const fs = require("fs");
function activate(context) {
    const disposable = vscode.commands.registerCommand('accessiq.importReport', async () => {
        // 1. Ask user to select a JSON file
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
            const fixableViolations = report.violations.filter((v) => v.aiRemediation && v.aiRemediation.status === 'GENERATED');
            if (fixableViolations.length === 0) {
                vscode.window.showInformationMessage('No AI remediations available in this report.');
                return;
            }
            // Show quick pick
            const items = fixableViolations.map((v) => ({
                label: `$(wrench) Fix: ${v.ruleId}`,
                description: `Impact: ${v.impact}`,
                detail: v.description,
                violation: v
            }));
            const selected = await vscode.window.showQuickPick(items, {
                placeHolder: `Select a violation to auto-fix (${fixableViolations.length} available)`,
                matchOnDescription: true,
                matchOnDetail: true
            });
            if (!selected) {
                return;
            }
            const v = selected.violation;
            await applyFix(v);
        }
        catch (err) {
            vscode.window.showErrorMessage(`Failed to process report: ${err instanceof Error ? err.message : String(err)}`);
        }
    });
    context.subscriptions.push(disposable);
}
async function applyFix(violation) {
    const snippet = violation.htmlSnippet;
    const fix = violation.aiRemediation.remediatedCode;
    if (!snippet || !fix) {
        vscode.window.showErrorMessage('Missing snippet or remediated code for this violation.');
        return;
    }
    // Find files in workspace
    const files = await vscode.workspace.findFiles('**/*.{js,jsx,ts,tsx,html}', '**/node_modules/**');
    let found = false;
    for (const file of files) {
        try {
            const document = await vscode.workspace.openTextDocument(file);
            const text = document.getText();
            const trimSnippet = snippet.trim();
            // Try to find the exact substring
            const index = text.indexOf(trimSnippet);
            if (index !== -1) {
                const startPos = document.positionAt(index);
                const endPos = document.positionAt(index + trimSnippet.length);
                const range = new vscode.Range(startPos, endPos);
                const edit = new vscode.WorkspaceEdit();
                edit.replace(file, range, fix);
                const success = await vscode.workspace.applyEdit(edit);
                if (success) {
                    vscode.window.showInformationMessage(`Successfully applied fix for ${violation.ruleId} in ${vscode.workspace.asRelativePath(file)}`);
                }
                else {
                    vscode.window.showErrorMessage(`Failed to apply workspace edit for ${file.fsPath}`);
                }
                found = true;
                break;
            }
        }
        catch (e) {
            // ignore read errors
        }
    }
    if (!found) {
        vscode.window.showWarningMessage(`Could not automatically locate the exact code snippet in your workspace. You may need to apply the fix manually.`);
        // Copy fix to clipboard
        vscode.env.clipboard.writeText(fix);
        vscode.window.showInformationMessage('The remediated code has been copied to your clipboard.', 'View AI Explanation').then(selection => {
            if (selection === 'View AI Explanation') {
                vscode.window.showInformationMessage(violation.aiRemediation.explanation, { modal: true });
            }
        });
    }
}
function deactivate() { }
//# sourceMappingURL=extension.js.map
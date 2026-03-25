"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = require("vscode");
const fs = require("fs");
function activate(context) {
    const disposable = vscode.commands.registerCommand('accessiq.importReport', async (contextUri) => {
        // 1. Determine Target Code File
        let codeFileUri = contextUri;
        // If command wasn't triggered via context menu (e.g. Command Palette), fallback to active editor
        if (!codeFileUri) {
            if (vscode.window.activeTextEditor) {
                codeFileUri = vscode.window.activeTextEditor.document.uri;
            }
            else {
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
            await applyFix(v, codeFileUri);
        }
        catch (err) {
            vscode.window.showErrorMessage(`Failed to process report: ${err instanceof Error ? err.message : String(err)}`);
        }
    });
    context.subscriptions.push(disposable);
}
async function applyFix(violation, fileUri) {
    const snippet = violation.htmlSnippet;
    const fix = violation.aiRemediation.remediatedCode;
    if (!snippet || !fix) {
        vscode.window.showErrorMessage('Missing snippet or remediated code for this violation.');
        return;
    }
    try {
        const document = await vscode.workspace.openTextDocument(fileUri);
        const text = document.getText();
        const trimSnippet = snippet.trim();
        // Create a flexible regex that ignores differences in whitespace/newlines
        const parts = trimSnippet.split(/\s+/);
        const escapedParts = parts.map(p => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
        const pattern = escapedParts.join('\\s+');
        const regex = new RegExp(pattern, 'm');
        // Try to find the substring using flexible matching
        const match = text.match(regex);
        if (match && match.index !== undefined) {
            const matchLength = match[0].length;
            const startPos = document.positionAt(match.index);
            const endPos = document.positionAt(match.index + matchLength);
            const range = new vscode.Range(startPos, endPos);
            const edit = new vscode.WorkspaceEdit();
            edit.replace(fileUri, range, fix);
            const success = await vscode.workspace.applyEdit(edit);
            if (success) {
                vscode.window.showInformationMessage(`Successfully applied fix for ${violation.ruleId} in ${vscode.workspace.asRelativePath(fileUri)}`);
                return;
            }
        }
        // If we reach here, the snippet wasn't found in the explicitly targeted file
        vscode.window.showWarningMessage(`Could not automatically locate the exact code snippet in the selected file. The file may have changed or the snippet might be broken across multiple lines.`);
        // Copy fix to clipboard
        vscode.env.clipboard.writeText(fix);
        vscode.window.showInformationMessage('The remediated code has been copied to your clipboard.', 'View AI Explanation').then(selection => {
            if (selection === 'View AI Explanation') {
                vscode.window.showInformationMessage(violation.aiRemediation.explanation, { modal: true });
            }
        });
    }
    catch (e) {
        vscode.window.showErrorMessage(`Error reading the target file: ${e instanceof Error ? e.message : String(e)}`);
    }
}
function deactivate() { }
//# sourceMappingURL=extension.js.map
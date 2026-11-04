const vscode = require("vscode");
const { applyToTree } = require("./src/patch");

function report(result) {
  if (result.changed) {
    return vscode.window
      .showInformationMessage("Hebrew RTL is ready. Reload Cursor to use it.", "Reload Window")
      .then((choice) => {
        if (choice === "Reload Window") {
          return vscode.commands.executeCommand("workbench.action.reloadWindow");
        }
      });
  }
  if (!result.supported) {
    return vscode.window.showWarningMessage(
      result.reason || "Hebrew RTL does not support this Cursor version yet."
    );
  }
  return vscode.window.showInformationMessage("Hebrew RTL is already active.");
}

function activate(context) {
  const root = vscode.env.appRoot;
  context.subscriptions.push(
    vscode.commands.registerCommand("hebrewRtl.apply", () => report(applyToTree(root)))
  );
  const result = applyToTree(root);
  if (!result.changed) return;
  report(result);
}

function deactivate() {}

module.exports = { activate, deactivate };

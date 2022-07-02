
const languages = {
    createDiagnosticCollection: jest.fn()
};

const StatusBarAlignment = {};

const window = {
    createStatusBarItem: jest.fn(() => ({
        show: jest.fn()
    })),
    showErrorMessage: jest.fn(),
    showWarningMessage: jest.fn(),
    showInformationMessage: jest.fn(),
    showSaveDialog: jest.fn(),
    createTextEditorDecorationType: jest.fn(),
    showQuickPick: jest.fn()
};

const workspace = {
    getConfiguration: jest.fn(),
    workspaceFolders: [],
    onDidSaveTextDocument: jest.fn()
};

const OverviewRulerLane = {
    Left: null
};

const Uri = {
    file: f => f,
    parse: jest.fn()
};
const Range = jest.fn();
const Diagnostic = jest.fn();
const DiagnosticSeverity = { Error: 0, Warning: 1, Information: 2, Hint: 3 };

const debug = {
    onDidTerminateDebugSession: jest.fn(),
    startDebugging: jest.fn()
};

const commands = {
    executeCommand: jest.fn()
};

module.exports = {
    languages,
    StatusBarAlignment,
    window,
    workspace,
    OverviewRulerLane,
    Uri,
    Range,
    Diagnostic,
    DiagnosticSeverity,
    debug,
    commands
};